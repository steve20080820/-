import { notFound } from "next/navigation";
import { prisma, problemInclude, toProblemData } from "@/lib/db";
import { ProblemEditor } from "@/components/editor/ProblemEditor";
import { StudyPanel } from "@/components/StudyPanel";

export const dynamic = "force-dynamic";

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.problem.findUnique({ where: { id }, include: problemInclude });
  if (!row) notFound();
  const p = toProblemData(row);
  return (
    <div className="space-y-6 px-6 pb-10">
      <ProblemEditor key={p.id} initial={p} />
      <StudyPanel problem={p} />
    </div>
  );
}
