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
      exitMultiplier: [0.75, 0.3, 1, 0.05],
      ease: {
        type: "select",
        options: ["power2.inOut", "power3.out", "expo.out"],
        default: "power2.inOut",
      },
      rotationDuration: [0.55, 0.15, 1.5, 0.01],
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
      id: "exploded-cube-v1",
      persist: true,
      onAction: () => controls.resetValues(),
    },
  );
  const progress = useRef({ value: 0 });
  const render = useRef<(progress: number) => void>(() => undefined);
  const sceneRender = useRef<() => void>(() => undefined);
  const settleRotation = useRef<(instant: boolean) => number>(() => 0);
  const open = expanded || controls.values.holdExpanded;
  const { duration, exitMultiplier, ease } = controls.values;
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const target = progress.current;
    const update = () => {
      render.current(target.value);
      sceneRender.current();
    };
    const animate = () => {
      gsap.killTweensOf(target);
      const immediate = media.matches || instant;
      const delay = open ? 0 : settleRotation.current(immediate);
      gsap.to(target, {
        delay,
        value: open ? 1 : 0,
        duration:
          immediate ? 0 : duration * (open ? 1 : exitMultiplier),
        ease,
        onUpdate: update,
      });
    };
    animate();
    media.addEventListener("change", animate);
    return () => {
      gsap.killTweensOf(target);
      media.removeEventListener("change", animate);
    };
  }, [open, instant, duration, exitMultiplier, ease]);
  return { values: controls.values, progress, render, sceneRender, settleRotation, open };
}
