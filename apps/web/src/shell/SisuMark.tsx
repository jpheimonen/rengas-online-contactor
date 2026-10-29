/** Sisu's small square face, used in the header and on narration lines. */
export function SisuMark() {
  return (
    <svg
      className="sisu-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" />
      <circle cx="11" cy="13" r="2.5" />
      <circle cx="21" cy="13" r="2.5" />
      <path d="M10 20 q6 5 12 0" />
    </svg>
  );
}
