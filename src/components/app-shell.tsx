"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { DialRoot, useDialKitController } from "dialkit";
import "dialkit/styles.css";
import { shellControls } from "./interface/shell-controls";
import styles from "./app-shell.module.css";
import { SpecularOverlay } from "./glass/specular-overlay";
import { GlassCanvas } from "./glass/glass-canvas";
import { getPreset, presetValues } from "./glass/presets";
import glass from "./interface/glass-surface.module.css";

/** Coordinates and defaults are in the 1920 × 1080 Figma frame's pixels. */
export function AppShell({
  selectedLens = 0,
  expanded = false,
  sidebar,
  navigation,
  children,
  detail,
  footer,
}: {
  selectedLens?: number;
  expanded?: boolean;
  sidebar: ReactNode;
  navigation: ReactNode;
  children: ReactNode;
  detail: ReactNode;
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
  const stageWidth = viewport.width - panelWidth - p.panel.inset * unit;
  const artScale = Math.min(
    unit,
    (stageWidth - 48) / Math.max(p.lens.width, expanded ? 966 : 0),
    (viewport.height - 160 * unit) / 820,
  );
  const artTop = Math.max(
    p.navigation.height * unit + 16,
    (viewport.height - 1080 * artScale) / 2 + p.artwork.top * artScale,
  );
  const artSize = expanded ? 454 : p.artwork.size;
  const lensWidth = expanded ? 570 : p.lens.width;
  const lensHeight = expanded ? 570 : p.lens.height;
  const artworkTop = artTop + (expanded ? 19 * artScale : 0);
  const lensTop = expanded
    ? artworkTop - 58 * artScale
    : artTop + (p.lens.top - p.artwork.top) * artScale;
  const lensValues = {
    ...presetValues(getPreset(selectedLens, "large")),
    radius: p.lens.radius,
  };
  const geometry = {
    width: lensWidth,
    height: lensHeight,
    imageSize: artSize,
    imageX: (lensWidth - artSize) / 2 + p.artwork.offsetX - p.lens.offsetX,
    imageY: (artworkTop - lensTop) / artScale,
  };
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
    "--art-size": `${artSize * artScale}px`,
    "--art-top": `${artworkTop}px`,
    "--art-x": `${p.artwork.offsetX * artScale}px`,
    "--art-radius": `${p.artwork.radius * artScale}px`,
    "--lens-width": `${lensWidth * artScale}px`,
    "--lens-height": `${lensHeight * artScale}px`,
    "--lens-top": `${lensTop}px`,
    "--lens-x": `${p.lens.offsetX * artScale}px`,
    "--lens-radius": `${p.lens.radius * artScale}px`,
    "--detail-width": `${p.detail.width * artScale}px`,
    "--detail-height": `${p.detail.height * artScale}px`,
    "--detail-top": `${artTop + ((expanded ? 596 : p.detail.top) - p.artwork.top) * artScale}px`,
    "--detail-x": `${p.detail.offsetX * artScale}px`,
    "--detail-padding": `${p.detail.padding * artScale}px`,
    "--detail-radius": `${p.detail.radius * artScale}px`,
    "--footer-height": `${p.footer.height * unit}px`,
    "--footer-bottom": `${p.footer.bottomPadding * unit}px`,
    "--footer-gap": `${p.footer.gap * unit}px`,
    "--specular-angle": p.highlights.angle,
    "--specular-strength": p.highlights.strength,
    "--side-size": `${256 * artScale}px`,
    "--side-spread": `${355 * artScale}px`,
    "--side-top": `${artTop + 240 * artScale}px`,
    "--ui-unit": unit,
    "--art-unit": artScale,
  } as CSSProperties;
  return (
    <div ref={host} className={styles.viewport}>
      <div className={styles.desktop}>
        <main
          className={styles.frame}
          style={variables}
          data-guides={p.showGuides}
          data-expanded={expanded}
        >
          <aside
            className={`${styles.panel} ${glass.surface} ${glass.panel}`}
            data-glass-highlight="heavy"
            aria-label="Lens conversation"
          >
            {sidebar}
          </aside>
          <section className={styles.stage} aria-label="Content workspace">
            <header className={styles.navigation}>{navigation}</header>
            <div className={styles.artwork}>{children}</div>
            <div
              className={styles.lens}
              aria-label={`Lens ${selectedLens + 1}`}
            >
              {viewport.width >= 768 && (
                <GlassCanvas values={lensValues} geometry={geometry} />
              )}
            </div>
            {[-1, 1].map((side) => (
              <div
                key={side}
                className={styles.side}
                style={{ "--side": side } as CSSProperties}
                aria-hidden="true"
              >
                {viewport.width >= 768 && (
                  <GlassCanvas
                    values={presetValues(
                      getPreset((selectedLens + side + 12) % 12, "large"),
                    )}
                    geometry={{
                      width: 256,
                      height: 256,
                      imageSize: 454,
                      imageX: -99,
                      imageY: -99,
                    }}
                  />
                )}
              </div>
            ))}
            <div className={styles.detail}>{detail}</div>
            <footer className={styles.footer}>{footer}</footer>
          </section>
          {viewport.width >= 768 && <SpecularOverlay />}
        </main>
      </div>
      <div className={styles.mobile}>
        <p>Mobile coming soon</p>
      </div>
      {viewport.width >= 768 && (
        <DialRoot
          position="bottom-right"
          theme="dark"
          defaultOpen={false}
          productionEnabled
        />
      )}
    </div>
  );
}
