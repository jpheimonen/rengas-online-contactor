import { useEffect, useId, useState } from "react";
import {
  SEND_COPY,
  type ActionId,
  type SendPreview as Preview,
} from "@rengas/shared";
import { useActivity } from "../activity/ActivityProvider.tsx";
import { ApiProblem } from "../api/client.ts";
import { useAppState, usePreview, useStartRun } from "../api/queries.ts";
import { format } from "../format.ts";
import { Modal } from "./Modal.tsx";
import type { RealActionId } from "./SendsProvider.tsx";

/** Every real send opens here first; the Send for real button is the confirmation. */
export function SendPreview({
  actionId,
  onClose,
}: {
  actionId: RealActionId | null;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={actionId !== null}
      onClose={onClose}
      titleId={titleId}
      className="send-preview"
    >
      {actionId && (
        <PreviewFlow actionId={actionId} titleId={titleId} onClose={onClose} />
      )}
    </Modal>
  );
}

const channelOf = (actionId: RealActionId) =>
  actionId === "firm-email"
    ? "email"
    : actionId === "polite-sms"
      ? "sms"
      : "voice";

/** What the run's own events say after Send for real. */
type Outcome =
  | { kind: "sending" }
  | { kind: "accepted"; status?: string }
  | { kind: "failed"; text: string };

function PreviewFlow({
  actionId,
  titleId,
  onClose,
}: {
  actionId: RealActionId;
  titleId: string;
  onClose: () => void;
}) {
  const channel = channelOf(actionId);
  const { data: state } = useAppState();
  const prepare = usePreview();
  const start = useStartRun();
  const simulate = useStartRun();
  const { items } = useActivity();
  const now = useNow();

  // The verified recipient the server would send to: the latest one on this channel.
  const recipient = state?.recipients.findLast(
    (r) =>
      r.verified && r.channel === (channel === "email" ? "email" : "phone"),
  );

  const preparePreview = () => {
    if (recipient) prepare.mutate({ actionId, recipientId: recipient.id });
  };
  // Prepare once on open; Rewrite and "Prepare a new preview" ask again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(preparePreview, []);

  const preview = prepare.data;
  const runId = start.data?.runId;
  const outcome = runId ? outcomeOf(items, runId) : null;
  const confirmed = !start.isIdle;

  const simulateInstead = () =>
    simulate.mutate(
      { actionId: actionId as ActionId, simulate: true },
      { onSuccess: onClose },
    );

  const heading = (mark: string, title: string) => (
    <>
      <span className="mark mark-real">{mark}</span>
      <h2 id={titleId} tabIndex={-1}>
        {title}
      </h2>
    </>
  );

  // After Send for real: Sending… until the run reports, then Accepted or Failed.
  if (confirmed) {
    let body;
    if (start.isError) {
      const known = start.error instanceof ApiProblem;
      body = (
        <>
          {heading("REAL · FAILED", SEND_COPY.failed)}
          <p className="form-error" role="alert">
            {known ? start.error.message : SEND_COPY.unknown}
          </p>
        </>
      );
    } else if (!outcome || outcome.kind === "sending") {
      body = (
        <>
          {heading("REAL · SENDING", SEND_COPY.sending)}
          <p className="muted">{SEND_COPY.sendingHelp}</p>
          <button type="button" className="button primary" disabled>
            <span className="spinner" aria-hidden="true" />
            {SEND_COPY.send}
          </button>
        </>
      );
    } else if (outcome.kind === "accepted") {
      body = (
        <>
          {heading("REAL · ACCEPTED", SEND_COPY.accepted)}
          <p role="status">
            {SEND_COPY.acceptedHelp[channel]}
            {outcome.status && ` ${outcome.status}`}
          </p>
          <button
            type="button"
            className="button quiet follow"
            onClick={() => {
              onClose();
              followInActivity();
            }}
          >
            {SEND_COPY.follow} <span aria-hidden="true">›</span>
          </button>
        </>
      );
    } else {
      body = (
        <>
          {heading("REAL · FAILED", SEND_COPY.failed)}
          <p className="form-error" role="alert">
            {outcome.text}
          </p>
        </>
      );
    }
    return (
      <>
        <div className="modal-body preview-status">{body}</div>
        <div className="modal-foot">
          <button type="button" className="button quiet" onClick={onClose}>
            {SEND_COPY.close}
          </button>
        </div>
      </>
    );
  }

  const expired = preview && now >= Date.parse(preview.expiresAt);
  // Removed or replaced since the preview was made: the server would refuse it.
  const gone =
    preview &&
    !state?.recipients.some(
      (r) => r.verified && r.id === prepare.variables?.recipientId,
    );
  const canSend = preview && !expired && !gone;

  return (
    <>
      <div className="modal-head">
        <div className="preview-title">
          {heading("REAL · PREVIEW", SEND_COPY.title[channel])}
          <p className="muted">{SEND_COPY.nothingSent}</p>
        </div>
        <button
          type="button"
          className="button quiet small"
          aria-label="Close preview"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="modal-body">
        {!recipient && !preview ? (
          <p className="form-error" role="alert">
            {SEND_COPY.recipientGone}
          </p>
        ) : !preview ? (
          prepare.isError ? (
            <p className="form-error" role="alert">
              {prepare.error.message}
            </p>
          ) : (
            <p className="preparing" role="status">
              <span className="spinner" aria-hidden="true" />
              {SEND_COPY.preparing}
            </p>
          )
        ) : (
          <PreviewContent preview={preview} channel={channel} />
        )}
        {expired && (
          <p className="form-error" role="alert">
            {SEND_COPY.expired}
          </p>
        )}
        {gone && (
          <p className="form-error" role="alert">
            {SEND_COPY.recipientGone}
          </p>
        )}
        {simulate.error && (
          <p className="form-error" role="alert">
            {simulate.error.message}
          </p>
        )}
      </div>
      <div className="modal-foot preview-actions">
        {expired ? (
          <button
            type="button"
            className="button primary"
            disabled={prepare.isPending || !recipient}
            onClick={preparePreview}
          >
            {SEND_COPY.prepareAgain}
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            disabled={!canSend}
            onClick={() =>
              preview &&
              start.mutate({
                actionId: actionId as ActionId,
                confirmToken: preview.confirmToken,
              })
            }
          >
            {SEND_COPY.send}
          </button>
        )}
        {channel !== "voice" && preview && !expired && (
          <button
            type="button"
            className="button quiet"
            disabled={prepare.isPending || !recipient}
            onClick={preparePreview}
          >
            {SEND_COPY.rewrite}
          </button>
        )}
        <button
          type="button"
          className="button simulate"
          disabled={simulate.isPending}
          onClick={simulateInstead}
        >
          {SEND_COPY.simulate}
        </button>
        <button type="button" className="link" onClick={onClose}>
          {SEND_COPY.cancel}
        </button>
      </div>
    </>
  );
}

