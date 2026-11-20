import { Suspense } from "react";
import { ArchiveView } from "@/components/archive/ArchiveView";

export default function ProblemsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-faint">불러오는 중…</div>}>
      <ArchiveView />
    </Suspense>
  );
}
