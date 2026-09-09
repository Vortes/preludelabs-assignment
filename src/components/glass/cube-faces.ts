export const quarterTurn = Math.PI / 2;

// A face changes its filter only when it passes behind the artwork.
export function cubePresetsAtAngle(angle: number): number[] {
  const position = -angle / quarterTurn;
  return Array.from({ length: 4 }, (_, face) => {
    const index = face + 4 * Math.round((position - face) / 4);
    return ((index % 12) + 12) % 12;
  });
}

export function cubeRotationTarget(selected: number) {
  return -selected * quarterTurn;
}
