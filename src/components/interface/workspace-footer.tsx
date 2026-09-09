"use client";

import { useEffect, useRef } from "react";
import { LensThumbnail } from "../glass/lens-thumbnail";
import { lensPresets } from "../glass/presets";
import { FigmaIcon } from "./figma-icon";
import styles from "./lens-navigation.module.css";

export function WorkspaceFooter({
  selected,
  expanded,
  onSelect,
  onExpand,
}: {
  selected: number;
  expanded: boolean;
  onSelect: (index: number, instant?: boolean) => void;
  onExpand: (expanded: boolean, instant?: boolean) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const item = track.current?.children[selected] as HTMLElement | undefined;
    if (expanded)
      item?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
  }, [selected, expanded]);
  return (
    <>
      <nav
        data-lens-nav
        className={styles.nav}
        data-expanded={expanded}
        aria-label="Choose a lens"
        tabIndex={0}
        onPointerEnter={(event) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover) and (pointer: fine)").matches
          )
            onExpand(true);
        }}
        onPointerLeave={(event) => {
          const focused = document.activeElement;
          if (
            focused instanceof HTMLElement &&
            event.currentTarget.contains(focused)
          )
            focused.blur();
          onExpand(false);
        }}
        onFocus={(event) =>
          onExpand(
            true,
            event.currentTarget.matches(":focus-visible") ||
              event.target.matches(":focus-visible"),
          )
        }
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            onExpand(false, true);
        }}
        onClick={() => onExpand(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            (document.activeElement as HTMLElement)?.blur();
            onExpand(false, true);
          }
        }}
      >
        <div data-nav-surface className={styles.surface} aria-hidden="true" />
        <div data-nav-compact className={styles.compact} aria-hidden="true">
          <FigmaIcon name="plus-circled" />
          <div className={styles.dots}>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} data-active={i === Math.floor(selected / 3)} />
            ))}
          </div>
        </div>
        <div
          data-nav-contents
          className={styles.expanded}
          inert={!expanded}
          aria-hidden={!expanded}
        >
          <div className={styles.rail}>
            <div ref={track} className={styles.track}>
              {lensPresets.large.map((lens, index) => (
                <button
                  key={lens.id}
                  aria-label={`Lens ${lens.id}`}
                  aria-pressed={selected === index}
                  className={styles.thumbnail}
                  onClick={() => onSelect(index)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === "ArrowRight"
                        ? Math.min(lensPresets.large.length - 1, index + 1)
                        : event.key === "ArrowLeft"
                          ? Math.max(0, index - 1)
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? lensPresets.large.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      onSelect(next, true);
                      (
                        track.current?.children[next] as HTMLButtonElement
                      )?.focus({ preventScroll: true });
                    }
                  }}
                >
                  <LensThumbnail index={index} />
                </button>
              ))}
            </div>
          </div>
          <button
            className={styles.add}
            disabled
            title="Custom lenses coming soon"
          >
            <FigmaIcon name="plus-circled" />
            Add custom
          </button>
        </div>
      </nav>
      <p className={styles.caption}>
        Broad • Age 30 -55, overworked, underserved
      </p>
    </>
  );
}
