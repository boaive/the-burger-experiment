import styles from "./QuietTimer.module.css";

/**
 * A kitchen timer counting out the one minute the copy talks about. The hand sweeps once a
 * minute (compositor-only rotation) and simply rests at twelve with reduced motion.
 */
export function QuietTimer({ label }: { label: string }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <figure className={styles.timer} data-reveal>
      <svg viewBox="0 0 200 200" aria-hidden="true" className={styles.dial}>
        <circle cx="100" cy="100" r="92" className={styles.face} />
        {ticks.map((i) => (
          <line
            key={i}
            x1="100"
            y1={i % 5 === 0 ? 16 : 20}
            x2="100"
            y2="26"
            className={i % 5 === 0 ? styles.major : styles.minor}
            transform={`rotate(${i * 6} 100 100)`}
          />
        ))}
        {[0, 15, 30, 45].map((s) => (
          <text key={s} x="100" y="44" className={styles.num} transform={`rotate(${s * 6} 100 100) rotate(${-s * 6} 100 44)`}>
            {s === 0 ? "60" : s}
          </text>
        ))}
        <g className={styles.hand}>
          <line x1="100" y1="112" x2="100" y2="30" />
          <circle cx="100" cy="100" r="6" />
        </g>
        <circle cx="100" cy="100" r="2.2" className={styles.pin} />
      </svg>
      <figcaption>
        <span className="t-ticket">1:00</span>
        <span>{label}</span>
      </figcaption>
    </figure>
  );
}
