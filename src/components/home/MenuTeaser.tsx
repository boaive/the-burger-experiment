import { ProductCard } from "@/components/menu/ProductCard";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { productById, teaserProductIds } from "@/content/menu";
import styles from "./MenuTeaser.module.css";

/** After the film: the fictional restaurant opens its doors. */
export function MenuTeaser() {
  const products = teaserProductIds.map(productById);
  return (
    <section id="after-story" className={styles.section} data-surface="light" aria-labelledby="teaser-title">
      <div className="wrap">
        <header className={styles.head}>
          <p className="t-ticket" data-reveal>
            From the menu
          </p>
          <h2 id="teaser-title" className={`t-display ${styles.title}`} data-reveal>
            Hungry after all that?
          </h2>
          <div className={styles.headAside} data-reveal data-reveal-delay="120">
            <p>Everything on the menu is built the same way: one layer at a time, and none of it by accident.</p>
            <ArrowLink href="/menu">Explore the menu</ArrowLink>
          </div>
        </header>
        <div className={styles.grid}>
          {products.map((p, i) => (
            <div key={p.id} data-reveal data-reveal-delay={String(i * 100)}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
