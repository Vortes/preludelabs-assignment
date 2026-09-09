import Image from "next/image";
import { FigmaIcon, IconControl } from "./figma-icon";
import styles from "./interface.module.css";
import glass from "./glass-surface.module.css";

export function ConversationPanel() {
  return (
    <>
      <div className={styles.conversation}>
        {[
          "The category’s aesthetic contract",
          "Body-neutral realists",
          "A different perspective",
        ].map((title, i) => (
          <article
            data-glass-highlight="light"
            key={title}
            className={`${styles.card} ${glass.surface} ${glass.card}`}
          >
            <div className={styles.cardHeader}>
              <Image
                className={styles.thumbnail}
                src={`/figma/lenses/asset-${String(i + 1).padStart(2, "0")}.png`}
                alt={`Lens ${i + 1}`}
                width={80}
                height={80}
              />
              <div className={styles.cardHeading}>
                <p className={styles.eyebrow}>Lens {i + 1}</p>
                <h2 className={styles.cardTitle}>{title}</h2>
              </div>
              <span className={styles.orb}>
                <Image
                  src="/figma/orb.png"
                  alt="Lens aura"
                  width={56}
                  height={60}
                  unoptimized
                />
              </span>
              <FigmaIcon name={i === 0 ? "chevron-up" : "chevron-down"} />
            </div>
            {i === 0 && (
              <>
                <div className={styles.tabs}>
                  <span>Overview</span>
                  <span>Purpose</span>
                  <span>Inspiration</span>
                </div>
                <p className={styles.body}>
                  Since 2004, Dove’s &apos;real beauty&apos; campaigns have
                  faced criticism for seeming manipulative and contradictory, as
                  they promote inner beauty while imposing narrow physical
                  standards.
                </p>
                <div className={styles.cardFooter}>
                  <div className={styles.cardUtilities}>
                    <IconControl name="share" label="Share insight" />
                    <IconControl name="copy" label="Copy insight" />
                    <IconControl name="refresh" label="Refresh insight" />
                  </div>
                  <div className={styles.sources}>
                    <Image
                      src="/figma/sources.png"
                      alt="Sources"
                      width={52}
                      height={32}
                      unoptimized
                    />
                    <span>Show sources</span>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <div
        className={`${styles.composer} ${glass.surface} ${glass.composer}`}
        data-glass-highlight="light"
        data-glass-occluder="true"
        aria-label="Chat composer"
      >
        <div className={styles.actions}>
          {(
            [
              ["Accept all insights and continue", "arrow-right"],
              ["Edit the references", "pencil"],
              ["Generate more connections", "loop"],
            ] as const
          ).map(([label, icon], index) => (
            <div className={styles.action} key={label}>
              <span className={styles.shortcut}>{index + 1}</span>
              <span className={styles.actionLabel}>{label}</span>
              <IconControl name={icon} label={label} />
            </div>
          ))}
        </div>
        <div className={styles.input}>
          <span>Talk to Prelude…</span>
          <div className={styles.composerTools}>
            <div className={styles.composerLeft}>
              <span className={styles.composerOrb}>
                <Image
                  src="/figma/composer-orb.png"
                  alt="Prelude aura"
                  width={64}
                  height={64}
                  unoptimized
                />
              </span>
              <IconControl name="plus" label="Add attachment" />
            </div>
            <IconControl name="voice" label="Voice input" />
          </div>
        </div>
      </div>
      <div className={styles.handle} />
    </>
  );
}
