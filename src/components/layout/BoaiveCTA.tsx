import { BoaiveLogo } from "@/components/brand/BoaiveLogo";
import { Arrow } from "@/components/ui/ArrowLink";
import { emailHref, site } from "@/content/site";
import styles from "./BoaiveCTA.module.css";

/** The closing section of every page: the fictional brand hands over to the studio that made it. */
export function BoaiveCTA() {
  return (
    <section id="contact" className={styles.cta} data-surface="dark" aria-labelledby="contact-title">
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.head}>
          <div className={styles.maker} data-reveal>
            <span className="t-ticket">Made by</span>
            <BoaiveLogo className={styles.logo} sizes="(max-width: 720px) 180px, 240px" />
          </div>

          <h2 id="contact-title" className={`t-display ${styles.title}`} data-reveal>
            Have a brand that deserves more than a template?
          </h2>
          <p className={`t-lede ${styles.lede}`} data-reveal data-reveal-delay="120">
            Let&rsquo;s build something memorable.
          </p>
        </div>

        <ul role="list" className={styles.channels}>
          <li data-reveal data-reveal-delay="80">
            <a className={styles.channel} href={site.contact.instagram.url} target="_blank" rel="noopener noreferrer">
              <span className={`t-ticket ${styles.kind}`}>Instagram</span>
              <span className={styles.value}>{site.contact.instagram.handle}</span>
              <Arrow diagonal className={styles.arrow} />
            </a>
          </li>
          <li data-reveal data-reveal-delay="160">
            <a className={styles.channel} href={emailHref}>
              <span className={`t-ticket ${styles.kind}`}>Email</span>
              <span className={styles.value}>{site.contact.email}</span>
              <Arrow className={styles.arrow} />
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
