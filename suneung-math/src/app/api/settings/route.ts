import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activeProvider } from "@/lib/ai";

export async function GET() {
  const rows = await prisma.setting.findMany();
  return NextResponse.json({ ...Object.fromEntries(rows.map((r) => [r.key, r.value])), _aiProvider: activeProvider() });
}

/** { key: value, ... } – 빈 문자열이면 삭제 */
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  for (const [key, v] of Object.entries(body)) {
    if (key.startsWith("_")) continue;
    const value = String(v ?? "");
    if (!value) await prisma.setting.deleteMany({ where: { key } });
    else await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  return NextResponse.json({ ok: true });
}
