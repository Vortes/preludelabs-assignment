diagnostic(off,derivative_uniformity);

const PI: f32 = 3.14159265358979323846;

struct Uniforms {
  centerPos: vec2f,
  angle: f32,
  size: f32,
  amount: f32,
  seamlessness: f32,
  frost: f32,
  iorDispersion: f32,
  patternType: u32,
  pixelWrapMode: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var inputTexture: texture_2d<f32>;
@group(0) @binding(3) var inputSamplerClamp: sampler;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VsOut {
  var o: VsOut;
  o.position = vec4f(pos, 0.0, 1.0);
  o.uv = uv;
  return o;
}

fn rot(a: f32) -> mat2x2f {
  let c = cos(a);
  let s = sin(a);
  return mat2x2f(c, s, -s, c);
}

fn wave(t: f32, freq: f32, amp: f32) -> f32 {
  return sin(t * freq * 2.0 * PI) * amp;
}

fn zigzag(t: f32, freq: f32, amp: f32) -> f32 {
  let p = t * freq;
  return (abs(fract(p) * 2.0 - 1.0) * 2.0 - 1.0) * amp;
}

// Value noise helper
fn hash3(p: vec3f) -> f32 {
  var pp = p;
  pp = fract(pp * 0.3183099 + vec3f(0.1, 0.1, 0.1));
  pp *= 17.0;
  return fract(pp.x * pp.y * pp.z * (pp.x + pp.y + pp.z));
}

fn vnoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash3(i + vec3f(0.0, 0.0, 0.0)), hash3(i + vec3f(1.0, 0.0, 0.0)), u.x),
      mix(hash3(i + vec3f(0.0, 1.0, 0.0)), hash3(i + vec3f(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash3(i + vec3f(0.0, 0.0, 1.0)), hash3(i + vec3f(1.0, 0.0, 1.0)), u.x),
      mix(hash3(i + vec3f(0.0, 1.0, 1.0)), hash3(i + vec3f(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

fn patternHeight(p: vec2f) -> f32 {
  var pos = p - u.centerPos;
  pos = rot(u.angle) * pos;
  pos /= u.size;

  let waveFreq_scaled = 0.15;
  let waveP = pos.y;

  if (u.patternType == 2u) {
    pos.x += wave(waveP, waveFreq_scaled, 0.6);
  } else if (u.patternType == 1u) {
    pos.x += zigzag(waveP, waveFreq_scaled, 0.6);
  }

  let gridPos = fract(pos) * 2.0 - 1.0;

  var height = 1.0;

  if (u.patternType == 0u || u.patternType == 1u || u.patternType == 2u) {
    height = pow(sin((gridPos.x * 0.5 + 0.5) * PI), 0.7);
  } else if (u.patternType == 3u) {
    height = 1.0 - dot(gridPos, gridPos);
  } else if (u.patternType == 4u) {
    let absUV = abs(gridPos);
    height = 1.0 - max(absUV.x, absUV.y) * dot(gridPos, gridPos) * 0.8;
  } else if (u.patternType == 5u) {
    let d = abs(gridPos * 1.125) - vec2f(0.5);
    height = 1.0 - saturate(length(max(d, vec2f(0.0))) + max(d.x, d.y));
  }

  height = saturate(height);
  height *= pow(height, u.seamlessness);

  if (u.frost > 0.0001) {
    height += (vnoise(vec3f(p * 0.5, 1.0)) - 0.5) * u.frost;
  }

  return height;
}

fn patternNormals(p: vec2f) -> vec3f {
  let height = patternHeight(p);
  let offset = vec2f(0.125, 0.0);
  let h1 = patternHeight(p + offset.xy);
  let v1 = patternHeight(p + offset.yx);
  return normalize(vec3f(height - vec2f(h1, v1), 0.0125));
}

fn sampleWithWrap(pixelPos: vec2f, dims: vec2f) -> vec4f {
  // wrapMode: 0=zero, 1=clamp, 2=repeat, 3=mirror
  var sampleUv = pixelPos / dims;
  if (u.pixelWrapMode == 0u) {
    if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) {
      return vec4f(0.0);
    }
    return textureSampleLevel(inputTexture, inputSamplerClamp, clamp(sampleUv, vec2f(0.0), vec2f(1.0)), 0.0);
  } else if (u.pixelWrapMode == 1u) {
    return textureSampleLevel(inputTexture, inputSamplerClamp, clamp(sampleUv, vec2f(0.0), vec2f(1.0)), 0.0);
  } else if (u.pixelWrapMode == 2u) {
    return textureSampleLevel(inputTexture, inputSampler, fract(sampleUv), 0.0);
  } else {
    // mirror
    let m = fract(sampleUv * 0.5) * 2.0;
    let mirrored = vec2f(
      select(m.x, 2.0 - m.x, m.x > 1.0),
      select(m.y, 2.0 - m.y, m.y > 1.0)
    );
    return textureSampleLevel(inputTexture, inputSamplerClamp, clamp(mirrored, vec2f(0.0), vec2f(1.0)), 0.0);
  }
}

@fragment
fn fs_main(@builtin(position) fragPos: vec4f, @location(0) uv: vec2f) -> @location(0) vec4f {
  let dims = vec2f(textureDimensions(inputTexture, 0));
  let localPos = uv * dims;

  let msaaSamples = 6;
  let msaaScale = 1.0;
  let ray = vec3f(0.0, 0.0, -1.0);

  var iorR = 1.333 + u.iorDispersion;
  var iorG = 1.333;
  var iorB = 1.333 - u.iorDispersion;

  var accum = vec4f(0.0);

  for (var i = 0; i < msaaSamples; i++) {
    for (var j = 0; j < msaaSamples; j++) {
      let offset = vec2f(f32(i), f32(j)) / f32(msaaSamples) - (f32(msaaSamples) - 1.0) / f32(msaaSamples) * 0.5;
      let samplePos = localPos + offset * msaaScale;

      let nor = patternNormals(samplePos);

      let rDirR = refract(ray, nor, iorR);
      let rDirG = refract(ray, nor, iorG);
      let rDirB = refract(ray, nor, iorB);

      let amountScaled = u.amount;

      let colR = sampleWithWrap(localPos + rDirR.xy * amountScaled, dims);
      let colG = sampleWithWrap(localPos + rDirG.xy * amountScaled, dims);
      let colB = sampleWithWrap(localPos + rDirB.xy * amountScaled, dims);

      accum.r += colR.r;
      accum.g += colG.g;
      accum.b += colB.b;
      accum.a += colG.a;
    }
  }

  let total = f32(msaaSamples * msaaSamples);
  return accum / total;
}
