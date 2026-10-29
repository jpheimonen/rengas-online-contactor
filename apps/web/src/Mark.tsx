import { LABELS } from "@rengas/shared";

export type MarkKind = keyof typeof LABELS | "system";

/**
 * A mode or provenance label such as SIMULATED or REAL. The meaning is in the
 * title and in the activity legend, so it is not only on hover.
 */
export function Mark({ kind, id }: { kind: MarkKind; id?: string }) {
  const label =
    kind === "system"
      ? { text: "SYSTEM", meaning: "A notice from the app." }
      : LABELS[kind];
  return (
    <span id={id} className={`mark mark-${kind}`} title={label.meaning}>
      {label.text}
    </span>
  );
}
