import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { examInclude, toExamData } from "@/lib/exam";
import { ExamBuilder } from "@/components/builder/ExamBuilder";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.examPaper.findUnique({ where: { id }, include: examInclude });
  if (!exam) notFound();
  return <ExamBuilder initial={toExamData(exam)} />;
}
