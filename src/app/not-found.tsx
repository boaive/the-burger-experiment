import { ArrowLink } from "@/components/ui/ArrowLink";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main" className={`wrap ${styles.page}`}>
      <p className="t-ticket">Error 404 · Order not found</p>
      <h1 className="t-display">This layer isn&rsquo;t on the menu.</h1>
      <p className={styles.text}>The page you were looking for doesn&rsquo;t exist. Much like the restaurant.</p>
      <div className={styles.links}>
        <ArrowLink href="/">Back to the experience</ArrowLink>
        <ArrowLink href="/menu">See the menu</ArrowLink>
      </div>
    </main>
  );
}
