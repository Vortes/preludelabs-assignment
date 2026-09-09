"use client";

import { useState } from "react";
import Image from "next/image";
import { FigmaIcon, IconControl } from "./figma-icon";
import styles from "./interface.module.css";
import glass from "./glass-surface.module.css";

const lenses = [
  {
    title: "The category’s aesthetic contract",
    body: "Since 2004, Dove’s ‘real beauty’ campaigns have faced criticism for seeming manipulative and contradictory, as they promote inner beauty while imposing narrow physical standards.",
    takeaway:
      "What if the campaign stopped asking people to feel beautiful, and started showing what feeling comfortable in their own skin makes possible?",
  },
  {
    title: "Body-neutral realists",
    body: "Not every day needs to be a good body day. A body-neutral perspective leaves room for ordinary routines, mixed feelings, and a relationship with care that does not depend on loving your reflection.",
    takeaway:
      "Show care as something people deserve without first having to feel confident. Everyday gestures can carry the story: getting ready, resting, or stepping outside.",
  },
  {
    title: "A different perspective",
    body: "Beauty advertising often makes the mirror the centre of the story. Moving the camera beyond it opens up a different set of images: movement, touch, friendship, and the small details of a life being lived.",
    takeaway:
      "Let the product support the moment. Explore candid framing, tactile close-ups, and natural light, with less emphasis on a polished reveal.",
  },
];

export function ConversationPanel() {
  const [expanded, setExpanded] = useState(() => lenses.map(() => true));
  return (
    <>
      <div className={styles.conversation}>
        <div className={styles.userMessage}>
          <p className={styles.messageAuthor}>You</p>
          <p>
            Help me explore a new direction for Dove. I want to move beyond the
            usual “real beauty” story and find something that feels closer to
            everyday life.
          </p>
        </div>
        <div className={styles.assistantMessage}>
          <p className={styles.messageAuthor}>Prelude</p>
          <p>
            Here are three lenses to explore, from the category’s familiar
            visual language to a quieter approach to care.
          </p>
        </div>
        {lenses.map(({ title, body, takeaway }, i) => (
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
              <button
                type="button"
                className={`${styles.orb} ${styles.imageControl}`}
                aria-label={`Lens ${i + 1} aura`}
              >
                <Image
                  src="/figma/orb.png"
                  alt="Lens aura"
                  width={56}
                  height={60}
                  unoptimized
                />
              </button>
              <button
                type="button"
                className={styles.iconControl}
                aria-label={`${expanded[i] ? "Collapse" : "Expand"} lens ${i + 1}`}
                aria-expanded={expanded[i]}
                aria-controls={`lens-content-${i + 1}`}
                onClick={() =>
                  setExpanded((current) =>
                    current.map((open, index) => (index === i ? !open : open)),
                  )
                }
              >
                <FigmaIcon name={expanded[i] ? "chevron-up" : "chevron-down"} />
              </button>
            </div>
            <div id={`lens-content-${i + 1}`} hidden={!expanded[i]}>
              <div className={styles.tabs}>
                <span>Overview</span>
                <span>Purpose</span>
                <span>Inspiration</span>
              </div>
              <p className={styles.body}>{body}</p>
              <div className={styles.takeaway}>
                <p className={styles.messageAuthor}>Creative direction</p>
                <p>{takeaway}</p>
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.cardUtilities}>
                  <IconControl name="share" label="Share insight" />
                  <IconControl name="copy" label="Copy insight" />
                  <IconControl name="refresh" label="Refresh insight" />
                </div>
                <button
                  type="button"
                  className={`${styles.sources} ${styles.imageControl}`}
                >
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
            </div>
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
            <span className={styles.actionLabel}>
              Accept all insights and continue
            </span>
            <span className={styles.iconControl} aria-hidden="true">
              <FigmaIcon name="arrow-right" />
            </span>
          </button>
          <div className={styles.actionGroup}>
            {(
              [
                ["Edit the references", "pencil"],
                ["Generate more connections", "loop"],
              ] as const
            ).map(([label, icon], index) => (
              <button type="button" className={styles.action} key={label}>
                <span className={styles.shortcut}>{index + 2}</span>
                <span className={styles.actionLabel}>{label}</span>
                <span className={styles.iconControl} aria-hidden="true">
                  <FigmaIcon name={icon} />
                </span>
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
              <button
                type="button"
                className={`${styles.composerOrb} ${styles.imageControl}`}
                aria-label="Prelude aura"
              >
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
