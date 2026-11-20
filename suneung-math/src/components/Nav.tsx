"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const LINKS = [
  { href: "/", label: "대시보드", icon: "◎" },
  { href: "/problems", label: "문제 아카이브", icon: "▤" },
  { href: "/problems/new", label: "문제 업로드·변환", icon: "＋" },
  { href: "/cart", label: "시험지 장바구니", icon: "🛒", cart: true },
  { href: "/exams", label: "내 시험지", icon: "▦" },
  { href: "/random", label: "랜덤 모의고사", icon: "⚄" },
  { href: "/settings", label: "설정·폰트·백업", icon: "⚙" },
];

export function Nav() {
  const path = usePathname();
  const { ids } = useCart();
  return (
    <aside className="no-print sticky top-0 flex h-screen w-56 flex-none flex-col border-r border-stone-200 bg-paper">
      <div className="px-5 py-5">
        <div className="font-serif text-lg font-bold leading-tight">수능 수학</div>
        <div className="text-xs text-ink-faint">아카이브 & 시험지 빌더</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path === l.href || (path.startsWith(l.href + "/") && !(l.href === "/problems" && path === "/problems/new"));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-accent-soft font-medium text-accent" : "text-ink-soft hover:bg-stone-100"
              }`}
            >
              <span className="w-4 text-center text-xs">{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              {l.cart && ids.length > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">{ids.length}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] leading-relaxed text-ink-faint">
        2028 수능 체제
        <br />
        대수 · 미적분Ⅰ · 확률과 통계
      </div>
    </aside>
  );
}
