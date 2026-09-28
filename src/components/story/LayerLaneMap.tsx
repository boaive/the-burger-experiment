/**
 * A small drawn map of a street that doesn't exist. Ink on paper, like the back of a menu.
 */
export function LayerLaneMap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 260" role="img" aria-labelledby="map-title map-desc">
      <title id="map-title">Map of Layer Lane</title>
      <desc id="map-desc">
        A hand-drawn street map. Layer Lane runs across the middle, crossed by Brioche Row and Pickle Alley, with Cheddar Cross to the south. A red pin marks number 8.
      </desc>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* blocks */}
        <g strokeWidth="1" opacity="0.28">
          <path d="M18 22h92v74H18zM140 22h92v74h-92zM262 22h80v74h-80zM18 150h92v88H18zM140 150h92v88h-92zM262 150h80v88h-80z" />
        </g>
        {/* streets */}
        <g strokeWidth="2.2" opacity="0.85">
          <path d="M6 123c90-3 250 3 348-2" />
          <path d="M125 8c-2 80 2 170 0 246" />
          <path d="M247 8c3 60-2 120 1 246" />
          <path d="M6 245c110-6 230 2 348-3" opacity="0.5" />
        </g>
      </g>
      <g fill="currentColor" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1.1">
        <text x="20" y="116">LAYER LANE</text>
        <text x="131" y="42" transform="rotate(90 131 42)">BRIOCHE ROW</text>
        <text x="253" y="160" transform="rotate(90 253 160)">PICKLE ALLEY</text>
        <text x="262" y="236" opacity="0.6">CHEDDAR CROSS</text>
      </g>
      {/* No. 8 */}
      <g transform="translate(196 123)">
        <circle r="13" fill="none" stroke="var(--tomato)" strokeWidth="1.2" opacity="0.5" />
        <circle r="5.5" fill="var(--tomato)" />
        <text x="0" y="-20" textAnchor="middle" fill="var(--tomato)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="1">
          NO. 8
        </text>
      </g>
    </svg>
  );
}
