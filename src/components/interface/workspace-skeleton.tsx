import styles from "./workspace-skeleton.module.css";

export function WorkspaceSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading workspace">
      <div className={styles.panel} aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div className={styles.card} key={item}>
            <div className={styles.row}><i /><div><b /><b /></div></div>
            {item === 0 && <div className={styles.lines}><b /><b /><b /><b /></div>}
          </div>
        ))}
        <div className={styles.composer}><b /><b /><b /></div>
      </div>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.navigation}><i /><i /><i /></div>
        <div className={styles.artwork} />
        <div className={styles.footer} />
      </div>
    </div>
  );
}
