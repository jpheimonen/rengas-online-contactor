import { Hono } from "hono";
import {
  PROVIDER_NAMES,
  RUNGS,
  UNLOCK_LINES,
  canAttemptUnlock,
  isUnlocked,
  rungIdSchema,
  unlockRequestSchema,
  validateKeys,
  type Rung,
  type RungId,
  type UnlockMode,
  type UnlockRequest,
} from "@rengas/shared";
import { problem } from "../errors.ts";
import type { AcceptedKey } from "../keys.ts";
import type { Services } from "../services.ts";
import type { SessionEnv } from "../session.ts";
import { addUnlock, getUnlocks } from "../session-data.ts";
import { buildState } from "../state.ts";
import { readBody } from "../validate.ts";

/** UNLOCK_LINES use `{level}`, `{title}`, `{provider}`, `{hint}` and `{key}`. */
const line = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    String(values[name] ?? match),
  );

/** `POST /api/rungs/:id/unlock` with a real, pretend or configured key (register decision unlock-modes). */
export function rungRoutes(services: Services) {
  return new Hono<SessionEnv>().post("/rungs/:id/unlock", async (c) => {
    const sessionId = c.get("sessionId");
    const parsedId = rungIdSchema.safeParse(c.req.param("id"));
    if (!parsedId.success) throw problem(404, "not-found", "No such level.");
    const index = RUNGS.findIndex((rung) => rung.id === parsedId.data);
    const rung = RUNGS[index]!;

    const unlocked = new Set<string>(getUnlocks(services.db, sessionId).keys());
    if (!canAttemptUnlock(index, unlocked)) {
      throw isUnlocked(index, unlocked)
        ? problem(409, "not-next-rung", "This level is already unlocked.")
        : problem(409, "not-next-rung", "Unlock the level below first.");
    }

    const request = await readBody(c, unlockRequestSchema);
    const accepted = await acceptKeys(services, sessionId, rung, request);
    addUnlock(services.db, sessionId, rung.id as RungId, request.mode);
    logUnlock(services, sessionId, rung, request, accepted);
    return c.json(buildState(services, sessionId));
  });
}

async function acceptKeys(
  { keyVault }: Services,
  sessionId: string,
  rung: Rung,
  request: UnlockRequest,
): Promise<AcceptedKey | null> {
  if (request.mode === "configured") {
    const key = keyVault.configured(rung);
    if (!key) {
      throw problem(
        409,
        "not-configured",
        "No key for this level is configured on the server.",
      );
    }
    return key;
  }

  const shapeErrors = validateKeys(rung.keys, request.keys);
  if (Object.keys(shapeErrors).length > 0) {
    throw problem(
      422,
      "invalid-keys",
      "Some keys don't look right.",
      shapeErrors,
    );
  }
  if (request.mode === "pretend") return null;

  if (!rung.keys.some((key) => key.kind === "real")) {
    throw problem(
      400,
      "invalid-request",
      "This level only takes pretend keys.",
    );
  }
  const result = await keyVault.checkAndStore(sessionId, rung, request.keys);
  if ("fieldErrors" in result) {
    throw problem(
      422,
      "invalid-keys",
      "The provider refused the key.",
      result.fieldErrors,
    );
  }
  return result;
}

function logUnlock(
  { events }: Services,
  sessionId: string,
  rung: Rung,
  request: UnlockRequest,
  accepted: AcceptedKey | null,
): void {
  const values = {
    level: rung.level,
    title: rung.title,
    ...(accepted && {
      provider: PROVIDER_NAMES[accepted.provider],
      hint: accepted.hint,
    }),
  };
  const templates: Record<UnlockMode, string> = {
    real: UNLOCK_LINES.real,
    configured: UNLOCK_LINES.configured,
    pretend:
      request.mode === "pretend" && request.madeUp
        ? UNLOCK_LINES.pretendMadeUp
        : UNLOCK_LINES.pretendTyped,
  };
  const madeUpKey =
    request.mode === "pretend" ? (Object.values(request.keys)[0] ?? "") : "";
  let text = line(templates[request.mode], { ...values, key: madeUpKey });
  const hasRealActions = rung.actions.some((a) => a.mode === "real-capable");
  if (request.mode === "pretend" && hasRealActions) {
    text += ` ${UNLOCK_LINES.pretendOnRealRung}`;
  }

  const rungId = rung.id as RungId;
  events.append(sessionId, { type: "system", kind: "unlock", text, rungId });
  const reaction =
    accepted && rung.realReaction ? rung.realReaction : rung.reaction;
  events.append(sessionId, {
    type: "system",
    kind: "reaction",
    text: reaction,
    rungId,
  });
}
