import Image from "next/image";
import styles from "./interface.module.css";

export type FigmaIconName =
  | "chevron-left"
  | "chevron-right"
  | "copy"
  | "refresh"
  | "chevron-up"
  | "chevron-down"
  | "arrow-right"
  | "pencil"
  | "loop"
  | "message"
  | "share"
  | "aperture"
  | "reload"
  | "plus"
  | "voice"
  | "plus-circled";
export function FigmaIcon({ name }: { name: FigmaIconName }) {
  return (
    <Image
      className={styles.icon}
      src={`/figma/icons/${name}.svg`}
      alt=""
      width={16}
      height={16}
      unoptimized
    />
  );
}
export function IconControl({
  name,
  label,
}: {
  name: FigmaIconName;
  label: string;
}) {
  return (
    <button type="button" className={styles.iconControl} aria-label={label}>
      <FigmaIcon name={name} />
    </button>
  );
}
