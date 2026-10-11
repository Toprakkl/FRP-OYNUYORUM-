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

export function readAiPayload(text: string): { narrative: string; commands: unknown[]; checkStat: string; checkDc: number | null; checkReason: string } {
  const parsed = parseModelJson(text);
  if (!parsed || typeof parsed !== "object") throw new Error("JSON nesne değil");
  const row = parsed as Record<string, unknown>;
  const narrative = typeof row.narrative === "string" ? row.narrative.trim() : typeof row.text === "string" ? row.text.trim() : "";
  const nested = row.check && typeof row.check === "object" ? (row.check as Record<string, unknown>) : null;
  const checkStat = typeof row.check_stat === "string" ? row.check_stat : typeof nested?.stat === "string" ? nested.stat : "";
  const dcSource = row.check_dc ?? nested?.dc;
  const checkDc = typeof dcSource === "number" && Number.isFinite(dcSource) ? dcSource : null;
  const reasonSource = row.check_reason ?? nested?.reason;
  const checkReason = typeof reasonSource === "string" ? reasonSource : "";
  let commands: unknown[] = [];
  if (Array.isArray(row.commands)) commands = row.commands;
  else if (typeof row.commands === "string") {
    try {
      const nestedCommands = JSON.parse(row.commands) as unknown;
      if (Array.isArray(nestedCommands)) commands = nestedCommands;
    } catch {
      commands = [];
    }
  }
  if (!narrative && !checkStat.trim()) throw new Error("Anlatı boş");
  return { narrative: narrative.slice(0, 6000), commands, checkStat, checkDc, checkReason };
}
