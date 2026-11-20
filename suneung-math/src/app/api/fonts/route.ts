import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { fileUrl, resolveFile, saveFile } from "@/lib/storage";

const FORMAT: Record<string, string> = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" };

export async function GET() {
  const fonts = await prisma.customFont.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(fonts.map((f) => ({ ...f, url: fileUrl("fonts", f.fileName) })));
}

/** multipart: file, family(선택) */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "폰트 파일을 선택하세요." }, { status: 400 });
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!FORMAT[ext]) return NextResponse.json({ error: ".ttf, .otf, .woff, .woff2 파일만 가능합니다." }, { status: 400 });
  const family = (String(form.get("family") || "").trim() || file.name.replace(/\.[^.]+$/, "")).replace(/["\;{}<>]/g, "");
  const saved = await saveFile("fonts", ext, Buffer.from(await file.arrayBuffer()));
  const font = await prisma.customFont.upsert({
    where: { family },
    create: { family, fileName: saved.fileName, format: FORMAT[ext] },
    update: { fileName: saved.fileName, format: FORMAT[ext] },
  });
  return NextResponse.json({ ...font, url: saved.url }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const font = await prisma.customFont.delete({ where: { id } });
  const p = resolveFile("fonts", font.fileName);
  if (p) await fs.rm(p, { force: true });
  const sel = await prisma.setting.findUnique({ where: { key: "paperFont" } });
  if (sel?.value === font.family) await prisma.setting.delete({ where: { key: "paperFont" } });
  return NextResponse.json({ ok: true });
}
