"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { type useLensMotion } from "../interface/lens-motion";
import { cubeVertexShader, cubeFragmentShader } from "./cube-shader";
import { createOriginalLensPass } from "./original-lens-pass";
import { getPreset, presetValues } from "./presets";
import { cubePresetsAtAngle, cubeRotationTarget, quarterTurn } from "./cube-faces";
import styles from "./exploded-cube.module.css";
import { InsightCallout } from "../interface/insight-callout";
import { useGlassSound } from "./use-glass-sound";

export function ExplodedCube({
  motion,
  selected,
  instant,
}: {
  motion: ReturnType<typeof useLensMotion>;
  selected: number;
  instant: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const detail = useRef<HTMLElement>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const renderer = useRef<(() => void) | null>(null);
  const latest = useRef(motion);
  const rotation = useRef({ angle: cubeRotationTarget(selected) });
  const faceSlots = useRef(cubePresetsAtAngle(rotation.current.angle));
  const sound = useGlassSound();
  const previousSwitch = useRef({ selected, start: rotation.current.angle, target: rotation.current.angle });
  const switchTimeline = useRef<gsap.core.Timeline | null>(null);
  const { rotationDuration, rotationOvershoot, rotationSettle, rotationRecoil } = motion.values;
  const [error, setError] = useState(false);
  useLayoutEffect(() => {
    latest.current = motion;
    renderer.current?.();
  });
  useLayoutEffect(() => {
    const value = rotation.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const clear = () => {
      sound.current?.stop();
      switchTimeline.current?.kill();
      switchTimeline.current = null;
    };
    const turn = () => {
      clear();
      const previous = previousSwitch.current;
      const start = previous.selected === selected ? previous.start : value.angle;
      let target = previous.target;
      if (previous.selected !== selected) {
        const direction = Math.sign(selected - previous.selected);
        const position = Math.round(-start / quarterTurn);
        const adjacentFace = ((position + direction) % 4 + 4) % 4;
        const steps = Math.abs(selected - previous.selected) === 1 &&
          faceSlots.current[adjacentFace] === selected ? 1 : 2;
        const destination = position + direction * steps;
        target = -destination * quarterTurn;
        // Distant destinations replace the rear face before it rotates into view.
        faceSlots.current[((destination % 4) + 4) % 4] = selected;
      }
      previousSwitch.current = { selected, start, target };
      const distance = target - start;
      if (instant || media.matches || Math.abs(distance) < 0.00001) {
        value.angle = target;
        renderer.current?.();
        return;
      }
      value.angle = start;
      const overshoot = Math.sign(distance) * Math.min(
        rotationOvershoot * Math.PI / 180, Math.abs(distance) * 0.1,
      );
      const timeline = gsap.timeline({
        id: "Shader switch",
        onStart: () => {
          if (latest.current.open) sound.current?.play();
        },
        onUpdate: () => renderer.current?.(),
      });
      switchTimeline.current = timeline;
      timeline.addLabel("Pull")
        .to(value, {
          angle: target + overshoot,
          duration: rotationDuration,
          ease: "power2.inOut",
        })
        .addLabel("Catch")
        .to(value, {
          angle: target - overshoot * rotationRecoil,
          duration: rotationSettle * 0.6,
          ease: "sine.inOut",
        })
        .addLabel("Settle")
        .to(value, {
          angle: target,
          duration: rotationSettle * 0.4,
          ease: "sine.inOut",
        });
      timeline.timeScale(0.25);
    };
    turn();
    media.addEventListener("change", turn);
    return () => {
      clear();
      media.removeEventListener("change", turn);
    };
  }, [selected, instant, rotationDuration, rotationOvershoot,
    rotationSettle, rotationRecoil, sound]);
  useLayoutEffect(() => {
    const settle = (immediate: boolean) => {
      const value = rotation.current;
      const timeline = switchTimeline.current;
      if (immediate) {
        timeline?.progress(1).pause();
        value.angle = previousSwitch.current.target;
        renderer.current?.();
        return 0;
      }
      if (!timeline) return 0;
      const remaining = timeline.duration() - timeline.time();
      const duration = Math.min(0.45, remaining / Math.max(0.01, timeline.timeScale()));
      if (duration > 0) timeline.timeScale(remaining / duration).play();
      return duration;
    };
    motion.settleRotation.current = settle;
    return () => { motion.settleRotation.current = () => 0; };
  }, [selected, motion.settleRotation]);
  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl", { alpha: false, antialias: false });
    if (!element || !gl) {
      setError(true);
      return;
    }
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const shaders: WebGLShader[] = [];
    const dispose = () => {
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
    };
    if (!program || !buffer || !texture) {
      dispose();
      setError(true);
      return;
    }
    for (const [type, source] of [
      [gl.VERTEX_SHADER, cubeVertexShader],
      [gl.FRAGMENT_SHADER, cubeFragmentShader],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) {
        dispose();
        setError(true);
        return;
      }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        dispose();
        setError(true);
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      dispose();
      setError(true);
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uniforms = new Map<string, WebGLUniformLocation | null>();
    const location = (name: string) => {
      if (!uniforms.has(name))
        uniforms.set(name, gl.getUniformLocation(program, name));
      return uniforms.get(name) ?? null;
    };
    const set = (name: string, value: number) => gl.uniform1f(location(name), value);
    const presets = Array.from({ length: 12 }, (_, index) => presetValues(getPreset(index, "large")));
    const optics: ReturnType<typeof createOriginalLensPass>[] = [];
    try {
      for (let face = 0; face < 4; face++)
        optics.push(createOriginalLensPass(gl, face + 1));
    } catch (error) {
      console.error(error);
      optics.forEach((pass) => pass.dispose());
      dispose();
      setError(true);
      return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    let disposed = false;
    const image = new Image();
    let frame = 0;
    let cssWidth = element.clientWidth;
    let cssHeight = element.clientHeight;
    const draw = () => {
      frame = 0;
      const ratio = Math.min(devicePixelRatio, 1.5);
      const width = Math.max(1, Math.round(cssWidth * ratio)),
        height = Math.max(1, Math.round(cssHeight * ratio));
      if (element.width !== width || element.height !== height) {
        element.width = width;
        element.height = height;
      }
      const m = latest.current;
      const t = m.progress.current.value;
      const depth = 26 + (m.values.cubeDepth - 26) * t;
      const projection =
        m.values.cameraDistance / (m.values.cameraDistance - depth);
      const lensWidth =
        (m.values.restWidth + (m.values.cubeSize - m.values.restWidth) * t) *
        projection;
      const lensHeight =
        (m.values.restHeight + (m.values.cubeSize - m.values.restHeight) * t) *
        projection;
      const centerY = 600 * (0.5 - m.values.focalY) * (1 - t) * projection;
      const imageSize = 600 * (1 + (m.values.artworkScale - 1) * t);
      if (detail.current) {
        detail.current.style.setProperty("--art-unit", String(cssWidth / 1100));
        detail.current.style.backdropFilter = `blur(${25 * cssWidth / 1100}px)`;
        detail.current.style.top = `${(425 + imageSize / 2 - 154) / 850 * 100}%`;
      }
      const facePresets = faceSlots.current;
      const maxProjection = m.values.cameraDistance / (m.values.cameraDistance - m.values.cubeDepth);
      // Keep allocations stable through expansion; rasterize at the glass's screen size.
      const pixelScale = width / 1100;
      const resolution = Math.max(1, Math.ceil(Math.max(
        m.values.restWidth, m.values.cubeSize * maxProjection,
      ) * pixelScale));
      optics.forEach((pass, face) => {
        const angle = face * Math.PI / 2 + rotation.current.angle;
        const nx = Math.sin(angle), nz = Math.cos(angle);
        const front = Math.max(0, Math.min(1, (nz - 0.6) / 0.35));
        const focus = front * front * (3 - 2 * front);
        const focused = (1 - t) * focus;
        const faceWidth = m.values.cubeSize + (m.values.restWidth - m.values.cubeSize) * focused;
        const faceHeight = m.values.cubeSize + (m.values.restHeight - m.values.cubeSize) * focused;
        const restDepth = 310 + (26 - 310) * focus;
        const faceDepth = restDepth + (m.values.cubeDepth - restDepth) * t;
        pass.render(
          presets[facePresets[face]!]!,
          {
            width: faceWidth,
            height: faceHeight,
            imageSize,
            imageX: (lensWidth - imageSize) / 2,
            imageY: (lensHeight - imageSize) / 2 + centerY,
          },
          texture,
          image.naturalWidth,
          resolution,
          {
            center: [nx * faceDepth, 600 * (0.5 - m.values.focalY) * focused, nz * faceDepth],
            right: [nz, 0, -nx],
            camera: m.values.cameraDistance,
          },
        );
      });
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, width, height);
      gl.uniform1i(location("artwork"), 0);
      for (let face = 0; face < 4; face++)
        gl.uniform1i(
          location(`lensTexture${face}`),
          face + 1,
        );
      gl.uniform2f(
        location("lensDimensions"),
        lensWidth,
        lensHeight,
      );
      set("lensCenterY", centerY);
      set("progress", m.progress.current.value);
      set("orbit", rotation.current.angle);
      for (const [key, value] of Object.entries(m.values))
        if (typeof value === "number") set(key, value);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const scheduleDraw = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    image.onload = () => {
      if (disposed) return;
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      renderer.current = scheduleDraw;
      draw();
    };
    image.onerror = () => {
      if (!disposed) setError(true);
    };
    image.src = "/figma/lens-artwork-hq.png";
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      cssWidth = entry.contentRect.width;
      cssHeight = entry.contentRect.height;
      renderer.current?.();
    });
    observer.observe(element);
    const onMotion = () => renderer.current?.();
    latest.current.sceneRender.current = onMotion;
    const lost = (event: Event) => {
      event.preventDefault();
      setError(true);
    };
    element.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("webglcontextlost", lost);
      renderer.current = null;
      latest.current.sceneRender.current = () => undefined;
      optics.forEach((pass) => pass.dispose());
      dispose();
    };
  }, []);
  return (
    <div className={styles.scene} data-cube-scene data-expanded={motion.open}>
      <div className={styles.composition}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Exploded glass cube, lens ${selected + 1}, refracting a painting of women walking through the city`}
      />
      {detailOpen && <aside ref={detail} className={styles.detail} aria-label="Aesthetic contrast insight">
        <button
          type="button"
          className={styles.closeDetail}
          aria-label="Close Aesthetic contrast"
          onClick={() => setDetailOpen(false)}
        >
          <span aria-hidden="true">×</span>
        </button>
        <InsightCallout />
      </aside>}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          The glass scene could not render. Check WebGL support and reload.
        </p>
      )}
    </div>
  );
}
