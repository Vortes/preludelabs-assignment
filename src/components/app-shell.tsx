"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DialRoot, useDialKitController } from "dialkit";
import "dialkit/styles.css";
import { shellControls } from "./interface/shell-controls";
import styles from "./app-shell.module.css";
import { SpecularOverlay } from "./glass/specular-overlay";
import { ExplodedCube } from "./glass/exploded-cube";
import { type useLensMotion } from "./interface/lens-motion";
import glass from "./interface/glass-surface.module.css";

/** Coordinates and defaults are in the 1920 × 1080 Figma frame's pixels. */
export function AppShell({
  selectedLens = 0,
  motion,
  sidebar,
  navigation,
  instantSelection,
  footer,
}: {
  selectedLens?: number;
  motion: ReturnType<typeof useLensMotion>;
  sidebar: ReactNode;
  navigation: ReactNode;
  instantSelection: boolean;
  footer: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });
  const controls = useDialKitController("Interface shell", shellControls, {
    id: "interface-shell",
    persist: true,
    onAction: () => controls.resetValues(),
  });
  const p = controls.values;
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setViewport({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const unit = Math.min(1, Math.max(0.65, viewport.width / 1920));
  const panelWidth = Math.min(p.panel.width * unit, viewport.width * 0.38);
  const variables = {
    "--panel-inset": `${p.panel.inset * unit}px`,
    "--panel-width": `${panelWidth}px`,
    "--panel-radius": `${p.panel.radius * unit}px`,
    "--content-x": `${p.panel.contentPaddingX * unit}px`,
    "--content-top": `${p.panel.contentPaddingTop * unit}px`,
    "--card-gap": `${p.panel.cardGap * unit}px`,
    "--composer-inset": `${p.panel.composerInset * unit}px`,
    "--composer-height": `${p.panel.composerHeight * unit}px`,
    "--stage-left": `${p.panel.inset * unit + panelWidth}px`,
    "--nav-padding": `${p.navigation.padding * unit}px`,
    "--nav-height": `${p.navigation.height * unit}px`,
    "--footer-height": `${p.footer.height * unit}px`,
    "--footer-bottom": `${p.footer.bottomPadding * unit}px`,
    "--footer-gap": `${p.footer.gap * unit}px`,
    "--specular-angle": p.highlights.angle,
    "--specular-strength": p.highlights.strength,
    "--ui-unit": unit,
  } as CSSProperties;
  useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const nav = root.querySelector<HTMLElement>("[data-lens-nav]");
    const surface = root.querySelector<HTMLElement>("[data-nav-surface]");
    const compact = root.querySelector<HTMLElement>("[data-nav-compact]");
    const contents = root.querySelector<HTMLElement>("[data-nav-contents]");
    const draw = (t: number) => {
      const mix = (a: number, b: number) => a + (b - a) * t;
      if (nav && surface && compact && contents) {
        const collapsed = Math.min(1, (124 * unit) / nav.clientWidth);
        surface.style.transform = `scale(${mix(collapsed, 1)}, ${mix(40 / 140, 1)})`;
        compact.style.opacity = String(1 - Math.min(1, t * 3));
        contents.style.opacity = String(Math.max(0, (t - 0.2) / 0.8));
        contents.style.transform = `translateY(${12 * (1 - t)}px)`;
        nav.style.clipPath = `inset(${(1 - t) * (140 - 40) * unit}px ${((1 - t) * (nav.clientWidth - 124 * unit)) / 2}px 0 round ${32 * unit}px)`;
      }
    };
    motion.render.current = draw;
    draw(motion.progress.current.value);
  });
  return (
    <div ref={host} className={styles.viewport}>
      <div className={styles.desktop}>
        <main
          className={styles.frame}
          style={variables}
          data-guides={p.showGuides}
          data-expanded={motion.open}
        >
          <aside
            className={`${styles.panel} ${glass.surface} ${glass.panel}`}
            data-glass-highlight="panel"
            aria-label="Lens conversation"
          >
            {sidebar}
          </aside>
          <section className={styles.stage} aria-label="Content workspace">
            <header className={styles.navigation}>{navigation}</header>
            {viewport.width >= 768 && (
              <ExplodedCube
                motion={motion}
                selected={selectedLens}
                instant={instantSelection}
              />
            )}
            <footer className={styles.footer}>{footer}</footer>
          </section>
          {viewport.width >= 768 && <SpecularOverlay />}
        </main>
      </div>
      <div className={styles.mobile}>
        <p>Mobile coming soon</p>
      </div>
      {process.env.NODE_ENV === "development" && viewport.width >= 768 && (
        <DialRoot
          position="bottom-right"
          theme="dark"
          defaultOpen={true}
        />
      )}
    </div>
  );
}
