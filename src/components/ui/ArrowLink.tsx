import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ArrowLink.module.css";

type Props = {
  href: string;
  children: ReactNode;
  /** Opens in a new tab and points the arrow up-right. */
  external?: boolean;
  className?: string;
  onClick?: () => void;
};

export function Arrow({ diagonal = false, className }: { diagonal?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="12"
      viewBox="0 0 16 12"
      fill="none"
      aria-hidden="true"
      style={diagonal ? { rotate: "-45deg" } : undefined}
    >
      <path d="M1 6h13.2M9.2 1.2 14.2 6l-5 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small uppercase text link with an arrow that leans forward on hover. */
export function ArrowLink({ href, children, external = false, className, onClick }: Props) {
  const cls = [styles.link, className].filter(Boolean).join(" ");
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      <Arrow diagonal={external} className={styles.arrow} />
    </>
  );

  if (external) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {inner}
      </a>
    );
  }
  if (href.startsWith("#") || href.startsWith("mailto:")) {
    return (
      <a className={cls} href={href} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <Link className={cls} href={href} onClick={onClick}>
      {inner}
    </Link>
  );
}
