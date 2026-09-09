"use client";
import Image from "next/image";
import { GlassCanvas } from "./glass-canvas";
import { type GlassValues } from "./presets";
import styles from "./lens-scene.module.css";

export type SceneValues = {
  restWidth: number;
  restHeight: number;
  focalY: number;
  expandedSize: number;
  spread: number;
  sideAngle: number;
};
export function LensScene({
  values,
  layout,
  expanded,
}: {
  values: GlassValues;
  layout: SceneValues;
  expanded: boolean;
}) {
  const width = expanded ? layout.expandedSize : layout.restWidth;
  const height = expanded ? layout.expandedSize : layout.restHeight;
  const artSize = expanded ? 454 : 600;
  const artY = expanded ? 116 : 100;
  const centerY = expanded ? 343 : 100 + layout.focalY;
  const x = 500 - width / 2,
    y = centerY - height / 2;
  const geometry = {
    width,
    height,
    imageSize: artSize,
    imageX: 500 - artSize / 2 - x,
    imageY: artY - y,
  };
  return (
    <div className={styles.scene} data-expanded={expanded}>
      <div
        className={styles.artwork}
        style={{
          transform: `translateX(-50%) translateY(${expanded ? 1.6 : 0}cqw) scale(${artSize / 600})`,
        }}
      >
        <Image
          src="/figma/lens-artwork-hq.png"
          alt="Original workshop painting of women walking through the city"
          fill
          sizes="(min-width: 1400px) 600px, 50vw"
          priority
        />
      </div>
      <div
        className={styles.face}
        style={{
          zIndex: expanded ? 0 : 3,
          transform: `translate(-50%, -50%) translateY(${(centerY - 420) / 10}cqw) scale(${width / 570},${height / 570})`,
        }}
      >
        <GlassCanvas values={values} geometry={geometry} />
      </div>
      {[-1, 1].map((side) => (
        <div
          key={side}
          className={styles.side}
          style={{
            opacity: expanded ? 0.65 : 0,
            transform: `translate(-50%,-50%) translateX(${expanded ? (side * layout.spread) / 10 : 0}cqw) rotateY(${side * layout.sideAngle}deg) rotateZ(${side * 15}deg)`,
          }}
        >
          <GlassCanvas
            values={values}
            geometry={{
              width: 256,
              height: 256,
              imageSize: 454,
              imageX: -99,
              imageY: -99,
            }}
          />
        </div>
      ))}
      <aside className={styles.callout}>
        <p>Aesthetic contrast</p>
        <p>The “Real Beauty” formula has become a predictable performance.</p>
      </aside>
    </div>
  );
}
