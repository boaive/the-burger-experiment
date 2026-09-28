import { ArrowLink } from "@/components/ui/ArrowLink";
import { reviews } from "@/content/brand";
import styles from "./ReviewsTeaser.module.css";

/** Three lines from imaginary regulars — and the page says so. */
export function ReviewsTeaser() {
  return (
    <section className={styles.section} data-surface="light" aria-labelledby="reviews-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="reviews-title" className="t-ticket" data-reveal>
            {reviews.label}
          </h2>
          <p className={styles.note} data-reveal data-reveal-delay="80">
            {reviews.note}
          </p>
        </header>
        <ul role="list" className={styles.list}>
          {reviews.items.slice(0, 3).map((r, i) => (
            <li key={r.quote} data-reveal data-reveal-delay={String(i * 110)}>
              <figure className={styles.review}>
                <blockquote className="t-display">{r.quote}</blockquote>
                <figcaption className="t-ticket">— {r.who}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <div className={styles.foot} data-reveal>
          <ArrowLink href="/story">Read the whole story</ArrowLink>
        </div>
      </div>
    </section>
  );
}
