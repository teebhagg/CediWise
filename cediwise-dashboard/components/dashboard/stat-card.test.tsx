import { render, screen } from "@testing-library/react";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders title, value, and description", () => {
    render(
      <StatCard
        title="Users"
        value={42}
        description="Total registered"
      />
    );
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total registered")).toBeInTheDocument();
  });

  it("renders a link when href is provided", () => {
    render(
      <StatCard
        title="Users"
        value={10}
        description="Total"
        href="/users"
      />
    );
    const link = screen.getByRole("link", { name: /10/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/users");
  });

  it("renders without link when href is not provided", () => {
    render(
      <StatCard
        title="Count"
        value={5}
        description="No link"
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
