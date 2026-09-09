import { fragmentShader, vertexShader } from "./shader";
import { type GlassGeometry } from "./glass-canvas";
import { type GlassValues } from "./presets";

// Keep the authored optical equations; project their sample points through the
// moving glass onto the stationary artwork instead of attaching an image to it.
const projectedFragmentShader = fragmentShader.replace(
  "vec3 scene(vec2 p) {",
  `uniform vec3 faceCenter, faceRight;
uniform float cameraDistance;
vec3 scene(vec2 p) {
  vec3 world = faceCenter + faceRight * (p.x - dimensions.x * .5)
    + vec3(0., dimensions.y * .5 - p.y, 0.);
  vec2 projected = world.xy * cameraDistance / max(1., cameraDistance - world.z);
  p = vec2(projected.x, -projected.y) + imageOffset + imageSize * .5;`,
);

export function createOriginalLensPass(
  gl: WebGLRenderingContext,
  textureUnit: number,
) {
  const program = gl.createProgram();
  const framebuffer = gl.createFramebuffer();
  const texture = gl.createTexture();
  const buffer = gl.createBuffer();
  const shaders: WebGLShader[] = [];
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
  };
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexShader],
    [gl.FRAGMENT_SHADER, projectedFragmentShader],
  ] as const) {
    const shader = gl.createShader(type)!;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      dispose();
      throw new Error(error ?? "Original shader compilation failed");
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    dispose();
    throw new Error(error ?? "Original shader linking failed");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Every sampler must be complete, including faces behind the artwork plane.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  // The attachment stays the same even when its texture storage is resized.
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const location = (name: string) => {
    if (!uniforms.has(name))
      uniforms.set(name, gl.getUniformLocation(program, name));
    return uniforms.get(name) ?? null;
  };
  const position = gl.getAttribLocation(program, "position");
  let previousValues: GlassValues | undefined;
  let previousGeometry: number[] = [];
  let previousWidth = 0,
    previousHeight = 0;
  return {
    dispose,
    render(
      values: GlassValues,
      geometry: GlassGeometry,
      artwork: WebGLTexture,
      textureSize: number,
      resolution: number,
      projection: { center: number[]; right: number[]; camera: number },
    ) {
      const dimensions = [
        geometry.width, geometry.height, geometry.imageSize,
        geometry.imageX, geometry.imageY, textureSize, resolution,
        ...projection.center, ...projection.right, projection.camera,
      ];
      if (values === previousValues &&
        dimensions.every((value, index) => value === previousGeometry[index])) return;
      previousValues = values;
      previousGeometry = dimensions;
      const width = resolution,
        height = resolution;
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (width !== previousWidth || height !== previousHeight) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        previousWidth = width;
        previousHeight = height;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, artwork);
      gl.uniform1i(location("artwork"), 0);
      gl.uniform3fv(location("faceCenter"), projection.center);
      gl.uniform3fv(location("faceRight"), projection.right);
      gl.uniform1f(location("cameraDistance"), projection.camera);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(location("dimensions"), geometry.width, geometry.height);
      gl.uniform2f(
        location("pixelStep"),
        geometry.width / width,
        geometry.height / height,
      );
      gl.uniform2f(location("imageOffset"), geometry.imageX, geometry.imageY);
      gl.uniform1f(location("imageSize"), geometry.imageSize);
      gl.uniform1f(location("textureSize"), textureSize);
      for (const [key, value] of Object.entries(values))
        gl.uniform1f(location(key), Number(value));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
  };
}
