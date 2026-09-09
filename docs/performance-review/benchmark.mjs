const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import fs from "node:fs/promises";
import path from "node:path";
const output = process.env.OUTPUT_DIR || "/tmp/prelude-perf-results";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const results = {};
for (const [label, port] of [
  ["baseline", 3100],
  ["candidate", 3101],
]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /WebGL.*(INVALID|incomplete)/i.test(m.text()))
      errors.push(m.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("prelude:sound-preference", "muted");
    const fresh = () => ({
      scene: 0,
      optics: 0,
      overlay: 0,
      clears: 0,
      resizes: 0,
      rects: 0,
      styles: 0,
      attachments: 0,
      intervals: [],
      sceneTimes: [],
    });
    window.stats = fresh();
    window.resetStats = () => {
      window.stats = fresh();
    };
    const fb = new WeakMap();
    const wrap = (obj, key, fn) => {
      const old = obj[key];
      obj[key] = function (...a) {
        fn.call(this, ...a);
        return old.apply(this, a);
      };
    };
    wrap(WebGLRenderingContext.prototype, "bindFramebuffer", function (t, b) {
      fb.set(this, b);
    });
    wrap(WebGLRenderingContext.prototype, "drawArrays", function () {
      const kind = this.canvas.closest("[data-cube-scene]")
        ? fb.get(this)
          ? "optics"
          : "scene"
        : "overlay";
      window.stats[kind]++;
      if (kind === "scene") window.stats.sceneTimes.push(performance.now());
    });
    wrap(WebGLRenderingContext.prototype, "clear", function () {
      window.stats.clears++;
    });
    wrap(WebGLRenderingContext.prototype, "framebufferTexture2D", function () {
      window.stats.attachments++;
    });
    wrap(Element.prototype, "getBoundingClientRect", function () {
      window.stats.rects++;
    });
    wrap(window, "getComputedStyle", function () {
      window.stats.styles++;
    });
    for (const key of ["width", "height"]) {
      const d = Object.getOwnPropertyDescriptor(
        HTMLCanvasElement.prototype,
        key,
      );
      Object.defineProperty(HTMLCanvasElement.prototype, key, {
        ...d,
        set(v) {
          window.stats.resizes++;
          d.set.call(this, v);
        },
      });
    }
    let last;
    const tick = (t) => {
      if (last) window.stats.intervals.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`http://localhost:${port}`, { waitUntil: "networkidle" });
  await page.locator("main[aria-busy=false]").waitFor();
  await page.waitForTimeout(500);
  const sample = async (name, action) => {
    await page.evaluate(() => window.resetStats());
    if (action) await action();
    await page.waitForTimeout(1600);
    const s = await page.evaluate(() => window.stats);
    const sceneIntervals = s.sceneTimes
      .slice(1)
      .map((t, i) => t - s.sceneTimes[i])
      .filter((t) => t > 0.5)
      .sort((a, b) => a - b);
    const sorted = s.intervals.slice().sort((a, b) => a - b);
    results[label][name] = {
      ...s,
      intervals: undefined,
      sceneTimes: undefined,
      sceneP50: sceneIntervals[Math.floor(sceneIntervals.length * 0.5)] ?? null,
      sceneP95:
        sceneIntervals[Math.floor(sceneIntervals.length * 0.95)] ?? null,
      frames: sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      over25: sorted.filter((x) => x > 25).length,
    };
  };
  results[label] = {};
  await sample("idle");
  await page.screenshot({ path: `${output}/${label}-rest.png` });
  const nav = page.locator("[data-lens-nav]");
  const box = await nav.boundingBox();
  await sample("expand", () =>
    page.mouse.move(box.x + box.width / 2, box.y + box.height - 15),
  );
  await page.screenshot({ path: `${output}/${label}-expanded.png` });
  await sample("rotate", () =>
    page.getByRole("button", { name: "Lens 02", exact: true }).click(),
  );
  await page.screenshot({ path: `${output}/${label}-rotated.png` });
  await sample("collapse", () => page.mouse.move(1000, 150));
  await page.screenshot({ path: `${output}/${label}-collapsed.png` });
  results[label].errors = errors;
  await context.close();
}
await fs.writeFile(
  path.join(output, "metrics.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
await browser.close();
