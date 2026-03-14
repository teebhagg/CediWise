/** @jest-environment node */

import { useDebtStore } from "../debtStore";

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

describe("debtStore logout race", () => {
  beforeEach(() => {
    let resolve: (v: { data: any[]; error: null }) => void;
    deferred = {
      promise: new Promise<{ data: any[]; error: null }>((res) => {
        resolve = res;
      }),
      resolve: null as any,
    };
    deferred.resolve = resolve!;

    useDebtStore.setState({
      userId: null,
      debts: [],
      isLoading: true,
      error: null,
    });
  });

  it("does not overwrite cleared state when logout happens during loadDebts", async () => {
    useDebtStore.setState({ userId: "user-A", debts: [], isLoading: false });
    const loadPromise = useDebtStore.getState().loadDebts();

    useDebtStore.getState().initForUser(null);

    deferred.resolve({
      data: [
        {
          id: "d1",
          user_id: "user-A",
          name: "Loan",
          total_amount: 1000,
          remaining_amount: 500,
          monthly_payment: 100,
          interest_rate: null,
          start_date: "2024-01-01",
          target_payoff_date: null,
          is_active: true,
          category_id: null,
          source_cycle_id: null,
          created_at: "",
          updated_at: "",
        },
      ],
      error: null,
    });

    await loadPromise;

    const state = useDebtStore.getState();
    expect(state.userId).toBeNull();
    expect(state.debts).toEqual([]);
  });
});
