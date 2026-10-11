export function formatWorldTime(hours: number): string {
  const whole = Math.max(0, Math.floor(hours));
  const clock = whole % 24;
  const day = Math.floor(whole / 24) + 1;
  return `Gün ${day}, ${String(clock).padStart(2, "0")}:00`;
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

export function xpThreshold(level: number): number {
  return Math.max(1, level) * 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function slug(input: string): string {
  const s = input
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]+/gi, "-")
    .replace(/^-|-$/g, "");
  return s || "macera";
}

export function tokens(input: string): string[] {
  return input
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşüâîû\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");
}

export function clip(input: string, max: number): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}
