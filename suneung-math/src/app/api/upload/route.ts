import { NextRequest, NextResponse } from "next/server";
import { parseDataUrl, saveFile } from "@/lib/storage";

const ALLOWED = ["png", "jpg", "jpeg", "webp", "gif"];

/** 이미지 업로드: JSON {dataUrl} 또는 multipart(file) */
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  let ext = "png";
  let buf: Buffer;
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
    ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    buf = Buffer.from(await file.arrayBuffer());
  } else {
    const { dataUrl } = await req.json();
    const parsed = parseDataUrl(String(dataUrl ?? ""));
    if (!parsed) return NextResponse.json({ error: "invalid dataUrl" }, { status: 400 });
    ext = parsed.ext;
    buf = parsed.buf;
  }
  if (!ALLOWED.includes(ext)) return NextResponse.json({ error: "PNG/JPG/WEBP 이미지만 업로드할 수 있습니다." }, { status: 400 });
  if (buf.length > 15 * 1024 * 1024) return NextResponse.json({ error: "15MB 이하만 가능합니다." }, { status: 413 });
  const saved = await saveFile("uploads", ext === "jpeg" ? "jpg" : ext, buf);
  return NextResponse.json(saved, { status: 201 });
}
