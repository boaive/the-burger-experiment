import styles from "./HouseRules.module.css";

/** A diner's enamel sign, hung on two screws. It rocks a little when you reach for it. */
export function HouseRules() {
  return (
    <div className={styles.wrap} data-reveal>
      <div className={styles.sign}>
        <span className={styles.screw} aria-hidden="true" />
        <span className={styles.screw} aria-hidden="true" />
        <span className={styles.screw} aria-hidden="true" />
        <span className={styles.screw} aria-hidden="true" />
        <p className={styles.small}>Est. in theory</p>
        <p className={styles.big}>House Rules</p>
        <p className={styles.small}>8 Layer Lane</p>
      </div>
    </div>
  );
}
