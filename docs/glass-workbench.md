# Glass workbench

`/` is the responsive interface shell. `/prototype` is the disposable lens workbench. Both show “Mobile coming soon” below 768 CSS pixels. The shell fills the viewport, caps the conversation panel, and fits the stage to the remaining width and height; DialKit values remain expressed in reference Figma pixels.

## Components

- `components/app-shell.tsx`: responsive layout and slot placement.
- `components/interface/`: conversation, navigation, insight callout, footer, and shell tuning defaults.
- `components/glass/lens-scene.tsx`: artwork, front/rear face, side faces, and callout composition.
- `components/glass/glass-canvas.tsx`: WebGL lifecycle and uniform updates; renders only when values or geometry change.
- `components/glass/shader.ts`: glass surface and patterned refraction.
- `components/glass/figma-presets.json`: all 12 small and large presets, including source node IDs.
- `components/glass/lens-selector.tsx`: keyboard-accessible variant navigation using exported Figma thumbnails.

## Reference and rendering limits

Source: Workshop — Alan Wang, file `yoXNrh28ZzmmCXldwcMgiJ`, Lens Library `4001:11166`. Small presets: `4001:13020`; large: `4001:13007`. Rest: `4001:3945`; expanded references: `4001:4012` and `4001:4085`.

At rest, the 852 × 290 lens is wider than the 600 × 600 artwork. Its center is 165px below the artwork top, across the audience's upper third. Hovering/focusing variant navigation reveals square faces: a rear plane behind the smaller artwork and angled side planes. Pin rest/expanded to inspect either state independently. Chat remains a placeholder.

`figma-pattern-refraction.wgsl` preserves the authored Figma pattern shader. The browser implementation ports its height fields, normals, refraction, parameter mappings, and wrap modes into GLSL. It uses four subpixel samples instead of Figma's 36 for interactive rendering. Figma's built-in GLASS effect is not provided as source and remains an approximation. Exact preset import does not mean pixel-identical output. The cube is an initial 2.5D interaction study, not a complete Spline animation port.

Large and small presets have independent saved DialKit values. Reset restores the selected source preset and reference layout. Controls include the glass parameters, patterned distortion, focal position, resting size, square size, spread, and side rotation. Reduced-motion preferences disable transitions.

### Chat surfaces and Figma comments

`src/components/interface/glass-surface.module.css` contains the reusable chat material. Cards and the composer share Figma's light 180° / intensity 20%, refraction 100, depth 100, dispersion 100, frost 2, splay 100 reference. The outer panel instead has frost 30, depth 62, light intensity 80%. CSS backdrop blur and inset lighting approximate the native Figma GLASS renderer; they do not reproduce its refraction or dispersion exactly. Card gradient strokes are disabled in Figma and remain disabled here. The composer retains its separate gray outline.

The source stack and both aura images are exports of their actual nested instances in frame 4001:3945. The voice waveform is exported directly from the composer instance because the generated design-context asset incorrectly returned a circle. Other controls use the design-context SVG exports. The chat footer's utility row is opacity zero in the reference; its visible handle is retained.

### Optical refraction model

The clear-glass pass now follows the surface-normal → Snell refraction → background-plane projection described in [Liquid Glass in the Browser](https://kube.io/blog/liquid-glass-css-svg/). It evaluates the vector field directly in WebGL, avoiding an 8-bit SVG displacement texture and the article's Chromium-only SVG backdrop-filter dependency. The pattern pass remains separate.

Refraction maps 0–100 to refractive index 1–1.5. A convex squircle bezel supplies the slope; splay widens its coverage from 12% to 100% of the short half-axis. Depth sets the optical path in design pixels. Splay also fans the normals and tapers the path toward the side centers to reproduce the wide reference's pinched silhouette. Those Figma mappings are visual calibrations, not recovered proprietary equations. RGB rays use slightly different indices for dispersion; at zero refraction all three indices are 1 and there is no displacement. Depth zero also produces zero displacement. Lighting is an independent rim term.

The previous model only displaced an arbitrary edge strip, using depth × 0.45 for width and depth × 0.8 for maximum bending. Matching its slider numbers could not match Figma's broad warping. The new field is measured in design pixels and therefore scales with the lens on screen.

### Artwork and edge sampling

The interface and shader both use the supplied 2400 × 2400 `lens-artwork-hq.png`. Clear glass now integrates four subpixel rays per output pixel, as the patterned pass already did. Sample offsets use the framebuffer's footprint in design coordinates. Canvas resolution follows its transformed screen bounds at up to 2× device pixel ratio, with a 4096-pixel dimension limit; it is refreshed after the rest/expanded transition. Texture alpha is composited against the scene background so the exported artwork's transparent corners do not become black fringes. These changes target raster aliasing without increasing frost or weakening refraction.

Dispersion's spectral-index spread is calibrated to 0.4 × (index − 1) at 100, increased from 0.08. This gives the reference's pronounced red/orange and cyan fringes at strong bends. It remains zero when either dispersion or refraction is zero; the neutral green ray and underlying geometric refraction are unchanged.

The optical field uses a smooth maximum at the nearest-edge joins, independently of the exact rounded-rectangle clipping SDF. Wide lenses taper the optical path with the squared vertical component of the surface normal, blended by aspect ratio and splay. This prevents chromatic refraction from wrapping down the outer side edges. Square lenses retain their full perimeter refraction. This taper is a reference-specific calibration, not a formula supplied by the article.

### Main interface integration

The app shell uses the same `GlassCanvas` renderer and twelve imported presets as the prototype. `InterfacePreview` owns the active lens and expanded navigation state. `WorkspaceFooter` follows Figma's Nav.hover slider (4001:4015) and Overflow (max # items) frame (4001:11026): 64px thumbnails, 8px gaps, 16px container padding, 32px radius, blue selected outline, masked overflow and directional buttons. With all twelve presets loaded, Add custom is disabled as in the maximum-items reference. Arrow keys, Home/End, horizontal scrolling, and previous/next buttons expose the full set; Escape collapses navigation. Hover/focus expands the scene. Mobile retains the existing coming-soon screen.

### Shared specular pass

`specular-shader.ts` supplies the same directional rim-light function to the refractive artwork shader and the UI highlight overlay. Brightness follows the rounded surface normal's alignment with the light, with a weaker opposing reflection and a soft inward falloff. The artwork shader no longer adds a uniform white border.

`SpecularOverlay` uses one transparent WebGL context for marked UI surfaces, including the already verified glass chat cards, composer and heavy outer panel. It clips highlights to scrolling ancestors and the composer, and redraws on layout/scroll changes. Existing Figma-authored strokes remain separate. Interface shell → Highlights controls the UI light angle and intensity multiplier. This is a shared specular pass; UI background refraction still uses the previously documented CSS approximation. The user’s 10:24 reference screenshots confirm the lens cards and Content / Details / Links pills as specular surfaces. These targets use the shared pass without inset-shadow substitutes; the outlined Overview / Purpose / Inspiration tabs retain their separate border styling. The transparent overlay uses premultiplied alpha throughout to avoid attenuating highlight strength twice.
