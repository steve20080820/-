"use client";
import { useState } from "react";
import { ExamPaperView, PageSizeStyle } from "../ExamPaperView";
import { PrintToolbar } from "./PrintToolbar";
import type { ExamData } from "@/lib/types";

export function PrintExam({ exam }: { exam: ExamData }) {
  const [pages, setPages] = useState(0);
  return (
    <>
      <PageSizeStyle size={exam.paperSize} />
      <PrintToolbar
        title={exam.title}
        hint={`${exam.paperSize} · ${pages}쪽 — 인쇄 대화상자에서 용지 ${exam.paperSize}, 여백 '없음', 배율 100%, '머리글/바닥글' 해제를 선택하세요.`}
      >
        <a className="btn" href={`/print/answers/${exam.id}`}>
          정답·해설지
        </a>
      </PrintToolbar>
      <div className="relative py-8 print:p-0">
        <ExamPaperView exam={exam} onLayout={(l) => setPages(l.pages)} />
      </div>
    </>
  );
}
