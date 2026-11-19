import {
  importSmsBatch,
  importSmsMessage,
  sortCandidatePayloadsOldestFirst,
  toImportPayload,
} from "../smsImportClient";

jest.mock("expo-crypto", () => {
  const crypto = jest.requireActual<typeof import("crypto")>("crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    digestStringAsync: jest.fn(async (_algorithm: string, data: string) =>
      crypto.createHash("sha256").update(data, "utf8").digest("hex"),
    ),
  };
});

jest.mock("@/utils/auth", () => ({
  getStoredAuthData: jest.fn(async () => ({
    accessToken: "test-token",
    refreshToken: "refresh",
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    user: { id: "user-1", email: "test@example.com", lastLogin: new Date().toISOString() },
  })),
  refreshStoredSession: jest.fn(),
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function mockResponse(options: {
  ok: boolean;
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}) {
  const headers = options.headers ?? {};
  return {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 400),
    statusText: "",
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    text: async () => JSON.stringify(options.body),
    json: async () => options.body,
  };
}

describe("smsImportClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("posts a single SMS with bearer auth", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        ok: true,
        body: {
          ok: true,
          status: "parsed",
          transactionId: "tx-1",
        },
      }),
    );

    const result = await importSmsMessage({
      message: "Payment made for GHS 10.00 to SHOP.",
      sender: "MTN MoMo",
    });

    expect(result.status).toBe("parsed");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sms-import"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("maps 422 to no_active_budget_cycle", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        ok: false,
        status: 422,
        body: {
          ok: false,
          error: "no_active_budget_cycle",
          message: "Set up an active budget cycle before importing MoMo expenses.",
        },
      }),
    );

    await expect(
      importSmsMessage({ message: "Payment made for GHS 10.00 to SHOP." }),
    ).rejects.toMatchObject({
      code: "no_active_budget_cycle",
    });
  });

  it("batch imports multiple messages", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        ok: true,
        body: {
          ok: true,
          results: [
            { ok: true, status: "parsed" },
            { ok: true, status: "duplicate" },
          ],
          summary: {
            total: 2,
            parsed: 1,
            duplicate: 1,
            skipped: 0,
            failed: 0,
          },
        },
      }),
    );

    const batch = await importSmsBatch([
      { message: "Payment made for GHS 10.00 to A." },
      { message: "Payment made for GHS 20.00 to B." },
    ]);

    expect(batch.summary.total).toBe(2);
    expect(batch.summary.parsed).toBe(1);
    expect(batch.summary.duplicate).toBe(1);
  });

  it("posts structured candidate fields without sending the source SMS", async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: true, body: { ok: true, status: "parsed" } }));
    const sourceMessage = "Payment made for GHS 10.00 to ECG.";
    const payload = await toImportPayload({
      address: "MTN MoMo",
      body: sourceMessage,
      date: 1_790_000_000_000,
    });
    if (!payload) throw new Error("Expected a structured candidate");

    const crypto = jest.requireActual<typeof import("crypto")>("crypto");
    expect("candidate" in payload && payload.candidate.legacyDedupeKey).toBe(
      `hash:${crypto.createHash("sha256").update(sourceMessage, "utf8").digest("hex")}`,
    );

    await importSmsMessage(payload);

    const requestBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(requestBody).not.toContain(sourceMessage);
    expect(requestBody).not.toContain("legacyMessage");
    expect(requestBody).not.toContain("legacySender");
  });

  it("does not downgrade a rejected structured batch to raw SMS", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        body: { ok: false, error: "invalid_payload", message: "Structured candidates are not supported" },
      }),
    );
    const first = await toImportPayload({
      address: "MTN MoMo",
      body: "Payment made for GHS 10.00 to A.",
      date: 1_790_000_000_000,
    });
    const second = await toImportPayload({
      address: "MTN MoMo",
      body: "Payment made for GHS 20.00 to B.",
      date: 1_790_000_001_000,
    });
    if (!first || !second) throw new Error("Expected structured candidates");

    await expect(importSmsBatch([first, second])).rejects.toMatchObject({ code: "invalid_payload" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain("Payment made for GHS");
  });

  it("does not create a raw request payload for oversized inbox SMS", async () => {
    const payload = await toImportPayload({
      address: "MTN MoMo",
      body: `Payment made for GHS 10.00 to A.${" ".repeat(4000)}`,
      date: 1_790_000_000_000,
    });

    expect(payload).toBeNull();
  });
});

describe("sortCandidatePayloadsOldestFirst", () => {
  const payload = (id: string, receivedAt: string) =>
    ({ candidate: { clientImportId: id, receivedAt } }) as never;

  it("puts the original payment before its later reversal", () => {
    const reversal = payload("reversal", "2026-07-08T15:30:00.000Z");
    const original = payload("original", "2026-07-08T15:19:00.000Z");
    const sorted = sortCandidatePayloadsOldestFirst([reversal, original]) as unknown as Array<{
      candidate: { clientImportId: string };
    }>;
    expect(sorted.map((row) => row.candidate.clientImportId)).toEqual(["original", "reversal"]);
  });

  it("keeps input order for equal timestamps and does not mutate the input", () => {
    const a = payload("a", "2026-07-08T15:19:00.000Z");
    const b = payload("b", "2026-07-08T15:19:00.000Z");
    const input = [a, b];
    const sorted = sortCandidatePayloadsOldestFirst(input);
    expect(sorted[0]).toBe(a);
    expect(sorted[1]).toBe(b);
    expect(input).toEqual([a, b]);
  });

  it("puts a payment before its reversal when their timestamps are equal", () => {
    const at = "2026-07-08T15:19:00.000Z";
    const sorted = sortCandidatePayloadsOldestFirst([
      { candidate: { clientImportId: "reversal", eventType: "reversal", receivedAt: at } },
      { candidate: { clientImportId: "payment", eventType: "merchant_payment", receivedAt: at } },
    ] as never) as unknown as Array<{ candidate: { clientImportId: string } }>;
    expect(sorted.map((row) => row.candidate.clientImportId)).toEqual(["payment", "reversal"]);
  });
});
