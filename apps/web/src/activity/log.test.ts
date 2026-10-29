import { expect, it } from "vitest";
import type { RunEvent } from "@rengas/shared";
import { emptyLog, logReducer } from "./log.ts";

const event = (id: number): RunEvent => ({
  id,
  at: "2026-10-29T12:00:00.000Z",
  type: "system",
  kind: "notice",
  text: `line ${id}`,
});

it("keeps the newest line first", () => {
  const log = [1, 2, 3].reduce(
    (state, id) => logReducer(state, { type: "event", event: event(id) }),
    emptyLog,
  );
  expect(log.items.map((item) => item.id)).toEqual([3, 2, 1]);
});

it("skips events a new connection replays again", () => {
  let log = logReducer(emptyLog, { type: "event", event: event(1) });
  log = logReducer(log, { type: "event", event: event(2) });
  log = logReducer(log, { type: "event", event: event(1) });
  expect(log.items).toHaveLength(2);
});

it("puts browser-only lines in the same newest-first list", () => {
  let log = logReducer(emptyLog, { type: "event", event: event(1) });
  log = logReducer(log, {
    type: "local",
    text: "🔊",
    at: "2026-10-29T12:00:01.000Z",
  });
  expect(log.items[0]).toMatchObject({
    type: "local",
    id: "local-1",
    text: "🔊",
  });
});
