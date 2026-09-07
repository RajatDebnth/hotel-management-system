import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("identifies the application", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { name: "Stay somewhere with a story." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore our rooms" })).toHaveAttribute("href", "/rooms");
  });
});
