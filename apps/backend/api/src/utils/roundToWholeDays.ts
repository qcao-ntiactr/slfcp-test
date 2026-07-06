export const roundToWholeDays = (value: number): number => {
  // Treat tiny positive durations as at least 1 day
  if (value > 0 && value < 1) {
    return 1;
  }

  const rounded = Math.round(value);

  // Defensive: avoid returning -0 or negative days
  if (rounded <= 0) {
    return 0;
  }

  return rounded;
};
