import source from "./figma-presets.json";
export type LensPreset = (typeof source.large)[number];
export type PresetScale = "small" | "large";
export const lensPresets = source;
export const patternNames = [
  "Lenticular",
  "Zigzag",
  "Waves",
  "Circular",
  "Curved square",
  "Flat square",
];
export function getPreset(index: number, size: PresetScale): LensPreset {
  return lensPresets[size][index] ?? lensPresets[size][0]!;
}
export function presetValues(p: LensPreset) {
  return {
    ...p.glass,
    radius: p.radius,
    patternEnabled: p.pattern.enabled,
    patternType: p.pattern.type,
    strength: p.pattern.strength,
    patternScale: p.pattern.transform.radius,
    patternAngle: p.pattern.transform.angle,
    patternX: p.pattern.transform.x,
    patternY: p.pattern.transform.y,
    patternDispersion: p.pattern.dispersion,
    patternFrost: p.pattern.frost,
    smoothness: p.pattern.smoothness,
    wrap: p.pattern.wrap,
    enabled: true,
  };
}
export type GlassValues = ReturnType<typeof presetValues>;
