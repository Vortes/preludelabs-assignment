"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { LensThumbnail } from "../glass/lens-thumbnail";
import { lensPresets } from "../glass/presets";
import { useProximitySound } from "./use-proximity-sound";
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
  const proximitySound = useProximitySound(expanded);
  const anchor = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const pointerLeaving = useRef(false);
  const keyboardInteraction = useRef(false);
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
  useEffect(() => {
    const proximityPlayer = proximitySound.current;
    const element = nav.current;
    const bounds = anchor.current;
    if (!element || !bounds) return;
    const media = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let cursorTarget: HTMLElement | null = null;
    let savedCursor = "";
    const clearCursor = () => {
      if (cursorTarget) cursorTarget.style.cursor = savedCursor;
      cursorTarget = null;
    };
    let hovered: HTMLElement | null = null;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const reset = () => {
      gsap.to(element, { x: 0, y: 0, scaleX: 1, scaleY: 1,
        duration: media.matches ? 0.16 : 0, ease: "power3.out", overwrite: true });
    };
    const draw = () => {
      frame = 0;
      if (!pointer || expanded || !media.matches) return;
      // Measure the stationary wrapper so the pull never feeds back into its own distance.
      const rect = bounds.getBoundingClientRect();
      const unit = parseFloat(getComputedStyle(element).getPropertyValue("--ui-unit")) || 1;
      const halfWidth = Math.min(rect.width / 2, 62 * unit);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.bottom - 20 * unit;
      const dx = pointer.x - centerX;
      const dy = pointer.y - centerY;
      const distance = Math.hypot(Math.max(0, Math.abs(dx) - halfWidth),
        Math.max(0, Math.abs(dy) - 20 * unit));
      clearCursor();
      if (distance < 120 && hovered && !hovered.closest("button, a, input, textarea, select, [contenteditable]")) {
        cursorTarget = hovered;
        savedCursor = hovered.style.cursor;
        hovered.style.cursor = "pointer";
      }
      const strength = Math.pow(Math.max(0, 1 - distance / 120), 2);
      proximityPlayer?.approach(strength);
      const length = Math.max(1, Math.hypot(dx, dy));
      gsap.to(element, {
        x: dx / length * 8 * strength,
        y: dy / length * 6 * strength,
        scaleX: 1 + 0.1 * strength * Math.abs(dx) / length,
        scaleY: 1 + 0.16 * strength * Math.abs(dy) / length,
        duration: 0.16, ease: "power3.out", overwrite: true,
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || expanded || !media.matches) return;
      hovered = event.target instanceof HTMLElement ? event.target : null;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const leave = () => {
      proximityPlayer?.approach(0);
      clearCursor();
      pointer = null;
      cancelAnimationFrame(frame);
      frame = 0;
      reset();
    };
    reset();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", leave, true);
    window.addEventListener("resize", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    media.addEventListener("change", leave);
    return () => {
      proximityPlayer?.stop();
      clearCursor();
      cancelAnimationFrame(frame);
      gsap.killTweensOf(element);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", leave);
      window.removeEventListener("scroll", leave, true);
      window.removeEventListener("resize", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", leave);
    };
  }, [expanded, proximitySound]);
  return (
    <>
      <div ref={anchor} className={styles.magneticAnchor}>
      <nav
        ref={nav}
        data-lens-nav
        className={styles.nav}
        data-expanded={expanded}
        aria-label="Choose a lens"
        tabIndex={0}
        onPointerDownCapture={() => { keyboardInteraction.current = false; }}
        onKeyDownCapture={() => { keyboardInteraction.current = true; }}
        onPointerEnter={(event) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia("(hover: hover) and (pointer: fine)").matches
          )
            onExpand(true);
        }}
        onPointerLeave={(event) => {
          pointerLeaving.current = true;
          const focused = document.activeElement;
          if (
            focused instanceof HTMLElement &&
            event.currentTarget.contains(focused)
          )
            focused.blur();
          pointerLeaving.current = false;
          onExpand(false);
        }}
        onFocus={(event) => {
          keyboardInteraction.current = event.currentTarget.matches(":focus-visible") ||
            event.target.matches(":focus-visible");
          onExpand(true, keyboardInteraction.current);
        }}
        onBlur={(event) => {
          if (!pointerLeaving.current && !event.currentTarget.contains(event.relatedTarget))
            onExpand(false, keyboardInteraction.current);
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
      </div>
      <p className={styles.caption}>
        Broad • Age 30 -55, overworked, underserved
      </p>
    </>
  );
}
