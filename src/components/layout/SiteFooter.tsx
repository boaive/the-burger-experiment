import Link from "next/link";
import { emailHref, site } from "@/content/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer} data-surface="dark">
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.sign}>
          <p className={styles.name}>{site.name}</p>
          <p className={styles.by}>A creative experiment by Boaive.</p>
        </div>

        <nav aria-label="Footer" className={styles.cols}>
          <ul role="list">
            <li>
              <Link href="/">Experience</Link>
            </li>
            <li>
              <Link href="/menu">Menu</Link>
            </li>
            <li>
              <Link href="/story">Story</Link>
            </li>
          </ul>
          <ul role="list">
            <li>
              <a href={site.contact.instagram.url} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={emailHref}>Email</a>
            </li>
          </ul>
        </nav>

        <p className={`t-ticket ${styles.legal}`}>© 2026 Boaive</p>
      </div>
    </footer>
  );
}
