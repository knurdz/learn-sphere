export function sanitizeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^\w.\- ]/g, "");
  return normalized.trim().replace(/\s+/g, "-").slice(0, 100) || "material";
}

export function buildMaterialStoragePath(
  userId: string,
  materialId: string,
  fileName: string,
) {
  return userId + "/" + materialId + "/" + sanitizeFileName(fileName);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
