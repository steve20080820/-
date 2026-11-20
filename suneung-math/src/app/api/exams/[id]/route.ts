import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { examInclude, toExamData } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const exam = await prisma.examPaper.findUnique({ where: { id }, include: examInclude });
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(toExamData(exam));
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json();
  const items: { problemId: string; spacing?: number; breakBefore?: string }[] = Array.isArray(b.items) ? b.items : [];
  await prisma.$transaction([
    prisma.examItem.deleteMany({ where: { examId: id } }),
    prisma.examPaper.update({
      where: { id },
      data: {
        title: String(b.title ?? ""),
        period: String(b.period ?? ""),
        area: String(b.area ?? ""),
        paperSize: b.paperSize === "A4" ? "A4" : "B4",
        distribute: Boolean(b.distribute),
        showSource: Boolean(b.showSource),
        footer: String(b.footer ?? ""),
        items: {
          create: items.map((it, i) => ({
            problemId: String(it.problemId),
            order: i,
            spacing: Math.max(0, Math.min(250, Math.round(Number(it.spacing ?? 40)))),
            breakBefore: ["column", "page"].includes(String(it.breakBefore)) ? String(it.breakBefore) : "none",
          })),
        },
      },
    }),
  ]);
  const exam = await prisma.examPaper.findUnique({ where: { id }, include: examInclude });
  return NextResponse.json(toExamData(exam!));
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.examPaper.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
