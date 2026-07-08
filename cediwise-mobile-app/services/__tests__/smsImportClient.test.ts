import {
  importSmsBatch,
  importSmsMessage,
} from "../smsImportClient";

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
});
