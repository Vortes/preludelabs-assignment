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
              <button type="button" className={`${styles.orb} ${styles.imageControl}`} aria-label={`Lens ${i + 1} aura`}>
                <Image
                  src="/figma/orb.png"
                  alt="Lens aura"
                  width={56}
                  height={60}
                  unoptimized
                />
              </button>
              <IconControl name={i === 0 ? "chevron-up" : "chevron-down"} label={`${i === 0 ? "Collapse" : "Expand"} lens ${i + 1}`} />
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
                  <button type="button" className={`${styles.sources} ${styles.imageControl}`}>
                    <Image
                      src="/figma/sources.png"
                      alt="Sources"
                      width={52}
                      height={32}
                      unoptimized
                    />
                    <span>Show sources</span>
                  </button>
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
          <button type="button" className={styles.action}>
            <span className={styles.shortcut}>1</span>
            <span className={styles.actionLabel}>Accept all insights and continue</span>
            <span className={styles.iconControl} aria-hidden="true"><FigmaIcon name="arrow-right" /></span>
          </button>
          <div className={styles.actionGroup}>
            {([
              ["Edit the references", "pencil"],
              ["Generate more connections", "loop"],
            ] as const).map(([label, icon], index) => (
              <button type="button" className={styles.action} key={label}>
                <span className={styles.shortcut}>{index + 2}</span>
                <span className={styles.actionLabel}>{label}</span>
                <span className={styles.iconControl} aria-hidden="true"><FigmaIcon name={icon} /></span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.input}>
          <textarea
            className={styles.chatInput}
            aria-label="Message Prelude"
            placeholder="Talk to Prelude…"
            rows={1}
          />
          <div className={styles.composerTools}>
            <div className={styles.composerLeft}>
              <button type="button" className={`${styles.composerOrb} ${styles.imageControl}`} aria-label="Prelude aura">
                <Image
                  src="/figma/composer-orb.png"
                  alt="Prelude aura"
                  width={64}
                  height={64}
                  unoptimized
                />
              </button>
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
