import { HEADER, RUNGS, type AppState } from "@rengas/shared";
import { HqScene } from "./HqScene.tsx";
import { TicketCard } from "./TicketCard.tsx";

/** Title, ticket, the shop and both moods, with the ten-segment level meter. */
export function Stage({ state }: { state: AppState }) {
  const rung = RUNGS[state.currentLevel]!;
  return (
    <section className="stage" aria-labelledby="stage-title">
      <div className="stage-intro">
        <h2 id="stage-title" className="hero" tabIndex={-1}>
          Escalating, respectfully.
        </h2>
        <p className="hero-sub">{HEADER.subtitle}</p>
        <TicketCard ticket={state.ticket} />
      </div>
      <figure className="stage-scene">
        <HqScene level={rung.level} ticket={state.ticket.number} />
        <figcaption className="visually-hidden">
          The shop at level {rung.level}: {rung.scene}
        </figcaption>
      </figure>
      <MoodMeter
        level={rung.level}
        staff={rung.staffMood}
        sisu={rung.sisuMood}
      />
    </section>
  );
}

function MoodMeter({
  level,
  staff,
  sisu,
}: {
  level: number;
  staff: string;
  sisu: string;
}) {
  const total = RUNGS.length;
  return (
    <div className="moods">
      <p className="mood staff" aria-live="polite">
        <span className="mood-label">Rengas Online staff mood:</span>{" "}
        <strong data-testid="staff-mood">{staff}</strong>
      </p>
      <p className="mood sisu">
        <span className="mood-label">Sisu:</span>{" "}
        <strong data-testid="sisu-mood">{sisu}</strong>
      </p>
      <div className="meter-wrap">
        <p className="meter-text mono" id="meter-label">
          Level {String(level).padStart(2, "0")} / {total}
        </p>
        <div
          className="meter"
          role="meter"
          aria-labelledby="meter-label"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={level}
          aria-valuetext={`Level ${level} of ${total}: staff ${staff}`}
        >
          {RUNGS.map((r) => (
            <span
              key={r.id}
              className={r.level <= level ? "segment on" : "segment"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
