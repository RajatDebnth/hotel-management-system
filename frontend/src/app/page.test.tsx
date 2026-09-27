import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("presents the hotel and its simplified navigation", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { name: "Stay somewhere with a story." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Book Your Stay" })[0]).toHaveAttribute("href", "/rooms");
    expect(screen.getAllByRole("link", { name: "Home" })[0]).toHaveAttribute("href", "/#home");
    expect(screen.getAllByRole("link", { name: "Gallery" })[0]).toHaveAttribute("href", "/#gallery");
    expect(screen.getAllByRole("link", { name: "Contact" })[0]).toHaveAttribute("href", "/#contact");
  });
});
