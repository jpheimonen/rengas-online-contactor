import { FINDER_EXAMPLES, type FinderOption } from "@rengas/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinderCard } from "./FinderCard.tsx";

const webOption: FinderOption = {
  name: "Skyline Airship Advertising Oy, a rather long business name from the web",
  offer: "Airship banner flights over Helsinki.",
  price: null,
  location: "Helsinki, Finland",
  sourceUrl:
    "https://www.example-airships.test/very/long/path/that/should/not/overflow?with=query",
};

function renderCard(option: FinderOption = webOption, web = true) {
  const onSimulate = vi.fn();
  render(
    <FinderCard
      option={option}
      web={web}
      buttonLabel="Simulate booking"
      buttonDisabled={false}
      onSimulate={onSimulate}
    />,
  );
  return onSimulate;
}

describe("FinderCard", () => {
  it("shows a web result with its source domain, opening in a new tab", () => {
    renderCard();
    const link = screen.getByRole("link", {
      name: "View source www.example-airships.test (opens in a new tab)",
    });
    expect(link).toHaveAttribute("href", webOption.sourceUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("www.example-airships.test");
    expect(link).not.toHaveTextContent("/very/long/path");
    expect(
      screen.getByText("Found on the web · not contacted · not booked"),
    ).toBeInTheDocument();
  });

  it("says when no price is stated instead of inventing one", () => {
    renderCard();
    expect(screen.getByText("Price not stated")).toBeInTheDocument();
  });

  it("shows an example as invented, with no link", () => {
    const example = FINDER_EXAMPLES.aircraft[0]!;
    renderCard(example, false);
    expect(screen.getByText("EXAMPLE · invented business")).toBeInTheDocument();
    expect(screen.getByText(example.price!)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("names the card in the button's description and starts only the simulation", () => {
    const onSimulate = renderCard();
    const button = screen.getByRole("button", { name: "Simulate booking" });
    expect(button).toHaveAccessibleDescription(webOption.name);
    fireEvent.click(button);
    expect(onSimulate).toHaveBeenCalledOnce();
  });
});
