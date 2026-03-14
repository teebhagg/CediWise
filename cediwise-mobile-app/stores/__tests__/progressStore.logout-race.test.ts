/** @jest-environment node */

import { useProgressStore } from "../progressStore";

let deferred: {
  resolve: (v: { data: any[]; error: null }) => void;
  promise: Promise<{ data: any[]; error: null }>;
};

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    get from() {
      return mockFrom;
    },
  },
}));

mockFrom.mockImplementation(() => ({
  select: mockSelect.mockImplementation(() => ({
    eq: mockEq.mockImplementation(() => deferred.promise),
  })),
}));

describe("progressStore logout race", () => {
  beforeEach(() => {
    let resolve: (v: { data: any[]; error: null }) => void;
    deferred = {
      promise: new Promise((res) => {
        resolve = res;
      }),
      resolve: null as any,
    };
    deferred.resolve = resolve!;

    useProgressStore.setState({
      userId: null,
      progress: {},
      loading: true,
    });
  });

  it("does not overwrite cleared state when logout happens during initForUser", async () => {
    const initPromise = useProgressStore.getState().initForUser("user-A");

    useProgressStore.getState().initForUser(null);

    deferred.resolve({
      data: [
        {
          lesson_id: "1",
          id: "x",
          user_id: "user-A",
          completed_at: null,
          quiz_score: null,
          quiz_attempted_at: null,
          created_at: "",
          updated_at: "",
        },
      ],
      error: null,
    });

    await initPromise;

    const state = useProgressStore.getState();
    expect(state.userId).toBeNull();
    expect(state.progress).toEqual({});
  });

  it("does not overwrite cleared state when logout happens during loadProgress", async () => {
    useProgressStore.setState({ userId: "user-A", progress: {}, loading: false });
    const loadPromise = useProgressStore.getState().loadProgress();

    useProgressStore.getState().initForUser(null);

    deferred.resolve({
      data: [{ lesson_id: "2", id: "y", user_id: "user-A", completed_at: null, quiz_score: null, quiz_attempted_at: null, created_at: "", updated_at: "" }],
      error: null,
    });

    await loadPromise;

    const state = useProgressStore.getState();
    expect(state.userId).toBeNull();
    expect(state.progress).toEqual({});
  });
});
