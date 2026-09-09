"use client";

import { useEffect, useRef, useState } from "react";
import { LensThumbnail } from "../glass/lens-thumbnail";
import { lensPresets } from "../glass/presets";
import { FigmaIcon } from "./figma-icon";
import styles from "./lens-navigation.module.css";

export function WorkspaceFooter({ selected, expanded, onSelect, onExpand }: {
  selected: number;
  expanded: boolean;
  onSelect: (index: number) => void;
  onExpand: (expanded: boolean) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = () => {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const el = track.current;
    const item = el?.children[selected] as HTMLElement | undefined;
    if (el && item) {
      const margin = 32;
      if (item.offsetLeft < el.scrollLeft + margin) el.scrollLeft = Math.max(0, item.offsetLeft - margin);
      else if (item.offsetLeft + item.offsetWidth > el.scrollLeft + el.clientWidth - margin)
        el.scrollLeft = item.offsetLeft + item.offsetWidth - el.clientWidth + margin;
      updateEdges();
    }
  }, [selected, expanded]);
  const scroll = (direction: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * .7, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return (
    <>
      <nav className={styles.nav} data-expanded={expanded} aria-label="Choose a lens" tabIndex={0}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') onExpand(true); }}
        onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) onExpand(false); }}
        onFocus={() => onExpand(true)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onExpand(false); }}
        onClick={() => onExpand(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); (document.activeElement as HTMLElement)?.blur(); onExpand(false); }
        }}>
        <div className={styles.compact} aria-hidden="true"><FigmaIcon name="plus-circled" />
          <div className={styles.dots}>{Array.from({length:4},(_,i)=><span key={i} data-active={i === Math.min(3, Math.floor(selected / 3))} />)}</div>
        </div>
        <div className={styles.expanded} hidden={!expanded}>
          <div className={styles.rail} data-start={edges.start} data-end={edges.end}>
            <div ref={track} className={styles.track} onScroll={updateEdges}>
              {lensPresets.large.map((lens, index) => (
                <button key={lens.id} aria-label={`Lens ${lens.id}`} aria-pressed={selected === index}
                  className={styles.thumbnail} onClick={() => onSelect(index)}
                  onKeyDown={(event) => {
                    const next = event.key === 'ArrowRight' ? Math.min(11,index+1) : event.key === 'ArrowLeft' ? Math.max(0,index-1) : event.key === 'Home' ? 0 : event.key === 'End' ? 11 : null;
                    if (next !== null) { event.preventDefault(); onSelect(next); (track.current?.children[next] as HTMLButtonElement)?.focus({preventScroll:true}); }
                  }}><LensThumbnail index={index} /></button>
              ))}
            </div>
            <button className={`${styles.arrow} ${styles.previous}`} aria-label="Previous lenses" disabled={edges.start} onClick={() => scroll(-1)}><FigmaIcon name="chevron-left" /></button>
            <button className={`${styles.arrow} ${styles.next}`} aria-label="Next lenses" disabled={edges.end} onClick={() => scroll(1)}><FigmaIcon name="chevron-right" /></button>
          </div>
          <button className={styles.add} disabled title="Maximum of 12 lenses reached"><FigmaIcon name="plus-circled" />Add custom</button>
        </div>
      </nav>
      <p className={styles.caption}>Broad • Age 30 -55, overworked, underserved</p>
    </>
  );
}
