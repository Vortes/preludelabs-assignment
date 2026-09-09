"use client";
import { useState } from "react";
import { DialRoot, useDialKitController } from "dialkit";
import "dialkit/styles.css";
import {
  getPreset,
  presetValues,
  patternNames,
  type PresetScale,
} from "./presets";
import { LensScene } from "./lens-scene";
import { LensSelector } from "./lens-selector";

export function GlassPrototype() {
  const [selected, setSelected] = useState(0);
  const [size, setSize] = useState<PresetScale>("large");
  return (
    <section className="mx-auto max-w-[1600px] px-6 py-8 text-white sm:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-white/40">
            LENS LIBRARY / WORKBENCH
          </p>
          <h1 className="mt-2 text-2xl">Twelve ways of seeing.</h1>
        </div>
        <label className="text-sm text-white/60">
          Figma preset{" "}
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as PresetScale)}
            className="ml-3 rounded-lg border border-white/20 bg-[#202020] px-3 py-2 text-white"
          >
            <option value="large">Large · overlays</option>
            <option value="small">Small · grid</option>
          </select>
        </label>
      </header>
      <PresetWorkbench selected={selected} size={size} onSelect={setSelected} />
    </section>
  );
}
function PresetWorkbench({
  selected,
  size,
  onSelect,
}: {
  selected: number;
  size: PresetScale;
  onSelect: (n: number) => void;
}) {
  const preset = getPreset(selected, size),
    defaults = presetValues(preset);
  const [exploring, setExploring] = useState(false);
  const [mode, setMode] = useState("hover");
  const controls = useDialKitController(
    `Lens ${preset.id} · ${size}`,
    {
      glass: {
        lightAngle: [defaults.lightAngle, 0, 360, 1],
        lightIntensity: [defaults.lightIntensity, 0, 100, 1],
        refraction: [defaults.refraction, 0, 100, 1],
        depth: [defaults.depth, 0, 200, 0.1],
        dispersion: [defaults.dispersion, 0, 100, 1],
        frost: [defaults.frost, 0, 30, 0.01],
        splay: [defaults.splay, 0, 100, 1],
        radius: [defaults.radius, 0, 100, 0.01],
      },
      pattern: {
        enabled: defaults.patternEnabled,
        type: [defaults.patternType, 0, 5, 1],
        strength: [defaults.strength, -100, 100, 1],
        scale: [defaults.patternScale, 0.1, 150, 0.01],
        angle: [defaults.patternAngle, 0, 360, 1],
        centerX: [defaults.patternX, 0, 100, 1],
        centerY: [defaults.patternY, 0, 100, 1],
        dispersion: [defaults.patternDispersion, -100, 100, 1],
        frost: [defaults.patternFrost, 0, 100, 1],
        smoothness: [defaults.smoothness, 0, 100, 1],
        wrap: [defaults.wrap, 0, 3, 1],
      },
      layout: {
        restWidth: [852, 600, 950, 1],
        restHeight: [290, 120, 400, 1],
        focalY: [165, 50, 300, 1],
        expandedSize: [570, 400, 650, 1],
        spread: [355, 240, 390, 1],
        sideAngle: [45, 0, 75, 1],
      },
      enabled: true,
    },
    { id: `lens-${preset.id}-${size}-v2`, persist: true },
  );
  const v = controls.values;
  const values = {
    ...v.glass,
    enabled: v.enabled,
    patternEnabled: v.pattern.enabled,
    patternType: v.pattern.type,
    strength: v.pattern.strength,
    patternScale: v.pattern.scale,
    patternAngle: v.pattern.angle,
    patternX: v.pattern.centerX,
    patternY: v.pattern.centerY,
    patternDispersion: v.pattern.dispersion,
    patternFrost: v.pattern.frost,
    smoothness: v.pattern.smoothness,
    wrap: v.pattern.wrap,
  };
  return (
    <div className="grid items-start gap-6 min-[1000px]:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-white/60">
            {preset.id} /{" "}
            {preset.pattern.enabled
              ? patternNames[preset.pattern.type]
              : "Clear glass"}
          </p>
          <div
            className="flex gap-1 rounded-full bg-white/5 p-1"
            aria-label="Preview state"
          >
            {["hover", "rest", "expanded"].map((state) => (
              <button
                key={state}
                onClick={() => setMode(state)}
                aria-pressed={mode === state}
                className={`rounded-full px-4 py-2 text-xs ${mode === state ? "bg-white/15 text-white" : "text-white/50"}`}
              >
                {state === "hover"
                  ? "Follow navigation"
                  : state === "rest"
                    ? "Pin rest"
                    : "Pin expanded"}
              </button>
            ))}
          </div>
        </div>
        <LensScene
          values={values}
          layout={v.layout}
          expanded={mode === "expanded" || (mode === "hover" && exploring)}
        />
        <div className="mt-4">
          <LensSelector
            selected={selected}
            onSelect={onSelect}
            onExplore={setExploring}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          Hover or focus the lens navigation to expand. Each variant keeps its
          own tweaks. Rest: {v.layout.restWidth} × {v.layout.restHeight};
          expanded: {v.layout.expandedSize} × {v.layout.expandedSize}.
        </p>
      </div>
      <aside className="space-y-4 min-[1000px]:max-h-[calc(100dvh-210px)] min-[1000px]:overflow-y-auto">
        <button
          onClick={() => controls.resetValues()}
          className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/5"
        >
          Reset this preset to Figma
        </button>
        <DialRoot mode="inline" theme="dark" defaultOpen productionEnabled />
        <p className="text-xs leading-relaxed text-white/40">
          Exact imported Figma preset values. Pattern refraction is ported from
          the designer’s shader; native Figma Glass remains a browser
          approximation. Pattern types: 0 lenticular, 1 zigzag, 2 waves, 3
          circular, 4 curved square, 5 flat square.
        </p>
      </aside>
    </div>
  );
}
