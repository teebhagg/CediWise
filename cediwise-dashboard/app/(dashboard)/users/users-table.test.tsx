"use client";

import { act, fireEvent, render, screen } from "@testing-library/react";
import type { UserWithProfile } from "@/lib/actions/users";
import { UsersTable } from "./users-table";

let currentQuery = "page=2";
const pushMock = vi.fn((href: string) => {
  currentQuery = href.split("?")[1] ?? "";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(currentQuery),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const users: UserWithProfile[] = [
  {
    id: "user-1",
    email: "test@example.com",
    phone: "233000000000",
    name: "Test User",
    createdAt: "2026-04-01T00:00:00.000Z",
    lastSignInAt: "2026-04-10T00:00:00.000Z",
    lastActiveAt: "2026-04-10T00:00:00.000Z",
    deviceAppVersion: "1.0.0",
    devicePlatform: "android",
    versionStatus: "current",
    profile: null,
    subscription: null,
  },
];

describe("UsersTable search behavior", () => {
  beforeEach(() => {
    currentQuery = "page=2";
    pushMock.mockReset();
    pushMock.mockImplementation((href: string) => {
      currentQuery = href.split("?")[1] ?? "";
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not update URL for 1-2 characters, applies at 3+, and clears on empty", async () => {
    const { rerender } = render(
      <UsersTable
        users={users}
        total={1}
        page={2}
        perPage={20}
        filters={{}}
      />
    );

    const input = screen.getByPlaceholderText("Search by name, email, phone, or ID...");

    fireEvent.change(input, { target: { value: "ab" } });
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "abc" } });
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(pushMock).toHaveBeenLastCalledWith("/users?page=1&search=abc");

    rerender(
      <UsersTable
        users={users}
        total={1}
        page={1}
        perPage={20}
        filters={{ search: "abc" }}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Search by name, email, phone, or ID..."),
      { target: { value: "" } }
    );
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(pushMock).toHaveBeenLastCalledWith("/users?page=1");
  });

  it("resets filters back to page 1", () => {
    render(
      <UsersTable
        users={users}
        total={1}
        page={2}
        perPage={20}
        filters={{ search: "abcd", versionStatus: "outdated" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(pushMock).toHaveBeenCalledWith("/users?page=1");
  });
});
