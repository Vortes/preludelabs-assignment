"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useDialKitController } from "dialkit";

export function useLensMotion(expanded: boolean, instant: boolean) {
  const controls = useDialKitController(
    "Exploded cube",
    {
      holdExpanded: false,
      duration: [0.28, 0.1, 1.5, 0.01],
      expansionOvershoot: [0.025, 0, 0.06, 0.005],
      expansionRecoil: [0.2, 0, 0.4, 0.01],
      collapseOvershoot: [0.012, 0, 0.04, 0.002],
      exitMultiplier: [0.75, 0.3, 1, 0.05],
      ease: {
        type: "select",
        options: ["power2.inOut", "power3.out", "expo.out"],
        default: "power2.inOut",
      },
      rotationDuration: [0.18, 0.1, 0.6, 0.01],
      rotationOvershoot: [2, 0, 6, 0.1],
      rotationSettle: [0.1, 0.04, 0.3, 0.01],
      rotationRecoil: [0.2, 0, 0.4, 0.01],
      focalY: [0.27, 0.05, 0.8, 0.01],
      restWidth: [792, 400, 900, 1],
      restHeight: [287, 120, 500, 1],
      cubeSize: [487, 400, 650, 1],
      cubeDepth: [325, 280, 480, 1],
      cameraDistance: [2370, 1600, 3000, 10],
      artworkScale: [0.76, 0.5, 0.85, 0.01],
      glassTint: [0.14, 0, 0.3, 0.01],
      edgeLight: [0.65, 0, 1.5, 0.01],
      reset: { type: "action" },
    },
    {
      id: "exploded-cube-v2",
      persist: true,
      onAction: () => controls.resetValues(),
    },
  );
  const progress = useRef({ value: 0 });
  const render = useRef<(progress: number) => void>(() => undefined);
  const sceneRender = useRef<() => void>(() => undefined);
  const settleRotation = useRef<(instant: boolean) => number>(() => 0);
  const open = expanded || controls.values.holdExpanded;
  const { duration, exitMultiplier, ease, expansionOvershoot, expansionRecoil, collapseOvershoot } = controls.values;
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const target = progress.current;
    const update = () => {
      render.current(target.value);
      sceneRender.current();
    };
    let timeline: gsap.core.Timeline | undefined;
    const animate = () => {
      timeline?.kill();
      const immediate = media.matches || instant;
      const delay = open ? 0 : settleRotation.current(immediate);
      if (immediate) {
        target.value = open ? 1 : 0;
        update();
        return;
      }
      if (Math.abs(target.value - (open ? 1 : 0)) < 0.00001) return;
      timeline = gsap.timeline({
        id: open ? "Expand cube" : "Collapse cube",
        delay,
        onUpdate: update,
      });
      if (open) {
        const overshoot = Math.min(expansionOvershoot, Math.abs(1 - target.value) * 0.1);
        timeline.addLabel("Pull")
          .to(target, { value: 1 + overshoot, duration: duration * 9 / 14, ease })
          .addLabel("Catch")
          .to(target, { value: 1 - overshoot * expansionRecoil, duration: duration * 3 / 14, ease: "sine.inOut" })
          .addLabel("Settle")
          .to(target, { value: 1, duration: duration / 7, ease: "sine.inOut" });
      } else {
        const exitDuration = duration * exitMultiplier;
        const overshoot = Math.min(collapseOvershoot, Math.abs(target.value) * 0.1);
        timeline.addLabel("Return")
          .to(target, { value: -overshoot, duration: exitDuration * 9 / 14, ease })
          .addLabel("Catch")
          .to(target, { value: overshoot * expansionRecoil, duration: exitDuration * 3 / 14, ease: "sine.inOut" })
          .addLabel("Rest")
          .to(target, { value: 0, duration: exitDuration / 7, ease: "sine.inOut" });
      }
    };
    animate();
    media.addEventListener("change", animate);
    return () => {
      timeline?.kill();
      media.removeEventListener("change", animate);
    };
  }, [open, instant, duration, exitMultiplier, ease, expansionOvershoot, expansionRecoil, collapseOvershoot]);
  return { values: controls.values, progress, render, sceneRender, settleRotation, open };
}
