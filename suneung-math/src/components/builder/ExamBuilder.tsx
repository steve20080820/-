"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/client";
import { useCart } from "@/lib/cart";
import type { ExamData, ExamItemData, ProblemData } from "@/lib/types";
import { ExamPaperView } from "../ExamPaperView";

type SaveState = "saved" | "dirty" | "saving" | "error";

export function ExamBuilder({ initial }: { initial: ExamData }) {
  const [exam, setExam] = useState<ExamData>(initial);
  const [save, setSave] = useState<SaveState>("saved");
  const [zoom, setZoom] = useState(0.62);
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState<{ pages: number; overflow: number[] }>({ pages: 1, overflow: [] });
  const cart = useCart();
  const first = useRef(true);
  const latest = useRef(exam);
  latest.current = exam;
  const listRef = useRef<HTMLDivElement>(null);

  const persist = useCallback(async () => {
    setSave("saving");
    try {
      const e = latest.current;
      await api(`/api/exams/${e.id}`, {
        method: "PUT",
        json: { ...e, items: e.items.map((i) => ({ problemId: i.problemId, spacing: i.spacing, breakBefore: i.breakBefore })) },
      });
      setSave((s) => (latest.current === e ? "saved" : s === "saving" ? "dirty" : s));
    } catch {
      setSave("error");
    }
  }, []);

  // 자동 저장 (0.8초 디바운스)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSave("dirty");
    const t = setTimeout(persist, 800);
    return () => clearTimeout(t);
  }, [exam, persist]);

  const patch = (p: Partial<ExamData>) => setExam((e) => ({ ...e, ...p }));
  const patchItem = (i: number, p: Partial<ExamItemData>) =>
    setExam((e) => ({ ...e, items: e.items.map((it, j) => (j === i ? { ...it, ...p } : it)) }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    setExam((e) => {
      const from = e.items.findIndex((i) => i.problemId === active.id);
      const to = e.items.findIndex((i) => i.problemId === over.id);
      return { ...e, items: arrayMove(e.items, from, to).map((it, k) => ({ ...it, order: k })) };
    });
    setSelected(null);
  };

  const addFromCart = async () => {
    const have = new Set(exam.items.map((i) => i.problemId));
    const ids = cart.ids.filter((id) => !have.has(id));
    if (!ids.length) return;
    const r = await api<{ items: ProblemData[] }>(`/api/problems?ids=${ids.join(",")}&limit=1000`);
    const byId = new Map(r.items.map((p) => [p.id!, p]));
    const add: ExamItemData[] = ids
      .map((id) => byId.get(id))
      .filter((p): p is ProblemData => Boolean(p))
      .map((p, k) => ({ problemId: p.id!, order: exam.items.length + k, spacing: p.points >= 4 ? 70 : p.points === 3 ? 45 : 30, breakBefore: "none", problem: p }));
    setExam((e) => ({ ...e, items: [...e.items, ...add] }));
    cart.clear();
  };

  const sortBy = (mode: "number" | "points") =>
    setExam((e) => ({
      ...e,
      items: [...e.items].sort((a, b) =>
        mode === "number"
          ? (a.problem.sourceNumber ?? 99) - (b.problem.sourceNumber ?? 99)
          : a.problem.points - b.problem.points || (a.problem.sourceNumber ?? 99) - (b.problem.sourceNumber ?? 99),
      ),
    }));

  const openPrint = async (kind: "exam" | "answers") => {
    const w = window.open("about:blank", "_blank");
    if (save !== "saved") await persist();
    if (w) w.location.href = `/print/${kind}/${exam.id}`;
  };

  const select = (i: number) => {
    setSelected(i);
    listRef.current?.querySelector(`[data-idx="${i}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const totalPoints = exam.items.reduce((s, i) => s + i.problem.points, 0);
  const cartNew = cart.ids.filter((id) => !exam.items.some((i) => i.problemId === id)).length;

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 바 */}
      <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-2.5">
        <Link href="/exams" className="btn btn-ghost btn-sm">
          ←
        </Link>
        <input
          className="min-w-64 flex-1 rounded border border-transparent bg-transparent px-2 py-1 font-serif text-base font-semibold hover:border-stone-300 focus:border-accent focus:outline-none"
          value={exam.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <span className="text-xs text-ink-faint">
          {exam.items.length}문항 · {totalPoints}점 · {layout.pages}쪽
        </span>
        <span
          className={`text-xs ${save === "error" ? "text-red-600" : save === "saved" ? "text-emerald-600" : "text-amber-600"}`}
        >
          {{ saved: "✓ 저장됨", dirty: "● 변경됨", saving: "저장 중…", error: "저장 실패" }[save]}
        </span>
        <button className="btn btn-sm" onClick={() => openPrint("answers")}>
          정답·해설지 PDF
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => openPrint("exam")}>
          🖨 문제지 인쇄 / PDF
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 설정 & 문항 목록 */}
        <aside className="flex w-[380px] flex-none flex-col border-r border-stone-200 bg-paper">
          <div className="space-y-2 border-b border-stone-200 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">교시</label>
                <input className="input" value={exam.period} onChange={(e) => patch({ period: e.target.value })} />
              </div>
              <div>
                <label className="label">영역</label>
                <input className="input" value={exam.area} onChange={(e) => patch({ area: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="label mb-0">용지</span>
              {(["B4", "A4"] as const).map((s) => (
                <button key={s} className={`chip ${exam.paperSize === s ? "chip-on" : ""}`} onClick={() => patch({ paperSize: s })}>
                  {s} 2단
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1 text-xs text-ink-soft">
                <input type="checkbox" checked={exam.distribute} onChange={(e) => patch({ distribute: e.target.checked })} />
                여백 균등분배
              </label>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={exam.showSource} onChange={(e) => patch({ showSource: e.target.checked })} />
                출처 표기
              </label>
              <span className="ml-auto">정렬:</span>
              <button className="btn btn-ghost btn-sm" onClick={() => sortBy("number")}>
                원번호순
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => sortBy("points")}>
                배점순
              </button>
            </div>
            <div>
              <label className="label">마지막 쪽 안내문</label>
              <input className="input text-xs" value={exam.footer} onChange={(e) => patch({ footer: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 pt-2 text-xs text-ink-soft">
            <span>문항 (드래그로 순서 변경 · 번호 자동 부여)</span>
            {cartNew > 0 && (
              <button className="btn btn-sm" onClick={addFromCart}>
                장바구니 +{cartNew}
              </button>
            )}
          </div>
          {layout.overflow.length > 0 && (
            <div className="mx-3 mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              {layout.overflow.map((i) => i + 1).join(", ")}번 문항이 한 단보다 깁니다. 풀이 공간을 줄이거나 도형 폭을 줄이세요.
            </div>
          )}
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={exam.items.map((i) => i.problemId)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-1.5">
                  {exam.items.map((it, i) => (
                    <SortableRow
                      key={it.problemId}
                      item={it}
                      index={i}
                      selected={selected === i}
                      warn={layout.overflow.includes(i)}
                      onSelect={() => setSelected(i)}
                      onChange={(p) => patchItem(i, p)}
                      onRemove={() => setExam((e) => ({ ...e, items: e.items.filter((_, j) => j !== i) }))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
            {exam.items.length === 0 && (
              <div className="rounded border border-dashed p-6 text-center text-xs text-ink-faint">
                문항이 없습니다. <Link href="/problems" className="text-accent underline">아카이브</Link>에서 담아 오세요.
              </div>
            )}
          </div>
        </aside>

        {/* 미리보기 캔버스 */}
        <section className="relative min-w-0 flex-1 overflow-auto bg-stone-300/60">
          <div className="sticky top-0 z-10 flex items-center justify-end gap-2 bg-stone-300/80 px-4 py-1.5 text-xs backdrop-blur">
            <span>실제 {exam.paperSize} 비율 미리보기</span>
            <span className="ml-3">확대</span>
            <input type="range" min={0.3} max={1.2} step={0.02} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
            <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="relative p-8">
            <ExamPaperView exam={exam} zoom={zoom} selected={selected} onSelect={select} onLayout={setLayout} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SortableRow({
  item,
  index,
  selected,
  warn,
  onSelect,
  onChange,
  onRemove,
}: {
  item: ExamItemData;
  index: number;
  selected: boolean;
  warn: boolean;
  onSelect: () => void;
  onChange: (p: Partial<ExamItemData>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.problemId });
  const p = item.problem;
  const preview = p.body.replace(/\$\$?[^$]*\$\$?/g, "▢").replace(/\[\/?box\]/g, "").slice(0, 46);
  return (
    <li
      ref={setNodeRef}
      data-idx={index}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`rounded-md border bg-white p-2 text-xs shadow-sm ${selected ? "border-sky-400 ring-2 ring-sky-200" : warn ? "border-amber-300" : "border-stone-200"} ${isDragging ? "opacity-80 shadow-lg" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none px-0.5 text-ink-faint active:cursor-grabbing" {...attributes} {...listeners} aria-label="드래그">
          ⠿
        </button>
        <span className="w-6 font-serif text-sm font-bold">{index + 1}.</span>
        <span className="min-w-0 flex-1 truncate text-ink-soft" title={p.body}>
          {preview}
        </span>
        <span className="tag">{p.points}점</span>
        <button className="text-ink-faint hover:text-red-600" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          ✕
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2 pl-6">
        <span className="w-24 text-[11px] text-ink-faint">
          풀이공간 {item.spacing}mm
        </span>
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={item.spacing}
          className="flex-1"
          onChange={(e) => onChange({ spacing: +e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
        <select
          className="rounded border border-stone-300 bg-white px-1 py-0.5 text-[11px]"
          value={item.breakBefore}
          onChange={(e) => onChange({ breakBefore: e.target.value as ExamItemData["breakBefore"] })}
          onClick={(e) => e.stopPropagation()}
          title="이 문항 앞에서 단/페이지 넘김"
        >
          <option value="none">자동</option>
          <option value="column">앞에서 단 넘김</option>
          <option value="page">앞에서 쪽 넘김</option>
        </select>
      </div>
      <div className="mt-1 pl-6 text-[10px] text-ink-faint">
        원 {p.sourceNumber ?? "-"}번 · {p.unitMiddle || "미분류"}
      </div>
    </li>
  );
}
