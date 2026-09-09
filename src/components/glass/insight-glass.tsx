"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useDialKitController } from "dialkit";
import { fragmentShader, vertexShader } from "./shader";
import { getPreset, presetValues } from "./presets";
import styles from "./exploded-cube.module.css";

const sceneStart = fragmentShader.indexOf("vec3 scene(vec2 p) {");
const sceneEnd = fragmentShader.indexOf("vec3 frosted(vec2 p) {");
const insightShader =
  fragmentShader.slice(0, sceneStart) +
  `
uniform vec2 sceneSize, sceneOffset;
vec3 scene(vec2 p) {
  vec2 t = (p + sceneOffset) / sceneSize;
  vec4 texel = texture2D(artwork, clamp(t, 0., 1.));
  float fade = 1. - smoothstep(.88, 1., t.y);
  float inside = step(0., t.x) * step(t.x, 1.) * step(0., t.y) * step(t.y, 1.);
  return mix(vec3(.025), texel.rgb, texel.a * fade * inside);
}
` +
  fragmentShader.slice(sceneEnd);

export function InsightGlass({
  source,
  renderSurface,
  redrawScene,
}: {
  source: RefObject<HTMLCanvasElement | null>;
  renderSurface: RefObject<(() => void) | null>;
  redrawScene: RefObject<(() => void) | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useDialKitController(
    "Aesthetic contrast · glass",
    {
      enabled: true,
      optics: {
        refraction: [80, 0, 100, 1],
        depth: [28, 0, 100, 1],
        dispersion: [30, 0, 100, 1],
        frost: [2, 0, 20, 0.1],
        splay: [35, 0, 100, 1],
      },
      lighting: {
        angle: [180, 0, 360, 1],
        intensity: [25, 0, 100, 1],
        tint: [0.35, 0, 0.9, 0.01],
      },
    },
    { id: "aesthetic-contrast-glass", persist: true },
  );
  const values = useRef(controls.values);
  useEffect(() => {
    values.current = controls.values;
    redrawScene.current?.();
  }, [controls.values, redrawScene]);

  useEffect(() => {
    const target = canvas.current;
    const gl = target?.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!target || !gl) return;
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const shaders: WebGLShader[] = [];
    const dispose = () => {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
    if (!program || !buffer || !texture) {
      dispose();
      return;
    }
    for (const [type, code] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, insightShader],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) {
        dispose();
        return;
      }
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Insight glass shader:", gl.getShaderInfoLog(shader));
        dispose();
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Insight glass shader:", gl.getProgramInfoLog(program));
      dispose();
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
    const locations = new Map<string, WebGLUniformLocation | null>();
    const uniform = (name: string) => {
      if (!locations.has(name))
        locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name) ?? null;
    };
    const render = () => {
      if (!source.current || !values.current.enabled) return;
      const rect = target.getBoundingClientRect();
      const background = source.current.getBoundingClientRect();
      if (!rect.width || !background.width) return;
      const ratio = Math.min(devicePixelRatio, 2);
      const width = Math.round(rect.width * ratio),
        height = Math.round(rect.height * ratio);
      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source.current,
      );
      gl.uniform2f(uniform("dimensions"), rect.width, rect.height);
      gl.uniform2f(
        uniform("pixelStep"),
        rect.width / width,
        rect.height / height,
      );
      gl.uniform2f(uniform("sceneSize"), background.width, background.height);
      gl.uniform2f(
        uniform("sceneOffset"),
        rect.left - background.left,
        rect.top - background.top,
      );
      const settings = {
        ...presetValues(getPreset(0, "small")),
        ...values.current.optics,
        radius: (32 * background.width) / 1100,
        lightAngle: values.current.lighting.angle,
        lightIntensity: values.current.lighting.intensity,
        patternEnabled: false,
      };
      for (const [name, value] of Object.entries(settings))
        gl.uniform1f(uniform(name), Number(value));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    renderSurface.current = render;
    redrawScene.current?.();
    return () => {
      renderSurface.current = null;
      dispose();
    };
  }, [source, renderSurface, redrawScene]);

  return (
    <div className={styles.insightGlass} aria-hidden="true">
      <canvas
        ref={canvas}
        style={{ visibility: controls.values.enabled ? "visible" : "hidden" }}
      />
      <div
        className={styles.insightTint}
        style={{
          background: `rgba(0, 0, 0, ${controls.values.lighting.tint})`,
        }}
      />
    </div>
  );
}
