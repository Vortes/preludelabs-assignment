import Image from "next/image";
import { IconControl } from "./figma-icon";
import styles from "./interface.module.css";

export function WorkspaceNavigation() {
  return (
    <>
      <div className={`${styles.navPill} ${styles.homePill}`}>
        <span className={styles.monogram}>P</span>
        <IconControl name="message" label="Message" />
      </div>
      <div className={`${styles.tabs} ${styles.workspaceTabs}`}>
        <span data-glass-highlight="light">Content</span>
        <span data-glass-highlight="light">Details</span>
        <span data-glass-highlight="light">Links</span>
      </div>
      <div className={`${styles.navPill} ${styles.accountPill}`}>
        <IconControl name="share" label="Share" />
        <Image
          className={styles.avatar}
          src="/figma/profile.png"
          alt="Profile"
          width={32}
          height={32}
        />
      </div>
    </>
  );
}
