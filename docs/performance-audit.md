# Performance audit — September 9, 2026

The strongest opportunities are to stop unrelated highlight work, remove layout work from animation frames, and avoid optical passes whose output is never sampled. These changes can preserve the artwork, optical equations, antialiasing, blur, and motion choreography.

The intentional rotation-settle delay of up to 450 ms is excluded from this audit, per your direction. Preserve it, along with rotation paths and existing durations, while optimizing rendering.

**Evidence and limits**

- Reviewed the homepage render path at commit `52451f4`, the optical and composite shaders, navigation handlers, CSS, asset loading, and production dependencies. The working tree was clean before this report.
- Built an isolated copy with `SKIP_ENV_VALIDATION=1 next build`; compilation, lint, and type checks passed. Next resolved to 15.5.23. Homepage is statically generated; build reports 42.7 kB route size and 232 kB first-load JavaScript.
- The isolated build excluded local credentials. Its layout therefore omitted the conditional Clerk/tRPC provider tree. Production with configured credentials can have additional costs; this is not a deployed-site benchmark.
- Inspected development and isolated production pages through the browser. Production navigation opened successfully. The inspected production canvas dimensions were 971 × 750 for the scene and 2094 × 1996 for the highlight overlay; eight highlighted surfaces were present. The development-page console inspection returned no warnings/errors.
- No frame-time trace, GPU timer queries, or field INP measurements were captured. Priorities below reflect confirmed code behavior and workload analysis, not measured attribution of dropped frames. No FPS improvement percentages are claimed.
- This audit changed no application code or visual assets. Concurrent workspace edits to detail-card sizing and composer styling appeared before completion; they were inspected and left untouched. The isolated build and measurements describe the earlier snapshot. Those edits do not remove the identified scheduling, overlay, or shader work.

**Ranked changes**

| Priority | Current behavior | Recommended behavior | Quality constraint |
| --- | --- | --- | --- |
| 1 | Whole-interface mutation observer invalidates highlights during unrelated motion | Invalidate only when highlighted geometry, clipping, occlusion, or lighting changes | Keep the exact highlight shader and scissor rules |
| 1 | Highlight canvas dimensions assigned on every draw | Resize only when backing dimensions change | Same pixel density and output |
| 1 | Animation writes `top`, repeats static styles, and reads layout | Cache geometry; translate the detail card; batch reads before writes | Identical positions and blur |
| 2 | Four optical passes are considered every scene draw | Skip a pass only when its texture cannot contribute | Retain rear-face tint/edges and all visible refraction |
| 2 | GSAP updates enqueue another animation frame for scene rendering | One ordered frame pipeline for DOM and WebGL | Preserve GSAP timing, interruption, and settling |
| 2 | Shader computes optical channels the consumer discards | Evaluate only the needed channel while preserving alpha | Preserve all four samples and original optical math |
| 3 | Four copies of the same optical program are initialized | Share program and geometry across face targets | Same uniforms, shader source, and textures |
| 3 | 12.64 MB artwork requested after renderer initialization | Discover early and evaluate lossless compression | Preserve decoded pixels and color interpretation |
| 3 | DialKit controller/store code remains on production path | Separate fixed production settings from development controls | Export the exact approved parameter values |

**1. Highlight overlay: remove work unrelated to highlights**

See [specular-overlay.tsx](/Users/alan/Programming/preludelabs-assignment/src/components/glass/specular-overlay.tsx:87) and its [observer setup](/Users/alan/Programming/preludelabs-assignment/src/components/glass/specular-overlay.tsx:177).

Every overlay draw assigns both canvas dimensions, even when unchanged. This asks the browser to reset the drawing buffer unnecessarily. At the inspected size, the overlay has 4.18 million backing pixels; a single RGBA8 color buffer represents approximately 16 MiB, before additional browser buffers. This is a footprint estimate, not a measured allocation on each draw.

The observer watches style/class changes throughout the main frame. Navigation transform/opacity/clip changes and detail-card positioning therefore schedule highlight redraws even though those elements are not marked highlight surfaces. Each redraw queries all eight surfaces, obtains computed styles and bounds, walks clipping ancestors, and queries occluders again inside each surface loop. Scissoring limits individual highlight draws, but the code still clears the full overlay buffer.

Implementation:

1. Guard width/height assignments with equality checks.
2. Register highlighted surfaces and occluders once; update registration when structure changes.
3. Measure each unique clipping ancestor and occluder once per invalidation.
4. Observe actual geometry changes, relevant scroll containers, and lighting settings. Ignore motion in unrelated subtrees. Preserve invalidation when a parent really changes highlighted geometry.
5. Keep the existing full redraw initially. Consider dirty rectangles only if tracing still identifies the overlay as expensive; overlapping highlights and old/new clipping make partial clears more complex.

Expected verification: hovering/selecting lenses should not redraw static sidebar/tab highlights. Scrolling the sidebar and resizing must still update them correctly.

**2. Main-thread layout work during motion**

