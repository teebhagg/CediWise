import { useBudgetStore } from "../budgetStore";

describe("budgetStore batch transactions", () => {
  beforeEach(() => {
    useBudgetStore.getState().clearDraftBatch();
    useBudgetStore.getState().resetLastUsed();
  });

  it("should add a transaction to the draft batch", () => {
    const draft = {
      amount: 100,
      bucket: "needs" as const,
      categoryId: "cat-1",
      note: "Test note",
      occurredAt: "2024-01-01",
    };

    useBudgetStore.getState().addToDraftBatch(draft);

    const items = useBudgetStore.getState().getDraftBatchTransactions();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject(draft);
    expect(items[0].tempId).toBeDefined();
  });

  it("should update a transaction in the draft batch", () => {
    useBudgetStore.getState().addToDraftBatch({
      amount: 100,
      bucket: "needs",
      categoryId: "cat-1",
    });

    const items = useBudgetStore.getState().getDraftBatchTransactions();
    const tempId = items[0].tempId;

    useBudgetStore.getState().updateDraftBatchItem(tempId, {
      amount: 200,
      bucket: "wants",
      categoryId: "cat-2",
    });

    const updatedItems = useBudgetStore.getState().getDraftBatchTransactions();
    expect(updatedItems[0].amount).toBe(200);
    expect(updatedItems[0].bucket).toBe("wants");
    expect(updatedItems[0].categoryId).toBe("cat-2");
  });

  it("should remove a transaction from the draft batch", () => {
    useBudgetStore.getState().addToDraftBatch({
      amount: 100,
      bucket: "needs",
      categoryId: "cat-1",
    });

    const items = useBudgetStore.getState().getDraftBatchTransactions();
    const tempId = items[0].tempId;

    useBudgetStore.getState().removeFromDraftBatch(tempId);

    const updatedItems = useBudgetStore.getState().getDraftBatchTransactions();
    expect(updatedItems).toHaveLength(0);
  });

  it("should clear the entire draft batch", () => {
    useBudgetStore.getState().addToDraftBatch({ amount: 10, bucket: "needs" });
    useBudgetStore.getState().addToDraftBatch({ amount: 20, bucket: "wants" });

    useBudgetStore.getState().clearDraftBatch();

    expect(useBudgetStore.getState().getDraftBatchTransactions()).toHaveLength(0);
  });

  it("should track last used bucket and category", () => {
    useBudgetStore.getState().setLastUsedBucket("wants");
    useBudgetStore.getState().setLastUsedCategory("cat-123");

    expect(useBudgetStore.getState().lastUsedBucket).toBe("wants");
    expect(useBudgetStore.getState().lastUsedCategoryId).toBe("cat-123");

    useBudgetStore.getState().resetLastUsed();
    expect(useBudgetStore.getState().lastUsedBucket).toBeNull();
    expect(useBudgetStore.getState().lastUsedCategoryId).toBeNull();
  });
});
