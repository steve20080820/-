import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { examInclude, toExamData } from "@/lib/exam";
import { PrintExam } from "@/components/print/PrintExam";

export const dynamic = "force-dynamic";

export default async function PrintExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.examPaper.findUnique({ where: { id }, include: examInclude });
  if (!exam) notFound();
  return <PrintExam exam={toExamData(exam)} />;
}
