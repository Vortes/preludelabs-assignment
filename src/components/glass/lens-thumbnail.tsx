import Image from "next/image";
export function LensThumbnail({ index }: { index: number }) {
  const asset = index < 9 ? index + 1 : index + 2;
  return (
    <span className="relative block size-11 overflow-hidden rounded-lg bg-[#191919]">
      <Image
        src={`/figma/lenses/asset-${String(asset).padStart(2, "0")}.png`}
        alt=""
        fill
        sizes="44px"
      />
      {index === 8 && (
        <Image src="/figma/lenses/asset-10.png" alt="" fill sizes="44px" />
      )}
    </span>
  );
}
