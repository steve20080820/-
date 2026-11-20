"use client";
import { useCallback, useSyncExternalStore } from "react";

const KEY = "sn-cart-v1";
const EVT = "sn-cart-changed";
const EMPTY: string[] = [];
let cached: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cached.raw) return cached.ids;
    const ids = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    cached = { raw, ids: Array.isArray(ids) ? ids : EMPTY };
    return cached.ids;
  } catch {
    return EMPTY;
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    /* 저장 불가 환경 */
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 시험지 장바구니 (브라우저 localStorage) */
export function useCart() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((more: string[]) => write([...read(), ...more]), []);
  const remove = useCallback((id: string) => write(read().filter((x) => x !== id)), []);
  const toggle = useCallback((id: string) => (read().includes(id) ? write(read().filter((x) => x !== id)) : write([...read(), id])), []);
  const clear = useCallback(() => write([]), []);
  const set = useCallback((next: string[]) => write(next), []);
  return { ids, add, remove, toggle, clear, set, has: (id: string) => ids.includes(id) };
}
