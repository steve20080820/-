"use client";

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** 큰 이미지는 AI 전송/저장 전에 축소 (긴 변 maxSide px) */
export async function downscale(dataUrl: string, maxSide = 2000): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  if (s >= 1 && dataUrl.startsWith("data:image/png")) return dataUrl;
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * s);
  cv.height = Math.round(img.naturalHeight * s);
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/png");
}

export async function uploadDataUrl(dataUrl: string): Promise<string> {
  const r = await api<{ url: string }>("/api/upload", { method: "POST", json: { dataUrl } });
  return r.url;
}

export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  return fileToDataUrl(await res.blob());
}
