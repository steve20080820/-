import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/** 업로드 파일은 public/ 이 아닌 DATA_DIR 에 저장하고 /api/files/* 로 서빙합니다.
 *  (빌드 이후 추가된 public 파일은 next start 에서 서빙되지 않기 때문) */
export const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || "./data");
export const BUCKETS = ["uploads", "fonts"] as const;
export type Bucket = (typeof BUCKETS)[number];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export function mimeOf(file: string) {
  return MIME[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export function fileUrl(bucket: Bucket, name: string) {
  return `/api/files/${bucket}/${name}`;
}

export async function saveFile(bucket: Bucket, ext: string, data: Buffer, name?: string) {
  const dir = path.join(DATA_DIR, bucket);
  await fs.mkdir(dir, { recursive: true });
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const fileName = name ?? `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}.${safeExt}`;
  await fs.writeFile(path.join(dir, fileName), data);
  return { fileName, url: fileUrl(bucket, fileName) };
}

export function resolveFile(bucket: string, name: string): string | null {
  if (!(BUCKETS as readonly string[]).includes(bucket)) return null;
  if (!/^[\w.\-]+$/.test(name)) return null; // 경로 조작 방지
  return path.join(DATA_DIR, bucket, name);
}

export function parseDataUrl(dataUrl: string): { mime: string; ext: string; buf: Buffer } | null {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const ext = Object.entries(MIME).find(([, v]) => v === mime)?.[0] ?? "png";
  return { mime, ext, buf: Buffer.from(m[2], "base64") };
}

export async function listFiles(bucket: Bucket) {
  try {
    return await fs.readdir(path.join(DATA_DIR, bucket));
  } catch {
    return [];
  }
}
