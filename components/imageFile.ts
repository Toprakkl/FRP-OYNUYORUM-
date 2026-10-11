export async function compressImage(file: File): Promise<string> {
  if (file.size > 8_000_000) throw new Error("Görsel 8 MB sınırını aşıyor");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel okunamadı");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}
