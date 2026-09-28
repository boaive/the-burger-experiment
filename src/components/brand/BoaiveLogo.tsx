import Image from "next/image";
import styles from "./BoaiveLogo.module.css";

type Props = {
  className?: string;
  /** Rendered CSS width hint for the image optimizer. */
  sizes?: string;
};

/**
 * The supplied Boaive logo (mark, wordmark and tagline), unaltered: a crop of the original
 * artwork on its own black. It only sits on dark surfaces. The image is `screen`-blended onto a
 * plate painted in the surface colour (`--logo-bg`), so its black dissolves into the page exactly,
 * whatever stacking context it lands in, without touching the letterforms or their proportions.
 */
export function BoaiveLogo({ className, sizes = "(max-width: 720px) 60vw, 360px" }: Props) {
  return (
    <span className={[styles.plate, className].filter(Boolean).join(" ")}>
      <Image className={styles.logo} src="/brand/boaive-lockup.webp" alt="Boaive" width={1016} height={400} sizes={sizes} quality={90} />
    </span>
  );
}
