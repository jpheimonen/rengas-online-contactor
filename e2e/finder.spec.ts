import { expect, test, type Page } from "@playwright/test";
import { FINDER_EXAMPLES } from "../packages/shared/src/index.ts";
import {
  actionRow,
  climbTo,
  enter,
  expectNoAxeViolations,
  logList,
  makeOneUp,
  showActivity,
  showLadder,
} from "./support/app.ts";

/** Searches with a finder action and returns its result cards. */
async function search(page: Page, actionId: string, label: string) {
  const row = actionRow(page, actionId);
  await row.getByRole("button", { name: label }).click();
  await expect(row.getByRole("status")).toContainText("invented examples");
  return row.getByRole("article");
}

/** Presses a card's simulate button and checks the run's log lines. */
async function simulate(
  page: Page,
  cards: ReturnType<Page["getByRole"]>,
  name: string,
  button: string,
  logLine: string,
) {
  await cards
    .filter({ has: page.getByRole("heading", { name }) })
    .getByRole("button", { name: button })
    .click();
  await showActivity(page);
  const line = logList(page).getByRole("listitem").filter({ hasText: logLine });
  await expect(line).toHaveCount(1, { timeout: 20_000 });
  await expect(line).toContainText("SIMULATED");
  await showLadder(page);
}

// Without an OpenAI key the finder shows invented examples, and a card only
// starts a simulated run with that card's name.
test("finder examples lead to simulated hiring and booking, and the browser calls nothing outside", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const foreign: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(baseURL ?? "")) foreign.push(request.url());
  });
  await enter(page);
  await climbTo(page, "rent-a-human");

  const humans = await search(page, "find-humans", "Find humans for hire");
  await expect(humans).toHaveCount(FINDER_EXAMPLES.humans.length);
  for (const card of await humans.all()) {
    await expect(card).toContainText("EXAMPLE · invented business");
    await expect(card.getByRole("link")).toHaveCount(0);
  }
  await expectNoAxeViolations(page);
  await simulate(
    page,
    humans,
    "Guy With Clipboard Ltd",
    "Simulate hiring",
    "Pretending to post a gig on Guy With Clipboard Ltd. Nothing is posted.",
  );

  await makeOneUp(page, "blimp");
  const aircraft = await search(page, "find-aircraft", "Find a real blimp");
  await expect(aircraft).toHaveCount(FINDER_EXAMPLES.aircraft.length);
  await expect(
    aircraft.filter({ hasText: "Balloon of Mild Concern" }),
  ).toContainText("Price not stated");
  await simulate(
    page,
    aircraft,
    "Totally Real Airships",
    "Simulate booking",
    "Pretending to book Totally Real Airships. Nothing is sent to them.",
  );

  // Cards fit the screen: no sideways scrolling, even on a phone.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(logList(page).locator(".mark-real")).toHaveCount(0);
  expect(foreign).toEqual([]);
});
