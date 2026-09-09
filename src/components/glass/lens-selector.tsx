import { LensThumbnail } from "./lens-thumbnail";
import { lensPresets } from "./presets";
export function LensSelector({
  selected,
  onSelect,
  onExplore,
}: {
  selected: number;
  onSelect: (index: number) => void;
  onExplore: (expanded: boolean) => void;
}) {
  return (
    <nav
      aria-label="Lens variants"
      className="flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-[#171717] p-3"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onExplore(true);
      }}
      onPointerLeave={() => onExplore(false)}
      onFocus={() => onExplore(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onExplore(false);
      }}
    >
      {lensPresets.large.map((preset, index) => (
        <button
          key={preset.id}
          aria-label={`Lens ${preset.id}`}
          aria-pressed={selected === index}
          onClick={() => onSelect(index)}
          className={`rounded-xl border p-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 ${selected === index ? "border-sky-400 bg-white/10" : "border-transparent hover:bg-white/10"}`}
        >
          <LensThumbnail index={index} />
          <span className="mt-1 block text-white/70">{preset.id}</span>
        </button>
      ))}
    </nav>
  );
}
