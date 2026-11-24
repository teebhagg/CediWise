import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, createClient, isAdmin, revalidatePath } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  isAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ isAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { listWebsiteReports, updateWebsiteReportStatus } from "./reports";

const REPORT_ID = "6ddda72b-5faa-4887-b419-9b0b3a7b47f2";

function signedIn(userId = "admin-1") {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: userId, email: "ops@cediwise.app" } } })),
    },
  });
}

/** Records every builder call; the awaited chain resolves to `result`. */
function chain(result: { data: unknown; error: unknown; count?: number }) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push([name, args]);
      return builder;
    });
  for (const name of ["select", "eq", "or", "order", "update"]) {
    builder[name] = record(name);
  }
  builder.range = vi.fn(async (...args: unknown[]) => {
    calls.push(["range", args]);
    return result;
  });
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return { builder, calls };
}

describe("website report actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedIn();
    isAdmin.mockResolvedValue(true);
  });

  it("refuses to list reports for a signed-out visitor", async () => {
    createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    await expect(listWebsiteReports({})).rejects.toThrow("Unauthorized");
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("refuses to list reports for a signed-in user who is not an admin", async () => {
    isAdmin.mockResolvedValue(false);
    await expect(listWebsiteReports({})).rejects.toThrow("Unauthorized");
  });

  it("applies status and category filters, sorts newest first, and pages the range", async () => {
    const { builder, calls } = chain({ data: [{ id: REPORT_ID }], error: null, count: 41 });
    createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    const result = await listWebsiteReports({ status: "open", category: "app_problem" }, 2, 20);

    expect(result).toEqual({ data: [{ id: REPORT_ID }], total: 41 });
    expect(calls).toContainEqual(["eq", ["status", "open"]]);
    expect(calls).toContainEqual(["eq", ["category", "app_problem"]]);
    expect(calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
    expect(calls).toContainEqual(["range", [20, 39]]);
  });

  it("filters to reports whose team email failed", async () => {
    const { builder, calls } = chain({ data: [], error: null, count: 3 });
    createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    const result = await listWebsiteReports({ emailStatus: "failed" }, 1, 1);

    expect(result.total).toBe(3);
    expect(calls).toContainEqual(["eq", ["email_status", "failed"]]);
  });

  it("keeps punctuation searchable and escapes the filter and LIKE syntax", async () => {
    const { builder, calls } = chain({ data: [], error: null, count: 0 });
    createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    await listWebsiteReports({ search: "ama,(drop)*table%" });

    const pattern = String.raw`"%ama,(drop)*table\\%%"`;
    const orCall = calls.find(([name]) => name === "or");
    expect(orCall?.[1][0]).toBe(`reporter_email.ilike.${pattern},message.ilike.${pattern}`);
  });

  it("searches messages that contain parentheses as written", async () => {
    const { builder, calls } = chain({ data: [], error: null, count: 0 });
    createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    await listWebsiteReports({ search: "Error (code 401)" });

    const orCall = calls.find(([name]) => name === "or");
    expect(orCall?.[1][0]).toContain('message.ilike."%Error (code 401)%"');
  });

  it("updates a report's status and refreshes the dashboard page", async () => {
    const { builder, calls } = chain({ data: null, error: null });
    createAdminClient.mockReturnValue({ from: vi.fn(() => builder) });

    await expect(updateWebsiteReportStatus(REPORT_ID, "resolved")).resolves.toEqual({ success: true });

    expect(calls.find(([name]) => name === "update")?.[1][0]).toMatchObject({ status: "resolved" });
    expect(calls).toContainEqual(["eq", ["id", REPORT_ID]]);
    expect(revalidatePath).toHaveBeenCalledWith("/reports");
  });

  it("rejects an unknown status or a malformed id before touching the database", async () => {
    await expect(updateWebsiteReportStatus(REPORT_ID, "deleted")).rejects.toThrow("Unknown report status.");
    await expect(updateWebsiteReportStatus("not-a-uuid", "open")).rejects.toThrow("Unknown report.");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
