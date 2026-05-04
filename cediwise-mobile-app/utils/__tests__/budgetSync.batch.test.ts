import { flushBudgetQueueUntilMutationIdsCleared } from "../budgetSync";
import { loadBudgetQueue, updateQueuedMutation, removeQueuedMutation } from "../budgetStorage";
import { supabase } from "../supabase";

jest.mock("../budgetStorage", () => ({
  loadBudgetQueue: jest.fn(),
  updateQueuedMutation: jest.fn().mockResolvedValue(undefined),
  removeQueuedMutation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

describe("flushBudgetQueueUntilMutationIdsCleared", () => {
  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeMutation = (id: string, overrides = {}) => ({
    id,
    userId,
    kind: "upsert_profile", // Using profile to avoid complex payload requirements in attemptMutationRemote
    payload: { id: userId },
    createdAt: new Date().toISOString(),
    retryCount: 0,
    ...overrides,
  });

  it("should return ok immediately if mutationIds is empty", async () => {
    const result = await flushBudgetQueueUntilMutationIdsCleared(userId, []);
    expect(result).toEqual({ ok: true });
  });

  it("should return ok if all mutations are cleared in first round", async () => {
    const mutationIds = ["m1", "m2"];
    
    // We let the real flushBudgetQueue run. It will call loadBudgetQueue, then trySyncMutation.
    // trySyncMutation will call updateQueuedMutation and attemptMutationRemote (which calls supabase).
    
    (loadBudgetQueue as jest.Mock)
      .mockResolvedValueOnce({ items: [makeMutation("m1"), makeMutation("m2")] }) // Round 0 start
      .mockResolvedValueOnce({ items: [makeMutation("m1"), makeMutation("m2")] }) // pendingWithError Round 0
      .mockResolvedValueOnce({ items: [makeMutation("m1"), makeMutation("m2")] }) // Inside flushBudgetQueue call
      .mockResolvedValueOnce({ items: [] }); // Round 1 start -> success!

    const result = await flushBudgetQueueUntilMutationIdsCleared(userId, mutationIds);
    
    expect(result).toEqual({ ok: true });
    expect(loadBudgetQueue).toHaveBeenCalled();
  });

  it("should return error if a mutation records an error", async () => {
    const mutationIds = ["m1"];
    const errorMsg = "Supabase error";

    // Mock supabase to return an error
    (supabase!.from as jest.Mock).mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: errorMsg } }),
    });

    (loadBudgetQueue as jest.Mock)
      .mockResolvedValueOnce({ items: [makeMutation("m1")] }) // Round 0 start
      .mockResolvedValueOnce({ items: [makeMutation("m1")] }) // pendingWithError Round 0
      .mockResolvedValueOnce({ items: [makeMutation("m1")] }) // Inside flushBudgetQueue
      .mockResolvedValueOnce({ items: [makeMutation("m1", { lastError: errorMsg })] }) // Round 1 start -> error!
      .mockResolvedValueOnce({ items: [makeMutation("m1", { lastError: errorMsg })] }); // pendingWithError Round 1

    const result = await flushBudgetQueueUntilMutationIdsCleared(userId, mutationIds);

    expect(result).toEqual({ ok: false, error: errorMsg });
  });

  it("should return error if max rounds reached and mutations still pending", async () => {
    const mutationIds = ["m1"];

    // Mock loadBudgetQueue to always return the same mutation
    (loadBudgetQueue as jest.Mock).mockResolvedValue({ items: [makeMutation("m1")] });
    
    // Mock supabase to return error so it doesn't get removed from queue (if it were real)
    // Actually, flushBudgetQueue calls loadBudgetQueue too.
    
    const result = await flushBudgetQueueUntilMutationIdsCleared(userId, mutationIds, { maxRounds: 2 });

    if (result.ok === false) {
      expect(result.error).toContain("Could not sync yet");
    } else {
      throw new Error("Result should not be ok");
    }
  });

  it("should stop early if a mutation already has an error before flushing", async () => {
    const mutationIds = ["m1"];
    const errorMsg = "Previous error";

    (loadBudgetQueue as jest.Mock).mockResolvedValue({
      items: [makeMutation("m1", { lastError: errorMsg })]
    });

    const result = await flushBudgetQueueUntilMutationIdsCleared(userId, mutationIds);

    expect(result).toEqual({ ok: false, error: errorMsg });
  });
});
