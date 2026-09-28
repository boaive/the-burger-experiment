import type { Metadata } from "next";
import Image from "next/image";
import { HouseRules } from "@/components/story/HouseRules";
import { LayerLaneMap } from "@/components/story/LayerLaneMap";
import { QuietTimer } from "@/components/story/QuietTimer";
import { TestLog } from "@/components/story/TestLog";
import { reviews, storyPage, visit } from "@/content/brand";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Our Story",
  description: "A small, imaginary burger joint with one rule: every layer has to earn its place. The story, beliefs and fictional regulars of Boaive's Burger Experiment.",
  alternates: { canonical: "/story" },
};

export default function StoryPage() {
  const { origin, why, beliefs } = storyPage;
  return (
    <main id="main" className={styles.page}>
      {/* ── Opening ───────────────────────────────────────────────────────── */}
      <header className={`wrap ${styles.hero}`}>
        <div className={styles.heroText}>
          <p className="t-ticket" data-reveal>
            {storyPage.label}
          </p>
          <h1 className={`t-display ${styles.heroTitle}`} data-reveal>
            {storyPage.title}
          </h1>
          <p className={`t-lede ${styles.heroLede}`} data-reveal data-reveal-delay="120">
            {storyPage.lede}
          </p>
        </div>
        <figure className={styles.heroFigure} data-reveal data-reveal-delay="200">
          <Image
            src="/story/house-special.webp"
            alt="The House Special: a sesame brioche burger with lettuce, tomato, red onion, pickles and melted cheese."
            width={900}
            height={850}
            sizes="(max-width: 860px) 80vw, 38vw"
            preload
          />
          <figcaption className="t-ticket">No. 04 · House Special</figcaption>
        </figure>
      </header>

      {/* ── How it started ────────────────────────────────────────────────── */}
      <section className={`wrap ${styles.split}`} aria-labelledby="origin-title">
        <div className={styles.side}>
          <p className={`t-ticket ${styles.label}`}>{origin.label}</p>
          <TestLog />
        </div>
        <div className={styles.splitBody}>
          <h2 id="origin-title" className={`t-display ${styles.h2}`} data-reveal>
            {origin.title}
          </h2>
          <div className={styles.prose}>
            {origin.paragraphs.map((p, i) => (
              <p key={i} data-reveal data-reveal-delay={String(i * 80)} className={i === origin.paragraphs.length - 1 ? styles.aside : undefined}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why we make it ────────────────────────────────────────────────── */}
      <section className={styles.why} aria-labelledby="why-title">
        <div className={`wrap ${styles.whyGrid}`}>
          <p id="why-title" className={`t-ticket ${styles.label}`}>
            {why.label}
          </p>
          <div className={styles.whyMain}>
            <blockquote className={`t-display ${styles.quote}`} data-reveal>
              {why.quote}
            </blockquote>
            <p className={styles.whyText} data-reveal data-reveal-delay="120">
              {why.paragraph}
            </p>
          </div>
          <div className={styles.whyTimer}>
            <QuietTimer label={why.timer} />
          </div>
        </div>
      </section>

      {/* ── What we believe ───────────────────────────────────────────────── */}
      <section className={`wrap ${styles.beliefs}`} aria-labelledby="beliefs-title">
        <div className={styles.side}>
          <h2 id="beliefs-title" className={`t-ticket ${styles.label}`}>
            {beliefs.label}
          </h2>
          <HouseRules />
        </div>
        <ol className={styles.beliefList}>
          {beliefs.items.map((b, i) => (
            <li key={b.title} data-reveal data-reveal-delay={String((i % 2) * 90)}>
              <span className={`t-ticket ${styles.beliefNum}`}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={`t-display ${styles.beliefTitle}`}>{b.title}</h3>
              <p>{b.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────────── */}
      <section className={styles.reviews} aria-labelledby="reviews-title">
        <div className="wrap">
          <div className={styles.reviewsHead}>
            <h2 id="reviews-title" className={`t-display ${styles.h2}`} data-reveal>
              {reviews.label}
            </h2>
            <p className="t-ticket" data-reveal>
              {reviews.note}
            </p>
          </div>
          <ul role="list" className={styles.reviewList}>
            {reviews.items.map((r, i) => (
              <li key={r.quote} data-reveal data-reveal-delay={String((i % 3) * 90)}>
                <figure>
                  <blockquote>&ldquo;{r.quote}&rdquo;</blockquote>
                  <figcaption className="t-ticket">— {r.who}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Location & hours ──────────────────────────────────────────────── */}
      <section className={`wrap ${styles.visit}`} aria-labelledby="visit-title">
        <div className={styles.visitText}>
          <h2 id="visit-title" className={`t-display ${styles.h2}`} data-reveal>
            {visit.label}
          </h2>
          <address className={styles.address} data-reveal>
            {visit.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
          <table className={styles.hours} data-reveal>
            <caption className="visually-hidden">Opening hours</caption>
            <tbody>
              {visit.hours.map((h) => (
                <tr key={h.days}>
                  <th scope="row">{h.days}</th>
                  <td>{h.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.visitNote} data-reveal>
            {visit.note}
          </p>
        </div>
        <div className={styles.map} data-reveal data-reveal-delay="120">
          <LayerLaneMap />
        </div>
      </section>
    </main>
  );
}
