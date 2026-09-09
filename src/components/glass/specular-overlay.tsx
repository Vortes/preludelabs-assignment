"use client";

import { useEffect, useRef } from "react";
import { vertexShader } from "./shader";
import { specularGLSL } from "./specular-shader";

const fragment = `
precision highp float;
varying vec2 uv;
uniform vec2 dimensions;
uniform float radius, angle, intensity, softness;
${specularGLSL}
float sdf(vec2 p) {
 vec2 q=abs(p)-(dimensions*.5-radius);
 return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
}
void main() {
 vec2 p=(vec2(uv.x,1.-uv.y)-.5)*dimensions;
 float d=sdf(p);
 vec2 gradient=vec2(sdf(p+vec2(.1,0.))-sdf(p-vec2(.1,0.)),sdf(p+vec2(0.,.1))-sdf(p-vec2(0.,.1)));
 vec2 n=gradient/max(length(gradient),.00001);
 float highlight=specularHighlight(d,n,angle,intensity,softness);
 gl_FragColor=vec4(vec3(highlight),highlight);
}`;

/** One transparent context draws the light response of all marked UI surfaces. */
export function SpecularOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!canvas || !host || !gl) return;
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    if (!program || !buffer) return;
    const shaders: WebGLShader[] = [];
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexShader],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) continue;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(
        "Specular highlight shader:",
        gl.getProgramInfoLog(program),
      );
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
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
    const uniforms = Object.fromEntries(
      ["dimensions", "radius", "angle", "intensity", "softness"].map((key) => [
        key,
        gl.getUniformLocation(program, key),
      ]),
    );
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    let frame = 0;
    const draw = () => {
      frame = 0;
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const rootStyle = getComputedStyle(host);
      const angle = Number(
        rootStyle.getPropertyValue("--specular-angle").trim() || 180,
      );
      const strength = Number(
        rootStyle.getPropertyValue("--specular-strength").trim() || 1,
      );
      host
        .querySelectorAll<HTMLElement>("[data-glass-highlight]")
        .forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const style = getComputedStyle(element);
          if (style.visibility === "hidden" || element.closest("[hidden]"))
            return;
          let left = Math.max(bounds.left, rect.left),
            right = Math.min(bounds.right, rect.right),
            top = Math.max(bounds.top, rect.top),
            bottom = Math.min(bounds.bottom, rect.bottom);
          for (
            let parent = element.parentElement;
            parent && parent !== host;
            parent = parent.parentElement
          ) {
            const parentStyle = getComputedStyle(parent);
            if (/(auto|scroll|hidden|clip)/.test(parentStyle.overflow)) {
              const clip = parent.getBoundingClientRect();
              left = Math.max(left, clip.left);
              right = Math.min(right, clip.right);
              top = Math.max(top, clip.top);
              bottom = Math.min(bottom, clip.bottom);
            }
          }
          host
            .querySelectorAll<HTMLElement>("[data-glass-occluder]")
            .forEach((occluder) => {
              if (element === occluder || element.contains(occluder)) return;
              const clip = occluder.getBoundingClientRect();
              if (clip.left <= left && clip.right >= right && clip.top > top)
                bottom = Math.min(bottom, clip.top);
            });
          if (right <= left || bottom <= top) return;
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(
            Math.round((left - bounds.left) * ratio),
            Math.round((bounds.bottom - bottom) * ratio),
            Math.round((right - left) * ratio),
            Math.round((bottom - top) * ratio),
          );
          gl.viewport(
            Math.round((rect.left - bounds.left) * ratio),
            Math.round((bounds.bottom - rect.bottom) * ratio),
            Math.round(rect.width * ratio),
            Math.round(rect.height * ratio),
          );
          gl.uniform2f(uniforms.dimensions!, rect.width, rect.height);
          gl.uniform1f(
            uniforms.radius!,
            Math.min(
              parseFloat(style.borderTopLeftRadius) || 0,
              rect.width / 2,
              rect.height / 2,
            ),
          );
          gl.uniform1f(uniforms.angle!, angle);
          gl.uniform1f(
            uniforms.intensity!,
            (element.dataset.glassHighlight === "heavy" ? 80 : 20) * strength,
          );
          gl.uniform1f(
            uniforms.softness!,
            element.dataset.glassHighlight === "heavy" ? 2 : 1,
          );
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(host);
    const mutation = new MutationObserver(schedule);
    mutation.observe(host, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["style", "class", "hidden", "data-expanded"],
    });
    host.addEventListener("scroll", schedule, true);
    host.addEventListener("transitionend", schedule);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      host.removeEventListener("scroll", schedule, true);
      host.removeEventListener("transitionend", schedule);
      window.removeEventListener("resize", schedule);
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20,
      }}
    />
  );
}
