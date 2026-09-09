"use client";

import { useEffect, useRef, useState } from "react";
import { fragmentShader, vertexShader } from "./shader";
import { type GlassValues } from "./presets";

export type GlassGeometry = {
  width: number;
  height: number;
  imageSize: number;
  imageX: number;
  imageY: number;
};
export function GlassCanvas({
  values,
  geometry,
}: {
  values: GlassValues;
  geometry: GlassGeometry;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const current = useRef({ values, geometry });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!canvas || !gl) {
      setError(
        "WebGL is unavailable. Enable hardware acceleration to preview the lens.",
      );
      return;
    }
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const cleanup = () => {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
    };
    if (!program || !buffer || !texture) {
      setError("Unable to initialize glass renderer.");
      cleanup();
      return;
    }
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragmentShader],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) {
        setError("Unable to allocate shader.");
        cleanup();
        return;
      }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        setError(gl.getShaderInfoLog(shader) ?? "Shader compilation failed.");
        cleanup();
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError(gl.getProgramInfoLog(program) ?? "Shader linking failed.");
      cleanup();
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
    const location = (key: string) => {
      if (!locations.has(key))
        locations.set(key, gl.getUniformLocation(program, key));
      return locations.get(key) ?? null;
    };
    let disposed = false;
    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      drawRef.current = () => {
        const { values: v, geometry: g } = current.current;
        // The lens is stretched with CSS transforms; clientWidth is its unscaled size.
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio, 2);
        const width = Math.max(1, Math.min(4096, Math.ceil(bounds.width * ratio))),
          height = Math.max(1, Math.min(4096, Math.ceil(bounds.height * ratio)));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.uniform2f(location("dimensions"), g.width, g.height);
        gl.uniform2f(location("pixelStep"), g.width / width, g.height / height);
        gl.uniform1f(location("textureSize"), img.naturalWidth);
        gl.uniform2f(location("imageOffset"), g.imageX, g.imageY);
        gl.uniform1f(location("imageSize"), g.imageSize);
        for (const [key, value] of Object.entries(v))
          gl.uniform1f(
            location(key),
            key === "radius"
              ? Math.min(Number(value), g.width / 2, g.height / 2)
              : Number(value),
          );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      drawRef.current();
    };
    img.onerror = () => {
      if (!disposed) setError("The reference artwork could not be loaded.");
    };
    img.src = "/figma/lens-artwork-hq.png";
    const observer = new ResizeObserver(() => drawRef.current?.());
    observer.observe(canvas);
    const redraw = () => drawRef.current?.();
    const face = canvas.parentElement;
    face?.addEventListener("transitionend", redraw);
    window.addEventListener("resize", redraw);
    const lost = (e: Event) => {
      e.preventDefault();
      setError("Graphics context lost. Reload to restore the lens.");
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      observer.disconnect();
      face?.removeEventListener("transitionend", redraw);
      window.removeEventListener("resize", redraw);
      canvas.removeEventListener("webglcontextlost", lost);
      drawRef.current = null;
      cleanup();
    };
  }, []);
  useEffect(() => {
    current.current = { values, geometry };
    drawRef.current?.();
  }, [values, geometry]);
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label="Live glass shader"
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {error && (
        <p
          role="alert"
          className="absolute inset-0 bg-black p-4 text-sm text-white"
        >
          {error}
        </p>
      )}
    </>
  );
}
