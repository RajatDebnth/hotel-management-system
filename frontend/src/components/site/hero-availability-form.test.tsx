import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeroAvailabilityForm } from "./hero-availability-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("HeroAvailabilityForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    push.mockReset();
  });

  it("explains incomplete and reversed dates without navigating", () => {
    render(<HeroAvailabilityForm />);
    fireEvent.click(screen.getByRole("button", { name: /check availability/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose both check-in and check-out dates.");

    fireEvent.change(screen.getByLabelText("Check in"), { target: { value: "2099-10-20" } });
    fireEvent.change(screen.getByLabelText("Check out"), { target: { value: "2099-10-19" } });
    fireEvent.click(screen.getByRole("button", { name: /check availability/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Check-out must be after check-in.");
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to live results with the complete stay query", () => {
    render(<HeroAvailabilityForm />);
    fireEvent.change(screen.getByLabelText("Check in"), { target: { value: "2099-10-20" } });
    fireEvent.change(screen.getByLabelText("Check out"), { target: { value: "2099-10-23" } });
    fireEvent.change(screen.getByLabelText("Guests"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /check availability/i }));

    expect(push).toHaveBeenCalledWith("/rooms?check_in=2099-10-20&check_out=2099-10-23&guests=4");
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });
});
