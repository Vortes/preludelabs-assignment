import { FigmaIcon, IconControl } from "./figma-icon";
import styles from "./interface.module.css";

export function InsightCallout() {
  return (
    <>
      <p className={styles.detailTitle}>
        <FigmaIcon name="aperture" />
        Aesthetic contrast
      </p>
      <p className={styles.detailBody}>
        The &quot;Real Beauty&quot; formula has become a predictable
        performance.
      </p>
      <div className={styles.calloutTools}>
        <IconControl name="reload" label="Regenerate insight" />
      </div>
    </>
  );
}
