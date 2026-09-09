# Performance comparison

Open `index.html` for the audit and proposed cleanup. The implementation preserves authored motion settings; organization changes are proposals only.

The comparison uses baseline commit `13fc9d1` and the five application files changed by `codex/animation-performance`. Concurrent conversation/card styling edits in the main workspace were excluded from both isolated builds.

## Reproduce

Create two isolated checkouts, install dependencies, generate Prisma, and build each using the demo's documented environment mode:

```sh
bun install
SKIP_ENV_VALIDATION=1 bun run build
```

Start the baseline on port 3100 and the candidate on 3101:

```sh
SKIP_ENV_VALIDATION=1 bun run start -- -p 3100
# In the candidate checkout:
SKIP_ENV_VALIDATION=1 bun run start -- -p 3101
```

The evidence scripts use Playwright as an external audit tool, not an application dependency. With Playwright installed in a separate tools directory, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. Optionally set `CHROMIUM_PATH` to an existing compatible Chromium executable; otherwise Playwright uses its installed browser. `OUTPUT_DIR` defaults to `/tmp/prelude-perf-results`.

```sh
node docs/performance-review/benchmark.mjs
node docs/performance-review/validate.mjs
```

Run these sequentially, with no simultaneous builds or browser tests. The benchmark patches browser APIs to count work and records draw/RAF intervals; instrumentation adds overhead. It is a local lab sample, not a statistically robust device benchmark. The validation script performs synchronous pixel readbacks only for visual testing; never use its timings for performance claims.

Pixel hashes cover settled scenes (all twelve lenses), reduced motion, Home/End/Escape navigation, resizing, and sidebar scrolling. The mobile check verifies the existing placeholder and unmounted desktop canvases after resizing. It does not test cold mobile initialization. Intermediate animation pixels, Safari, slower GPUs, field INP and GPU timing remain unverified. The detail card's transform produces a subpixel placement difference up to 0.0142 CSS px in the tested viewports; shader and highlight pixels match exactly.

The local preview checkouts created for this review are `/tmp/prelude-performance-baseline` and `/tmp/prelude-performance-candidate`. They reuse this workspace's dependency/generated directories. Reinstall dependencies if recreating them elsewhere. The report can be served with `python3 -m http.server 3102 --directory docs/performance-review`.
