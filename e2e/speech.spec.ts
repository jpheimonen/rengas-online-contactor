import { expect, test } from "@playwright/test";
import {
  ROBOCALL_SPEECH,
  ROBOCALL_VOICE,
  SYSTEM_LINES,
} from "../packages/shared/src/index.ts";
import {
  climbTo,
  enter,
  logList,
  rungRow,
  showActivity,
} from "./support/app.ts";

const HEAR = "🔊 Hear the robocall · your speakers only";

// Parity row 9: the robocall preview uses the browser's own speech.
test("Hear the robocall speaks through the browser and logs it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const spoken: { text: string; rate: number; pitch: number }[] = [];
    Object.assign(window, { __spoken: spoken });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speak: (u: SpeechSynthesisUtterance) =>
          spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch }),
        cancel: () => {},
      },
    });
  });
  await enter(page);
  await climbTo(page, "robocall");
  await rungRow(page, "robocall").getByRole("button", { name: HEAR }).click();

  const spoken = await page.evaluate(
    () =>
      (
        window as unknown as {
          __spoken: { text: string; rate: number; pitch: number }[];
        }
      ).__spoken,
  );
  // The browser keeps rate and pitch as 32-bit floats.
  expect(spoken).toHaveLength(1);
  expect(spoken[0]?.text).toBe(ROBOCALL_SPEECH);
  expect(spoken[0]?.rate).toBeCloseTo(ROBOCALL_VOICE.rate, 5);
  expect(spoken[0]?.pitch).toBeCloseTo(ROBOCALL_VOICE.pitch, 5);
  await showActivity(page);
  await expect(logList(page)).toContainText(SYSTEM_LINES.speechPlaying);
});

test("without speech support the log says so", async ({ page }) => {
  await page.addInitScript(() => {
    // Chromium keeps window attributes on the window object itself.
    delete (window as unknown as Record<string, unknown>)["speechSynthesis"];
  });
  await enter(page);
  await climbTo(page, "robocall");
  await rungRow(page, "robocall").getByRole("button", { name: HEAR }).click();
  await showActivity(page);
  await expect(logList(page)).toContainText(SYSTEM_LINES.speechUnsupported);
});