See [AppShell's draw callback](/Users/alan/Programming/preludelabs-assignment/src/components/app-shell.tsx:84) and [detail-card updates](/Users/alan/Programming/preludelabs-assignment/src/components/glass/exploded-cube.tsx:187).

The navigation callback reads `clientWidth`, writes styles, then reads `clientWidth` again. These particular writes do not all require layout, so this is a style/layout synchronization risk rather than proof of two forced layouts. Cache the width through ResizeObserver and keep it out of the animation callback.

The detail card writes `top` every scene draw. During expansion its position changes, making this a layout-affecting animation. `--art-unit` and blur depend only on composition width but are also assigned every draw, including rotation-only frames.

Move the unit and blur assignments to the resize path. Give the card a stable `top` anchor and express its vertical motion as a translate combined with the existing horizontal centering. Keep the same pixel positions, backdrop filter, and dimensions. Verify stacking/backdrop behavior because changing transform structure can affect compositing.

The backdrop still needs to reflect the moving scene beneath it; removing its real-time blur would change the design. The three observed 45 px backdrops elsewhere are candidates for trace inspection, not grounds to lower blur globally. Browser rendering costs depend on the affected area and underlying content. [Rendering pipeline reference](https://web.dev/articles/rendering-performance).

**3. Optical passes: stop computing unconsumed textures**

See [face render loop](/Users/alan/Programming/preludelabs-assignment/src/components/glass/exploded-cube.tsx:202), [pass cache](/Users/alan/Programming/preludelabs-assignment/src/components/glass/original-lens-pass.ts:88), and [final compositor](/Users/alan/Programming/preludelabs-assignment/src/components/glass/cube-shader.ts:60).

The scene invokes four optical passes before its final composite. The existing cache correctly skips a pass when all its inputs match, but expansion/rotation changes the projection inputs and defeats that cache. All four targets use the same square resolution, including faces that are edge-on, behind the artwork, or contribute no optical sample.

At the inspected scene width and default parameters, each target is approximately 700 × 700: four targets amount to 1.96 million optical fragments when all are redrawn, before the 728,250-pixel scene composite. These are source-derived workload counts, not GPU timings.

The compositor only samples optics for hits in front of the artwork plane. Use conservative visibility analysis to skip targets that cannot be sampled. Keep each texture valid and regenerate it before it becomes visible. Do not equate a rear-facing normal with invisibility: transparent geometry can still contribute, and partially crossing faces need conservative handling. Keep rear glass tint and edge lighting in the final composite even when its optical texture can be skipped.

Do this before changing render resolution. Rectangular targets could later reduce oversampling of short faces, but they change the sampling grid and require careful visual comparisons. Avoid resizing targets every animation frame; current stable allocations are worth retaining.

**4. Keep scene rendering on the same animation tick**

See [motion update](/Users/alan/Programming/preludelabs-assignment/src/components/interface/lens-motion.ts:46) and [scene scheduling](/Users/alan/Programming/preludelabs-assignment/src/components/glass/exploded-cube.tsx:251).

GSAP already updates from an animation-frame ticker. Its update callback immediately writes navigation styles, while the scene schedules a separate requestAnimationFrame. A frame requested from inside a frame callback runs on a subsequent opportunity, creating a potential phase mismatch between DOM and WebGL. That extra boundary is not the intentional settle delay.

Use one frame coordinator: update tween values, write DOM motion, then submit one scene render after all active tween updates. Coalesce expansion and rotation into that single render. Resize/image-load events should also mark the scene dirty. Do not render independently in both tween callbacks, which could double the GPU workload. Remove or deactivate the coordinator when nothing is changing.

Verify rapid reversals and simultaneous rotation/collapse with a trace. Preserve the existing settle callback and exact delay semantics.

**5. Shader arithmetic: preserve results while computing fewer channels**

See [glass sampling](/Users/alan/Programming/preludelabs-assignment/src/components/glass/shader.ts:69) and [pattern loop](/Users/alan/Programming/preludelabs-assignment/src/components/glass/shader.ts:124).

A patterned fragment has four integration samples. Each calls `wrappedGlass` three times for pattern dispersion. Each `glass` computes three chromatic channels, each with five artwork samples. At source level that expands to as many as 180 texture lookups per output fragment; the unpatterned path expands to 60. Compiler elimination, early returns, and texture caches can reduce actual work. These are not measured instruction counts.

The pattern consumer uses only red from one glass result, green from another, blue from the third, and alpha from the green result. A channel-specific evaluator can avoid explicitly calculating discarded channels, while retaining refraction, frost taps, highlights, alpha, and all four integration samples. The compiler may already remove some of this work, so benchmark before accepting a more complex shader.

Precompute face normals, centers, extents, and other frame-constant values once on the CPU and pass uniforms to the composite shader. They currently appear in repeated per-pixel helper calls. Preserve equations and numerical tolerances; compiler common-subexpression handling makes the benefit uncertain.

Do not remove supersampling, reduce dispersion/frost, substitute static lens images, or lower DPR as the first optimization. Those would alter the approved appearance.

**6. Startup and resource setup**

The [artwork load](/Users/alan/Programming/preludelabs-assignment/src/components/glass/exploded-cube.tsx:279) uses a 2400 × 2400 PNG of exactly 12,643,893 bytes. It is discovered inside the client effect after shader setup. The nominal RGBA8 texture is another 21.97 MiB, separate from encoded transfer and any decoded CPU image.

Preload the exact artwork URL from the page and coordinate decode/upload with renderer readiness. Evaluate lossless image compression, retaining pixel dimensions and checking decoded pixels/color handling. File compression improves transfer, not GPU texture memory. A smaller source or lossy codec is a separate quality decision and is not recommended here without optical comparisons.

[createOriginalLensPass](/Users/alan/Programming/preludelabs-assignment/src/components/glass/original-lens-pass.ts:19) compiles and links the identical shader four times, creating separate quad buffers too. Share the program and quad buffer while retaining per-face textures/framebuffers. Existing per-pass caches will need correct uniform uploads after switching faces, because uniforms belong to the shared program. Attach each texture to its framebuffer once rather than repeating attachment on every render. Browser drivers may cache identical compilation already; profile startup to establish savings. MDN recommends avoiding unnecessary framebuffer changes and considering parallel shader compilation. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

**7. Production overhead and lower-priority cleanup**

The production UI hides DialRoot, but both [AppShell](/Users/alan/Programming/preludelabs-assignment/src/components/app-shell.tsx:38) and [useLensMotion](/Users/alan/Programming/preludelabs-assignment/src/components/interface/lens-motion.ts:8) still call DialKit controllers. Inspection of installed DialKit shows these hooks subscribe to its store and resolve configuration. A production homepage chunk containing DialKit is 108,414 raw bytes / 32,526 gzip bytes; that is a whole chunk measurement, not a claim that all of it can be removed. DialKit CSS also remains in production output.

Separate immutable approved settings from development controls and put the tuning UI behind a development-only module boundary. Preserve the exact tuned values, including values that may currently come from persisted controls. Verify with the production manifest rather than assuming that hiding a component removes its package.

The root loads Geist, but the inspected main frame computes to Arial. Check other routes before removing it; scoping a font to where it is actually used can avoid an unnecessary homepage font load. Clerk/tRPC should likewise be scoped to routes that use them if the homepage remains a standalone demo.

Below 768 px the desktop is hidden, but initial viewport state starts at 1920 px, so graphics components can mount and begin initialization before ResizeObserver corrects it. Gate initialization using the real viewport, without changing the mobile placeholder. Repeated resize events also recreate shell state and redraw; equality guards and coalescing can help. These are secondary to animation-path work.

**What is already good**

Motion uses refs rather than React state on every frame. Scene draws are coalesced and are not an unconditional continuous loop. Optical targets are allocated at stable sizes and unchanged inputs are cached. Thumbnails are images rather than twelve independent WebGL contexts. Keyboard instant-selection and reduced-motion paths already exist. The homepage is static. Keep these properties; blanket memoization, virtualization of twelve thumbnails, or a new animation library would miss the primary workload.

**Implementation order and acceptance criteria**

First land overlay invalidation/resize guards, cached geometry, and detail-card translation. Next unify scheduling and conservatively skip unused optical passes. Then evaluate shader sharing/channel specialization and startup loading independently. Keep each change separately measurable and reversible.

Record the same production interactions before and after: cold load, first expansion, adjacent and distant lens selections, rapid reselection, exit during rotation, repeated enter/leave, sidebar scroll, resize, keyboard navigation, and reduced motion. Include all twelve presets and intermediate expansion/rotation positions, especially edge-on faces and artwork boundaries.

Use Chrome Performance and Safari Web Inspector on real hardware. Test 60 Hz and 120 Hz displays where available, DPR 1/2, and common laptop/desktop sizes. CPU throttling is useful for input/hydration costs but does not substitute for a slower GPU. Separate cold shader compilation from warm animation runs.

Capture p50/p95 frame intervals, long frames, main-thread style/layout/paint, scene/overlay draw counts, and asynchronous GPU timings where supported. At 60 Hz the total frame budget is 16.7 ms; at 120 Hz it is 8.3 ms. Treat these as budgets, not current measurements. Use interaction-to-first-feedback measurements for responsiveness; track the intended settle interval separately. Ordinary LCP/INP scores alone do not characterize a custom WebGL animation.

At fixed progress/angle values compare baseline and candidate captures at identical dimensions/DPR: rest, quarter/half/three-quarter expansion, fully open, face handoffs, and collapse. Require no visible differences in refraction, pattern edges, spectral fringes, highlights, text sharpness, blur, shadows, clipping, or card position. For arithmetic changes inspect difference images closely rather than relying only on a global similarity score. No change is a performance win until it improves the trace and passes these visual checks.
