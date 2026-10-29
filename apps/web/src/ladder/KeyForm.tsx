import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  PROVIDER_NAMES,
  UNLOCK_COPY,
  validateKeys,
  type AppState,
  type Provider,
  type Rung,
  type RungId,
  type UnlockRequest,
} from "@rengas/shared";
import { ApiProblem } from "../api/client.ts";
import { useUnlock } from "../api/queries.ts";
import { format } from "../format.ts";

type Values = Record<string, string>;

/** The key form on the next rung: real or pretend keys, Make one up, or the configured key. */
export function KeyForm({ rung, state }: { rung: Rung; state: AppState }) {
  const unlock = useUnlock();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Values>({});
  const [formError, setFormError] = useState<string | null>(null);

  const provider = rung.keys.find((key) => key.kind === "real")?.provider;
  const configured = provider
    ? state.keys.find(
        (k) => k.provider === provider && k.source === "configured",
      )
    : undefined;
  const busy = unlock.isPending;
  const checkingReal = busy && unlock.variables.body.mode === "real";

  // Focus the first invalid field once the form is enabled again.
  useEffect(() => {
    const first = rung.keys.find((key) => errors[key.id]);
    if (first)
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${first.id}"]`)
        ?.focus();
  }, [errors, rung.keys]);

  const send = (body: UnlockRequest) => {
    setFormError(null);
    unlock.mutate(
      { rungId: rung.id as RungId, body },
      {
        onError: (error) => {
          if (error instanceof ApiProblem && error.body.fieldErrors) {
            setErrors(error.body.fieldErrors);
          } else {
            setFormError(error.message);
          }
        },
      },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const shapeErrors = validateKeys(rung.keys, values);
    setErrors(shapeErrors);
    if (Object.keys(shapeErrors).length > 0) return;
    send(
      provider
        ? { mode: "real", keys: values }
        : { mode: "pretend", keys: values, madeUp: false },
    );
  };

  const makeOneUp = () => {
    const pick = Math.floor(Math.random() * (rung.keys[0]?.madeUp.length ?? 1));
    const madeUp = Object.fromEntries(
      rung.keys.map((key) => [key.id, key.madeUp[pick] ?? key.madeUp[0] ?? ""]),
    );
    setValues(madeUp);
    setErrors({});
    send({ mode: "pretend", keys: madeUp, madeUp: true });
  };

  return (
    <form ref={form} className="key-form" onSubmit={submit} noValidate>
      {rung.keys.map((key) => {
        const helpId = `${rung.id}-${key.id}-help`;
        const errorId = `${rung.id}-${key.id}-error`;
        const error = errors[key.id];
        return (
          <div className="field" key={key.id}>
            <label htmlFor={`${rung.id}-${key.id}`}>{key.label}</label>
            <input
              id={`${rung.id}-${key.id}`}
              name={key.id}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={key.placeholder}
              value={values[key.id] ?? ""}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${errorId} ${helpId}` : helpId}
              onChange={(event) =>
                setValues({ ...values, [key.id]: event.target.value })
              }
            />
            {error && (
              <p className="field-error" id={errorId}>
                <span aria-hidden="true">⚠ </span>
                {error}
              </p>
            )}
            <p className="help" id={helpId}>
              {key.kind === "real"
                ? format(UNLOCK_COPY.realKeyHelp, {
                    provider: PROVIDER_NAMES[key.provider],
                  })
                : "Any key-shaped text works. Shape check only. Nothing stored."}
            </p>
          </div>
        );
      })}
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <div className="row">
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {checkingReal && provider
                ? format(UNLOCK_COPY.checkingWith, {
                    provider: PROVIDER_NAMES[provider],
                  })
                : UNLOCK_COPY.verifying}
            </>
          ) : (
            `Unlock level ${rung.level}`
          )}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={makeOneUp}
        >
          {UNLOCK_COPY.makeOneUp}
        </button>
      </div>
      {configured && provider && (
        <ConfiguredKey
          provider={provider}
          hint={configured.hint}
          disabled={busy}
          onUnlock={() => send({ mode: "configured" })}
        />
      )}
    </form>
  );
}

function ConfiguredKey({
  provider,
  hint,
  disabled,
  onUnlock,
}: {
  provider: Provider;
  hint: string;
  disabled: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="configured">
      <p className="help">
        {format(UNLOCK_COPY.configuredHint, {
          provider: PROVIDER_NAMES[provider],
          hint,
        })}
      </p>
      <button
        type="button"
        className="button"
        disabled={disabled}
        onClick={onUnlock}
      >
        {UNLOCK_COPY.configuredButton}
      </button>
    </div>
  );
}
