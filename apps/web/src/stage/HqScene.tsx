/**
 * The fictional tyre shop. One drawing whose props change with the level
 * (visual guide, "HQ and mood progression"). It is decorative: the stage
 * caption says the same thing in words.
 */
export function HqScene({ level, ticket }: { level: number; ticket: string }) {
  const night = level === 4;
  const show = (...levels: number[]) => levels.includes(level);
  return (
    <svg
      className="hq"
      viewBox="0 0 480 220"
      aria-hidden="true"
      focusable="false"
      data-scene-level={level}
    >
      <rect
        className={night ? "hq-sky night" : "hq-sky"}
        x="0"
        y="0"
        width="480"
        height="200"
        rx="10"
      />
      {night ? (
        <g className="hq-moon">
          <circle cx="410" cy="40" r="16" />
          <circle className="hq-moon-cut" cx="418" cy="34" r="14" />
        </g>
      ) : (
        <g className="hq-sun">
          <circle cx="410" cy="42" r="14" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1="410"
              y1="20"
              x2="410"
              y2="14"
              transform={`rotate(${angle} 410 42)`}
            />
          ))}
        </g>
      )}
      <g className="hq-cloud">
        <path d="M70 46 q8 -14 22 -6 q10 -10 22 2 q12 0 10 12 h-58 q-6 -8 4 -8z" />
      </g>

      {/* Trees */}
      <g className="hq-tree">
        <path d="M44 196 v-26 M30 172 l14 -40 l14 40z" />
        <path d="M444 196 v-22 M432 176 l12 -34 l12 34z" />
      </g>

      {/* Building */}
      <g className="hq-building">
        <path d="M110 196 V96 L250 70 L390 96 V196" />
        <path d="M100 100 L250 64 L400 100" />
        <rect x="128" y="124" width="70" height="72" />
        <path d="M128 140 h70 M128 156 h70 M128 172 h70" />
        <rect x="216" y="130" width="46" height="66" />
        <rect x="282" y="122" width="88" height="40" />
        <path d="M326 122 v40" />
      </g>
      <g className={show(7) ? "hq-sign slipping" : "hq-sign"}>
        <rect x="196" y="88" width="108" height="22" rx="3" />
        {"TYRES".split("").map((letter, i) => (
          <text
            key={letter}
            x={214 + i * 18}
            y="104"
            className={show(7) && i === 3 ? "slip" : undefined}
          >
            {letter}
          </text>
        ))}
      </g>

      {/* Tyre stacks */}
      <g className="hq-tyres">
        {[0, 1, 2].map((i) => (
          <ellipse key={`l${i}`} cx="88" cy={190 - i * 10} rx="16" ry="6" />
        ))}
        {[0, 1].map((i) => (
          <ellipse key={`r${i}`} cx="410" cy={190 - i * 10} rx="16" ry="6" />
        ))}
      </g>
      <line className="hq-ground" x1="10" y1="197" x2="470" y2="197" />

      {/* Level props */}
      {show(1) && (
        <g className="hq-prop">
          <rect x="290" y="132" width="34" height="14" rx="2" />
          <text x="307" y="143" className="small">
            OPEN
          </text>
          <Person x={160} />
        </g>
      )}
      {show(2, 3) && (
        <g className="hq-prop envelopes">
          <Envelope x={226} y={182} />
          {show(3) &&
            [0, 1, 2, 3, 4].map((i) => (
              <Envelope key={i} x={206 + i * 12} y={170 + (i % 2) * 14} />
            ))}
          {show(2) && <path className="blind" d="M290 134 h30 M290 140 h22" />}
        </g>
      )}
      {show(3) && (
        <g className="hq-prop">
          <rect x="282" y="168" width="44" height="18" rx="2" />
          <text x="304" y="181" className="small">
            900
          </text>
        </g>
      )}
      {show(4) && (
        <g className="hq-prop">
          <circle className="clock" cx="350" cy="142" r="12" />
          <text x="350" y="146" className="small">
            03:00
          </text>
          <Phone x={292} y={142} />
        </g>
      )}
      {show(5) && (
        <g className="hq-prop ringing">
          <Bubble x={190} y={40} />
          <Bubble x={258} y={30} />
          <Bubble x={330} y={46} />
        </g>
      )}
      {show(6) && (
        <g className="hq-prop">
          <Bubble x={300} y={46} glyph="👍" />
          <Bubble x={350} y={60} glyph="♥" />
          <rect className="desk" x="290" y="176" width="70" height="20" />
          <path className="feet" d="M300 196 h10 M320 196 h10" />
        </g>
      )}
      {show(7) && (
        <g className="hq-prop">
          <circle className="glass" cx="352" cy="66" r="16" />
          <line className="glass" x1="364" y1="78" x2="382" y2="96" />
        </g>
      )}
      {show(8) && (
        <g className="hq-prop">
          {[0, 1, 2].map((i) => (
            <ellipse
              key={i}
              className="tyre"
              cx="239"
              cy={190 - i * 12}
              rx="20"
              ry="6"
            />
          ))}
          <Person x={300} clipboard />
        </g>
      )}
      {show(9) && (
        <g className="hq-prop blimp">
          <ellipse cx="200" cy="38" rx="56" ry="18" />
          <path d="M146 38 l-14 -10 v20z" />
          <rect x="262" y="28" width="120" height="18" rx="2" />
          <text x="322" y="41" className="small">
            TICKET #{ticket}: STILL OPEN
          </text>
          <path
            className="pigeons"
            d="M90 60 q5 -5 10 0 q5 -5 10 0 M120 74 q5 -5 10 0 q5 -5 10 0"
          />
          <rect className="van" x="400" y="176" width="54" height="18" rx="3" />
        </g>
      )}
      {show(10) && (
        <g className="hq-prop">
          <rect className="desk" x="282" y="172" width="80" height="24" />
          <rect
            className="sisu"
            x="306"
            y="146"
            width="24"
            height="24"
            rx="5"
          />
          <circle className="sisu-eye" cx="314" cy="156" r="2" />
          <circle className="sisu-eye" cx="322" cy="156" r="2" />
          <path className="sisu-eye" d="M313 162 q5 4 10 0" />
        </g>
      )}
    </svg>
  );
}

function Envelope({ x, y }: { x: number; y: number }) {
  return (
    <g className="envelope" transform={`translate(${x} ${y})`}>
      <rect width="16" height="11" rx="1" />
      <path d="M0 0 l8 6 l8 -6" />
    </g>
  );
}

function Bubble({
  x,
  y,
  glyph = "☎",
}: {
  x: number;
  y: number;
  glyph?: string;
}) {
  return (
    <g className="bubble" transform={`translate(${x} ${y})`}>
      <circle r="14" />
      <text y="5">{glyph}</text>
    </g>
  );
}

function Phone({ x, y }: { x: number; y: number }) {
  return (
    <g className="phone" transform={`translate(${x} ${y})`}>
      <rect width="22" height="12" rx="3" />
    </g>
  );
}

function Person({ x, clipboard = false }: { x: number; clipboard?: boolean }) {
  return (
    <g className="person" transform={`translate(${x} 160)`}>
      <circle cx="0" cy="0" r="5" />
      <path d="M0 5 v20 M0 12 l-8 6 M0 12 l8 6 M0 25 l-6 11 M0 25 l6 11" />
      {clipboard && <rect x="8" y="10" width="9" height="12" />}
    </g>
  );
}
