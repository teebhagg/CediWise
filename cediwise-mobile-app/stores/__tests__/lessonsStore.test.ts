/** @jest-environment node */

import { useLessonsStore } from "../lessonsStore";

jest.mock("@/utils/supabase", () => ({ supabase: null }));
jest.mock("@/constants/lessons", () => ({
  LESSON_MAP: {
    "test-lesson-1": {
      id: "test-lesson-1",
      title: "Test Lesson 1",
      module: "budgeting-basics",
      difficulty: "beginner",
      duration_minutes: 5,
      languages: ["en"],
      tags: [],
      content_url: null,
      calculator_id: null,
      sources: [],
      verified_by: null,
      version: "1.0.0",
      last_updated: "2026-02-17",
    },
  },
}));
jest.mock("@/constants/literacy", () => ({
  MODULES: [
    {
      id: "budgeting-basics",
      title: "Budgeting Basics",
      lessonIds: ["test-lesson-1", "unknown-lesson"],
    },
  ],
}));

describe("lessonsStore", () => {
  beforeEach(() => {
    useLessonsStore.setState({
      lessons: [],
      loading: true,
      error: null,
    });
  });

  it("falls back to bundled lessons when supabase is null", async () => {
    await useLessonsStore.getState().loadLessons();

    const state = useLessonsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.lessons).toHaveLength(2);

    // First lesson should come from LESSON_MAP
    expect(state.lessons[0].id).toBe("test-lesson-1");
    expect(state.lessons[0].title).toBe("Test Lesson 1");

    // Second lesson (unknown) should be auto-generated
    expect(state.lessons[1].id).toBe("unknown-lesson");
    expect(state.lessons[1].module).toBe("budgeting-basics");
    expect(state.lessons[1].difficulty).toBe("beginner");
  });

  it("sets loading to false after load completes", async () => {
    expect(useLessonsStore.getState().loading).toBe(true);
    await useLessonsStore.getState().loadLessons();
    expect(useLessonsStore.getState().loading).toBe(false);
  });

  it("does not set error on successful load", async () => {
    await useLessonsStore.getState().loadLessons();
    expect(useLessonsStore.getState().error).toBeNull();
  });
});