function PreviewContent({
  preview,
  channel,
}: {
  preview: Preview;
  channel: "email" | "sms" | "voice";
}) {
  const { content, remaining } = preview;
  return (
    <>
      <div className="preview-field">
        <p className="preview-label">{SEND_COPY.to[channel]}</p>
        <div className="preview-to">
          <span aria-hidden="true">{channel === "email" ? "✉" : "📱"}</span>
          <div>
            <p className="mono strong">
              {preview.recipient}{" "}
              <span className="ok-tick" aria-label="verified">
                ✓
              </span>
            </p>
            <p className="muted">{SEND_COPY.standIn}</p>
          </div>
        </div>
      </div>
      {content.channel === "email" && (
        <>
          <div className="preview-field">
            <p className="preview-label">{SEND_COPY.subject}</p>
            <p className="preview-box">{content.subject}</p>
          </div>
          <div className="preview-field">
            <p className="preview-label">{SEND_COPY.message}</p>
            <p className="preview-box message mono">{content.body}</p>
          </div>
        </>
      )}
      {content.channel === "sms" && (
        <div className="preview-field">
          <p className="preview-label">{SEND_COPY.message}</p>
          <p className="preview-box message mono">{content.text}</p>
        </div>
      )}
      {content.channel === "voice" && (
        <>
          <p>
            {format(SEND_COPY.callCap, { seconds: String(content.maxSeconds) })}
          </p>
          <div className="preview-field">
            <p className="preview-label">{SEND_COPY.callOpening}</p>
            <p className="preview-box message mono">{content.opening}</p>
          </div>
          <div className="preview-field">
            <p className="preview-label">{SEND_COPY.callRules}</p>
            <ul className="preview-box rules">
              {content.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          {content.trialNotice && (
            <p className="help">{SEND_COPY.trialNotice}</p>
          )}
        </>
      )}
      {preview.aiWritten && <p className="ai-written">AI-written</p>}
      <p className="remaining mono">
        <span aria-hidden="true">➤ </span>
        {format(SEND_COPY.remaining, {
          hourLeft: String(remaining.hour.left),
          hourOf: String(remaining.hour.of),
          sends: SEND_COPY.sendWords[channel],
          dayLeft: String(remaining.day.left),
          dayOf: String(remaining.day.of),
        })}
      </p>
    </>
  );
}

/** Reads the run's events: a provider status or Done means accepted, never delivered. */
function outcomeOf(
  items: ReturnType<typeof useActivity>["items"],
  runId: string,
): Outcome {
  let outcome: Outcome = { kind: "sending" };
  // Items are newest first; walk oldest first so the latest word wins.
  for (const item of items.toReversed()) {
    if (item.type === "local" || item.type === "system") continue;
    if (item.runId !== runId) continue;
    if (item.type === "provider-status")
      outcome = { kind: "accepted", status: item.text };
    else if (item.type === "done" && outcome.kind === "sending")
      outcome = { kind: "accepted" };
    else if (item.type === "failed" || item.type === "cancelled")
      outcome = { kind: "failed", text: item.text };
  }
  return outcome;
}

/** On small screens Activity is a tab; elsewhere it sits beside the ladder. */
function followInActivity() {
  document.getElementById("tab-activity")?.click();
  document.getElementById("activity-title")?.scrollIntoView({ block: "start" });
}

/** The current time, ticking each second, so an open preview notices it expired. */
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
