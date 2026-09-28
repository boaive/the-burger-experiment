"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Product } from "@/content/menu";
import { webglAvailable } from "@/scene/core/quality";
import type { ProductView } from "@/scene/products/ProductStudio";
import styles from "./ProductCard.module.css";

type Props = {
  product: Product;
  /** Card size: "feature" for burgers, "compact" for sides and drinks. */
  size?: "feature" | "compact";
  headingLevel?: "h2" | "h3";
};

/**
 * A menu item: a live 3D product (built from the same ingredients as the story) with one small
 * interaction. Hover with a mouse, tap on a phone, or use the button — all do the same thing.
 */
export function ProductCard({ product, size = "compact", headingLevel = "h3" }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLOListElement>(null);
  const viewRef = useRef<ProductView | null>(null);
  const openRef = useRef(false);
  const [open, setOpenState] = useState(false);
  const [live, setLive] = useState<"pending" | "ready">("pending");
  const isBurger = product.interaction === "explode";
  const Heading = headingLevel;

  /** One source of truth for burgers being taken apart. */
  const setOpen = (next: boolean) => {
    openRef.current = next;
    setOpenState(next);
    viewRef.current?.setOpen(next);
  };

  useEffect(() => {
    const visual = visualRef.current;
    const canvas = canvasRef.current;
    if (!visual || !canvas) return;
    if (!webglAvailable()) {
      // The rendered poster stays; nothing to load.
      if (cardRef.current) cardRef.current.dataset.live = "off";
      return;
    }
    let view: ProductView | null = null;
    let disposed = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || view) return;
        io.disconnect();
        import("@/scene/products/ProductStudio")
          .then((m) => m.getStudio())
          .then((studio) => {
            if (disposed) return;
            view = studio.attach(canvas, product);
            viewRef.current = view;
            view.onAnchors = (anchors, amount) => {
              const list = labelsRef.current;
              if (!list) return;
              list.style.setProperty("--open", amount.toFixed(3));
              anchors.forEach((a, i) => {
                const li = list.children[i] as HTMLElement | undefined;
                if (li) li.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
              });
            };
            setLive("ready");
          })
          .catch(() => {
            if (cardRef.current) cardRef.current.dataset.live = "off";
          });
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(visual);
    const ro = new ResizeObserver(() => view?.resize());
    ro.observe(canvas);

    /* Mouse: hover plays, the pointer turns the product. Touch: tap plays, sideways drag turns it. */
    let touch: { x: number; y: number; dragging: boolean } | null = null;
    const rel = (e: PointerEvent) => {
      const r = visual.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 2 - 1;
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !view) return;
      if (isBurger) setOpen(true);
      else view.poke(1);
    };
    const onMove = (e: PointerEvent) => {
      if (!view) return;
      if (e.pointerType === "mouse") view.setPointer(rel(e));
      else if (touch) {
        const dx = e.clientX - touch.x;
        const dy = e.clientY - touch.y;
        if (!touch.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) touch.dragging = true;
        if (touch.dragging) {
          view.drag(dx);
          touch.x = e.clientX;
          touch.y = e.clientY;
        }
      }
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !view) return;
      view.setPointer(null);
      if (isBurger) setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") touch = { x: e.clientX, y: e.clientY, dragging: false };
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !touch) return;
      const wasDrag = touch.dragging;
      touch = null;
      if (wasDrag || !view) return;
      if (isBurger) setOpen(!openRef.current);
      else view.poke(1);
    };
    visual.addEventListener("pointerenter", onEnter);
    visual.addEventListener("pointermove", onMove);
    visual.addEventListener("pointerleave", onLeave);
    visual.addEventListener("pointerdown", onDown);
    visual.addEventListener("pointerup", onUp);
    visual.addEventListener("pointercancel", () => (touch = null));

    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      visual.removeEventListener("pointerenter", onEnter);
      visual.removeEventListener("pointermove", onMove);
      visual.removeEventListener("pointerleave", onLeave);
      visual.removeEventListener("pointerdown", onDown);
      visual.removeEventListener("pointerup", onUp);
      view?.dispose();
      viewRef.current = null;
    };
  }, [product, isBurger]);

  const onButton = () => {
    if (isBurger) setOpen(!openRef.current);
    else viewRef.current?.poke(1);
  };

  return (
    <article ref={cardRef} className={styles.card} data-size={size} data-live={live} data-open={open || undefined}>
      <div ref={visualRef} className={styles.visual}>
        <picture className={styles.poster}>
          <img src={`/menu/${product.id}.webp`} alt="" loading="lazy" decoding="async" width={720} height={900} />
        </picture>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {isBurger && product.layers ? (
          <ol ref={labelsRef} className={styles.layers} aria-label={`What's in the ${product.name}`}>
            {product.layers.map((l, i) => (
              <li key={`${l}-${i}`} style={{ "--i": i } as CSSProperties}>
                <span>{l}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <Heading className={`t-display ${styles.name}`}>{product.name}</Heading>
          <span className={styles.leader} aria-hidden="true" />
          <span className={styles.price}>
            <span className="visually-hidden">Price: </span>
            {product.price}
          </span>
        </div>
        <p className={styles.description}>{product.description}</p>
        <button type="button" className={styles.action} onClick={onButton} aria-pressed={isBurger ? open : undefined} disabled={live !== "ready"}>
          {isBurger && open ? "Put it back together" : product.hint}
          <span aria-hidden="true" className={styles.actionMark} />
        </button>
      </div>
    </article>
  );
}
