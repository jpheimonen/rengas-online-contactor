import { FINDER_COPY, type FinderOption } from "@rengas/shared";
import { useId } from "react";

const sentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * One finder result. Everything in it came from the web or from the invented
 * examples, so it is only ever rendered as text, and its one button only
 * starts a simulated run.
 */
export function FinderCard({
  option,
  web,
  buttonLabel,
  buttonDisabled,
  onSimulate,
}: {
  option: FinderOption;
  web: boolean;
  buttonLabel: string;
  buttonDisabled: boolean;
  onSimulate: () => void;
}) {
  const nameId = useId();
  return (
    <article
      className={web ? "finder-card" : "finder-card example"}
      aria-labelledby={nameId}
    >
      {!web && (
        <p className="finder-card-tag mark mark-example">
          {FINDER_COPY.exampleCardLabel}
        </p>
      )}
      <h5 id={nameId} className="finder-card-name">
        {option.name}
      </h5>
      <p className="finder-card-offer">{option.offer}</p>
      <dl className="finder-card-facts">
        <div>
          <dt>Where</dt>
          <dd>{option.location}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{option.price ?? sentenceCase(FINDER_COPY.priceNotStated)}</dd>
        </div>
      </dl>
      <p className="finder-card-note">
        {web
          ? FINDER_COPY.webCardLabel
          : "Not a real business · not contacted · not booked"}
      </p>
      <div className="finder-card-foot">
        {web && option.sourceUrl && <SourceLink url={option.sourceUrl} />}
        <button
          type="button"
          className="button outline"
          disabled={buttonDisabled}
          aria-describedby={nameId}
          onClick={onSimulate}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}

/** Shows only the domain, so a long URL can't push the card sideways. */
function SourceLink({ url }: { url: string }) {
  const domain = new URL(url).hostname;
  return (
    <a
      className="finder-source"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View source on ${domain} (opens in a new tab)`}
    >
      <span>
        View source <span aria-hidden="true">↗</span>
      </span>
      <span className="mono finder-domain">{domain}</span>
    </a>
  );
}
