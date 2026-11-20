// 데모 파서: 붙여넣은 문제 텍스트(또는 OCR 결과)를 휴리스틱으로 구조화합니다.
// AI 키가 없을 때 사용되며, AI 결과를 보정할 때도 쓰입니다.
import { suggestUnits } from "./units";
import type { ProblemData } from "./types";

const CIRCLE_RE = /[①②③④⑤]/;
const POINTS_RE = /\[\s*([234])\s*점\s*\]/;

export function parseProblemText(raw: string): Partial<ProblemData> {
  let text = raw.replace(/\r\n?/g, "\n").trim();
  const out: Partial<ProblemData> = {};

  // 배점
  const pm = POINTS_RE.exec(text);
  if (pm) {
    out.points = parseInt(pm[1], 10);
    text = text.replace(POINTS_RE, "").trim();
  }

  // 문항 번호 "15." 또는 "15 ."
  const nm = /^(\d{1,2})\s*\.\s+/.exec(text);
  if (nm) {
    out.sourceNumber = parseInt(nm[1], 10);
    text = text.slice(nm[0].length);
  }

  // 선택지 ①~⑤
  const ci = text.search(CIRCLE_RE);
  if (ci >= 0) {
    const choicePart = text.slice(ci);
    text = text.slice(0, ci).trim();
    const parts = choicePart.split(/[①②③④⑤]/).slice(1).map((s) => s.trim());
    out.choices = [0, 1, 2, 3, 4].map((i) => parts[i] ?? "");
    out.type = "multiple";
  } else {
    out.type = "short";
    out.choices = [];
  }

  // <보기> 블록: "<보기>" / "〈보 기〉" 이후 ㄱ. ㄴ. ㄷ.
  const bm = /[<〈]\s*보\s*기\s*[>〉]/g;
  const matches = Array.from(text.matchAll(bm));
  if (matches.length) {
    const last = matches[matches.length - 1];
    const after = text.slice((last.index ?? 0) + last[0].length);
    if (/ㄱ\s*[.．]/.test(after)) {
      const items = after
        .split(/(?:^|\n|\s)[ㄱㄴㄷㄹ]\s*[.．]\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      out.bogi = items;
      text = text.slice(0, last.index).trim();
    }
  }
  // 본문 안의 "<보기>" 표기를 수능 표기로 통일
  text = text.replace(/<\s*보\s*기\s*>/g, "〈보기〉");

  out.body = text;
  const s = suggestUnits(raw);
  out.unitMajor = s.unitMajor;
  out.unitMiddle = s.unitMiddle;
  out.unitDetail = s.unitDetail;
  out.tags = s.tags;
  if (out.bogi?.length) out.tags = Array.from(new Set([...(out.tags ?? []), "보기_진위판정"]));
  return out;
}
