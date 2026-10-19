import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("./adminApi");
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

describe("LoginForm", () => {
  it("shows and hides the password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const field = screen.getByLabelText("Admin password");
    await user.type(field, "pinecone");
    expect(field).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");
    expect(field).toHaveValue("pinecone");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("offers a username to password managers", () => {
    const { container } = render(<LoginForm />);
    expect(container.querySelector('input[autocomplete="username"]')).toHaveValue("admin");
    expect(screen.getByLabelText("Admin password")).toHaveAttribute("autocomplete", "current-password");
  });
});
