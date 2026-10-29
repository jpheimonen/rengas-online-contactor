import { useState, type FormEvent } from "react";
import type { AppState } from "@rengas/shared";
import { ApiProblem } from "../api/client.ts";
import { useSaveTicket } from "../api/queries.ts";

type Ticket = AppState["ticket"];

/** The case Sisu is escalating. Edit keeps typed values if saving fails. */
export function TicketCard({ ticket }: { ticket: Ticket }) {
  const [draft, setDraft] = useState<Ticket | null>(null);
  const save = useSaveTicket();

  if (!draft) {
    return (
      <div className="ticket">
        <p>
          <span className="mono">#{ticket.number}</span> · {ticket.complaint}
          <span className="ticket-sign">Signed: {ticket.customer}</span>
        </p>
        <button
          type="button"
          className="button small"
          onClick={() => {
            save.reset();
            setDraft(ticket);
          }}
          aria-label="Edit ticket"
        >
          Edit
        </button>
      </div>
    );
  }

  const fieldErrors =
    save.error instanceof ApiProblem ? (save.error.body.fieldErrors ?? {}) : {};
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(draft, { onSuccess: () => setDraft(null) });
  };
  const field = (
    name: keyof Ticket,
    label: string,
    maxLength: number,
    extra: { inputMode?: "numeric" } = {},
  ) => (
    <div className="field">
      <label htmlFor={`ticket-${name}`}>{label}</label>
      <input
        id={`ticket-${name}`}
        value={draft[name]}
        maxLength={maxLength}
        required
        aria-invalid={fieldErrors[name] ? true : undefined}
        aria-describedby={
          fieldErrors[name] ? `ticket-${name}-error` : undefined
        }
        onChange={(event) => setDraft({ ...draft, [name]: event.target.value })}
        {...extra}
      />
      {fieldErrors[name] && (
        <p className="field-error" id={`ticket-${name}-error`}>
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form className="ticket-form" onSubmit={submit} aria-label="Edit ticket">
      {field("number", "Ticket number", 8, { inputMode: "numeric" })}
      {field("complaint", "Complaint", 120)}
      {field("customer", "Sign as", 40)}
      {save.error && (
        <p className="form-error" role="alert">
          {save.error.message}
        </p>
      )}
      <div className="row">
        <button
          type="submit"
          className="button primary"
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="button" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
