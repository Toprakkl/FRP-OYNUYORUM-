export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("JSON yok");
  }
}

export function readAiPayload(text: string): { narrative: string; commands: unknown[] } {
  const parsed = parseModelJson(text);
  if (!parsed || typeof parsed !== "object") throw new Error("JSON nesne değil");
  const row = parsed as Record<string, unknown>;
  const narrative = typeof row.narrative === "string" ? row.narrative.trim() : typeof row.text === "string" ? row.text.trim() : "";
  if (!narrative) throw new Error("Anlatı boş");
  let commands: unknown[] = [];
  if (Array.isArray(row.commands)) commands = row.commands;
  else if (typeof row.commands === "string") {
    try {
      const nested = JSON.parse(row.commands) as unknown;
      if (Array.isArray(nested)) commands = nested;
    } catch {
      commands = [];
    }
  }
  return { narrative: narrative.slice(0, 6000), commands };
}
