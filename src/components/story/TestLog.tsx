import { storyPage } from "@/content/brand";
import styles from "./TestLog.module.css";

/** A page from the lab notebook: the failed tests are part of the story. */
export function TestLog() {
  const { title, entries, signoff } = storyPage.testLog;
  return (
    <figure className={styles.log} data-reveal>
      <figcaption className={styles.head}>
        <span>{title}</span>
        <span>Exp. 001</span>
      </figcaption>
      <ol className={styles.entries}>
        {entries.map((e) => (
          <li key={e.n} data-pass={e.pass || undefined}>
            <span className={styles.n}>#{e.n}</span>
            <span className={styles.text}>{e.text}</span>
            <span className={styles.mark} aria-label={e.pass ? "passed" : "failed"}>
              {e.pass ? "✓" : "✕"}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.signoff}>{signoff}</p>
    </figure>
  );
}
