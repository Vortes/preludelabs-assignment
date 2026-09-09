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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("prelude:sound-preference", "muted");
    const proto = WebGLRenderingContext.prototype;
    const bind = proto.bindFramebuffer,
      draw = proto.drawArrays;
    const bound = new WeakMap();
    proto.bindFramebuffer = function (t, f) {
      bound.set(this, f);
      return bind.call(this, t, f);
    };
    proto.drawArrays = function (...a) {
      draw.apply(this, a);
      if (!bound.get(this)) {
        const bytes = new Uint8Array(
          this.drawingBufferWidth * this.drawingBufferHeight * 4,
        );
        this.readPixels(
          0,
          0,
          this.drawingBufferWidth,
          this.drawingBufferHeight,
          this.RGBA,
          this.UNSIGNED_BYTE,
          bytes,
        );
        if (this.canvas.closest("[data-cube-scene]")) window.lastPixels = bytes;
        else window.overlayPixels = bytes;
        window.glError = this.getError();
      }
    };
  });
  await page.goto(`http://localhost:${port}`, { waitUntil: "networkidle" });
  await page.locator("main[aria-busy=false]").waitFor();
  results[label] = { states: [], errors };
  const capture = async (name) => {
    await page.waitForTimeout(400);
    results[label].states.push(
      await page.evaluate(
        async (name) => ({
          name,
          hash: Array.from(
            new Uint8Array(
              await crypto.subtle.digest("SHA-256", window.lastPixels),
            ),
          )
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
          overlayHash: Array.from(
            new Uint8Array(
              await crypto.subtle.digest("SHA-256", window.overlayPixels),
            ),
          )
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
          glError: window.glError,
          canvasSize: [
            document.querySelector("[data-cube-scene] canvas").width,
            document.querySelector("[data-cube-scene] canvas").height,
          ],
          detailTop: document
            .querySelector('[aria-label="Aesthetic contrast insight"]')
            .getBoundingClientRect().top,
        }),
        name,
      ),
    );
  };
  await capture("rest");
  await page.locator("[data-lens-nav]").focus();
  await capture("expanded");
  for (let i = 0; i < 12; i++) {
    await page
      .getByRole("button", {
        name: `Lens ${String(i + 1).padStart(2, "0")}`,
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await capture(`lens-${i + 1}`);
  }
  await page.keyboard.press("Home");
  await capture("keyboard-home");
  await page.keyboard.press("End");
  await capture("keyboard-end");
  await page.keyboard.press("Escape");
  await capture("collapsed");
  await page.setViewportSize({ width: 1024, height: 800 });
  await capture("resize");
  await page.locator("[data-lens-nav]").focus();
  await capture("resize-expanded");
  await page.locator('[aria-label="Lens conversation"]').evaluate((el) => {
    const child = Array.from(el.querySelectorAll("*")).find(
      (e) =>
        e.scrollHeight > e.clientHeight &&
        getComputedStyle(e).overflowY === "auto",
    );
    if (child) child.scrollTop = 150;
  });
  await capture("scroll");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("Mobile coming soon").waitFor({ state: "visible" });
  results[label].mobileCanvases = await page.locator("canvas").count();
  await page.close();
}
results.matches = results.baseline.states.map((s, i) => ({
  name: s.name,
  exactShaderPixels: s.hash === results.candidate.states[i].hash,
  exactHighlights: s.overlayHash === results.candidate.states[i].overlayHash,
  cardDelta: results.candidate.states[i].detailTop - s.detailTop,
}));
await fs.writeFile(
  path.join(output, "validation.json"),
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      matches: results.matches,
      errors: [results.baseline.errors, results.candidate.errors],
      mobileCanvases: [
        results.baseline.mobileCanvases,
        results.candidate.mobileCanvases,
      ],
    },
    null,
    2,
  ),
);
await browser.close();

if (
  results.matches.some(
    (state) =>
      !state.exactShaderPixels ||
      !state.exactHighlights ||
      Math.abs(state.cardDelta) > 0.02,
  ) ||
  [results.baseline, results.candidate].some(
    (run) =>
      run.errors.length ||
      run.mobileCanvases !== 0 ||
      run.states.some((state) => state.glError !== 0),
  )
) {
  throw new Error(
    "Visual or functional validation failed; inspect validation.json",
  );
}
