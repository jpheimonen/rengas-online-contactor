import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  STAND_IN_COPY,
  createRecipientRequestSchema,
  type Recipient,
} from "@rengas/shared";
import { ApiProblem } from "../api/client.ts";
import {
  useAddRecipient,
  useAppState,
  useRemoveRecipient,
  useVerifyRecipient,
} from "../api/queries.ts";
import { Modal } from "./Modal.tsx";

type Channel = Recipient["channel"];

/** The operator's own inbox and phone, each proved with a code. */
export function StandIns({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      className="stand-ins"
    >
      <div className="modal-head">
        <h2 id={titleId} tabIndex={-1}>
          {STAND_IN_COPY.title}
        </h2>
        <button type="button" className="button quiet small" onClick={onClose}>
          <span aria-hidden="true">✕</span> {STAND_IN_COPY.close}
        </button>
      </div>
      <div className="modal-body">
        <p className="lead">{STAND_IN_COPY.intro}</p>
        <div className="recipient-grid">
          <RecipientSection channel="email" onClose={onClose} />
          <RecipientSection channel="phone" onClose={onClose} />
        </div>
      </div>
    </Modal>
  );
}

/** The rung that holds the provider key a code needs. */
const SETUP_RUNG: Record<Channel, { id: string; text: string }> = {
  email: { id: "email", text: "Add a real Resend key at level 2" },
  phone: { id: "sms", text: "Add a real Twilio account at level 4" },
};

/**
 * One section: empty → sending code → waiting for code → checking → verified.
 * Where it is comes from the server's recipients; only the requests in
 * flight are local.
 */
function RecipientSection({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const copy = channel === "email" ? STAND_IN_COPY.inbox : STAND_IN_COPY.phone;
  const { data: state } = useAppState();
  const mine = state?.recipients.filter((r) => r.channel === channel) ?? [];
  const verified = mine.findLast((r) => r.verified);
  const pending = mine.findLast((r) => !r.verified);

  const add = useAddRecipient();
  const verify = useVerifyRecipient();
  const remove = useRemoveRecipient();
  // The typed address, kept so "Send new code" can ask again.
  const [address, setAddress] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<ApiProblem | Error | null>(null);
  const ids = useId();
  const errorId = `${ids}-error`;
  const helpId = `${ids}-help`;

  const sendCode = (to: string) => {
    setError(null);
    const parsed = createRecipientRequestSchema.safeParse({
      channel,
      address: to.replaceAll(" ", ""),
    });
    if (!parsed.success) {
      setError(
        new Error(
          channel === "email"
            ? "Enter an email address like you@example.com."
            : (parsed.error.issues[0]?.message ?? "Use the +358… format."),
        ),
      );
      return;
    }
    add.mutate(parsed.data, {
      onSuccess: () => {
        setSentTo(parsed.data.address);
        setCode("");
      },
      onError: setError,
    });
  };

  const submitAddress = (event: FormEvent) => {
    event.preventDefault();
    sendCode(address);
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (!/^\d{6}$/.test(code)) {
      setError(new Error(STAND_IN_COPY.enterCode));
      return;
    }
    setError(null);
    verify.mutate(
      { id: pending.id, code },
      { onSuccess: () => setCode(""), onError: setError },
    );
  };

  const removeRecipient = (recipient: Recipient) => {
    setError(null);
    remove.mutate(recipient.id, {
      onSuccess: () => {
        setSentTo(null);
        setCode("");
      },
      onError: setError,
    });
  };

  const errorText = error && (
    <p className="field-error" id={errorId}>
      <span aria-hidden="true">⚠ </span>
      {error.message}
    </p>
  );
  // A missing provider key gets a way to the rung that takes it.
  const setup =
    error instanceof ApiProblem && error.body.error === "not-configured" ? (
      <button
        type="button"
        className="link"
        onClick={() => {
          onClose();
          document
            .getElementById(`rung-${SETUP_RUNG[channel].id}`)
            ?.scrollIntoView({ block: "start" });
        }}
      >
        {SETUP_RUNG[channel].text}
      </button>
    ) : null;

  const heading = (status: ReactNode) => (
    <div className="recipient-head">
      <span className="recipient-icon" aria-hidden="true">
        {channel === "email" ? "✉" : "📱"}
      </span>
      <div>
        <h3>{copy.heading}</h3>
        {status}
      </div>
    </div>
  );

  if (verified) {
    return (
      <section className="recipient" aria-label={copy.heading}>
        {heading(
          <>
            <span className="status-pill ok">
              <span aria-hidden="true">✓ </span>
              {STAND_IN_COPY.verified}
            </span>
            <p className="recipient-address mono">{verified.masked}</p>
          </>,
        )}
        <p className="help">{copy.verifiedHelp}</p>
        <button
          type="button"
          className="button quiet"
          disabled={remove.isPending}
          onClick={() => removeRecipient(verified)}
        >
          {copy.remove}
        </button>
        {errorText}
      </section>
    );
  }

  if (pending) {
    const checking = verify.isPending;
    return (
      <section className="recipient" aria-label={copy.heading}>
        {heading(
          <>
            <span className="status-pill waiting">{STAND_IN_COPY.waiting}</span>
            <p className="recipient-address mono">{pending.masked}</p>
          </>,
        )}
        <form className="recipient-form" onSubmit={submitCode} noValidate>
          <p className="help" id={helpId}>
            {copy.awaiting}
          </p>
          <div className="field">
            <label htmlFor={`${ids}-code`}>{STAND_IN_COPY.codeLabel}</label>
            <input
              id={`${ids}-code`}
              className="code-input mono"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              disabled={checking}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${helpId} ${errorId}` : helpId}
              // Pasted codes often carry spaces or dashes.
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            {errorText}
          </div>
          <div className="row">
            <button
              type="submit"
              className="button primary"
              disabled={checking}
            >
              {checking && <span className="spinner" aria-hidden="true" />}
              {checking ? STAND_IN_COPY.checkingCode : copy.verify}
            </button>
            {sentTo && (
              <button
                type="button"
                className="button quiet"
                disabled={checking || add.isPending}
                onClick={() => sendCode(sentTo)}
              >
                {add.isPending
                  ? STAND_IN_COPY.sendingCode
                  : STAND_IN_COPY.resend}
              </button>
            )}
            <button
              type="button"
              className="link"
              disabled={checking || remove.isPending}
              onClick={() => removeRecipient(pending)}
            >
              {copy.change}
            </button>
          </div>
        </form>
      </section>
    );
  }

  const sending = add.isPending;
  return (
    <section className="recipient empty" aria-label={copy.heading}>
      {heading(null)}
      <form className="recipient-form" onSubmit={submitAddress} noValidate>
        <div className="field">
          <label htmlFor={`${ids}-address`}>{copy.label}</label>
          <input
            id={`${ids}-address`}
            type={channel === "email" ? "email" : "tel"}
            autoComplete={channel === "email" ? "email" : "tel"}
            placeholder={copy.placeholder}
            value={address}
            readOnly={sending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${helpId} ${errorId}` : helpId}
            onChange={(event) => setAddress(event.target.value)}
          />
          <p className="help" id={helpId}>
            {copy.sendHelp}
          </p>
          {errorText}
          {setup}
        </div>
        <button type="submit" className="button primary" disabled={sending}>
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? STAND_IN_COPY.sendingCode : copy.send}
        </button>
      </form>
    </section>
  );
}
