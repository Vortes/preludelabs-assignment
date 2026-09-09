import { type DialConfig } from "dialkit";

export const shellControls = {
  panel: {
    inset: [16, 0, 48, 1],
    width: [599, 400, 760, 1],
    radius: [48, 0, 80, 1],
    contentPaddingX: [30, 0, 64, 1],
    contentPaddingTop: [44, 0, 100, 1],
    cardGap: [32, 0, 64, 1],
    composerInset: [16, 0, 48, 1],
    composerHeight: [269, 160, 360, 1],
  },
  navigation: { padding: [40, 0, 80, 1], height: [120, 64, 180, 1] },
  artwork: {
    size: [600, 320, 760, 1],
    top: [237, 140, 360, 1],
    offsetX: [0.5, -100, 100, 0.5],
    radius: [40, 0, 80, 1],
  },
  lens: {
    width: [852, 600, 1050, 1],
    height: [290, 160, 440, 1],
    top: [257, 160, 450, 1],
    offsetX: [3.5, -100, 100, 0.5],
    radius: [32, 0, 80, 1],
  },
  detail: {
    width: [326, 240, 440, 1],
    height: [231, 160, 340, 1],
    top: [683, 480, 800, 1],
    offsetX: [3.5, -100, 100, 0.5],
    padding: [24, 0, 48, 1],
    radius: [32, 0, 64, 1],
  },
  footer: {
    height: [132, 80, 200, 1],
    bottomPadding: [16, 0, 48, 1],
    gap: [10, 0, 32, 1],
  },
  highlights: { angle: [180, 0, 360, 1], strength: [1, 0, 3, 0.01] },
  showGuides: false,
  reset: { type: "action" },
} satisfies DialConfig;
