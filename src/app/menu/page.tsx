import type { Metadata } from "next";
import { ProductCard } from "@/components/menu/ProductCard";
import { TicketRail } from "@/components/menu/TicketRail";
import { menu } from "@/content/menu";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Menu",
  description: "Four burgers, three sides, four cold drinks. The fictional menu of Boaive's Burger Experiment, every item built in 3D from the same ingredients as the story.",
  alternates: { canonical: "/menu" },
};

export default function MenuPage() {
  return (
    <main id="main" className={styles.page}>
      <header className={`wrap ${styles.intro}`}>
        <div className={styles.introText}>
          <p className="t-ticket" data-reveal>
            The menu
          </p>
          <h1 className={`t-display ${styles.title}`} data-reveal>
            Four burgers. A few sides. Cold drinks. That&rsquo;s it.
          </h1>
          <p className={`t-lede ${styles.lede}`} data-reveal data-reveal-delay="100">
            Everything is made to order, one layer at a time. Hover over anything, or tap it, to see how it&rsquo;s put together.
          </p>
        </div>
        <div className={styles.introRail} data-reveal data-reveal-delay="160">
          <TicketRail categories={menu} />
        </div>
        <p className={`t-ticket ${styles.fine}`} data-reveal data-reveal-delay="220">
          Prices are fictional, like the restaurant.
        </p>
      </header>

      {menu.map((category, ci) => (
        <section key={category.id} id={category.id} className={styles.category} aria-labelledby={`${category.id}-title`}>
          <div className="wrap">
            <header className={styles.categoryHead}>
              <span className={`t-ticket ${styles.index}`}>{String(ci + 1).padStart(2, "0")}</span>
              <h2 id={`${category.id}-title`} className={`t-display ${styles.categoryTitle}`} data-reveal>
                {category.title}
              </h2>
              <p className={styles.categoryNote} data-reveal data-reveal-delay="80">
                {category.note}
              </p>
            </header>
            <div className={styles.grid} data-kind={category.id}>
              {category.products.map((p, i) => (
                <div key={p.id} data-reveal data-reveal-delay={String(i * 90)}>
                  <ProductCard product={p} size={category.id === "burgers" ? "feature" : "compact"} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
