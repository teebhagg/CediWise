/** @jest-environment node */

import { useRecurringExpensesStore } from "../recurringExpensesStore";

let deferred: {
  resolve: (v: { data: any[]; error: null }) => void;
  promise: Promise<{ data: any[]; error: null }>;
};

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    get from() {
      return mockFrom;
    },
  },
}));

mockFrom.mockImplementation(() => ({
  select: mockSelect.mockImplementation(() => ({
    eq: mockEq.mockImplementation(() => ({
      order: mockOrder.mockImplementation(() => deferred.promise),
    })),
  })),
}));

describe("recurringExpensesStore logout race", () => {
  beforeEach(() => {
    let resolve: (v: { data: any[]; error: null }) => void;
    deferred = {
      promise: new Promise<{ data: any[]; error: null }>((res) => {
        resolve = res;
      }),
      resolve: null as any,
    };
    deferred.resolve = resolve!;

    useRecurringExpensesStore.setState({
      userId: null,
      recurringExpenses: [],
      isLoading: true,
      error: null,
      budgetQueueFlushError: null,
    });
  });

  it("does not overwrite cleared state when logout happens during loadRecurringExpenses", async () => {
    useRecurringExpensesStore.setState({
      userId: "user-A",
      recurringExpenses: [],
      isLoading: false,
    });
    const loadPromise =
      useRecurringExpensesStore.getState().loadRecurringExpenses();

    useRecurringExpensesStore.getState().initForUser(null);

    deferred.resolve({
      data: [
        {
          id: "r1",
          user_id: "user-A",
          name: "Rent",
          amount: 500,
          frequency: "monthly",
          bucket: "needs",
          category_id: null,
          start_date: "2024-01-01",
          end_date: null,
          is_active: true,
          auto_allocate: true,
          created_at: "",
          updated_at: "",
        },
      ],
      error: null,
    });

    await loadPromise;

    const state = useRecurringExpensesStore.getState();
    expect(state.userId).toBeNull();
    expect(state.recurringExpenses).toEqual([]);
  });
});
