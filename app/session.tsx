"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export type PayMode = "UPI" | "Card" | "Net Banking";
export type PaymentResult = { reference: string; amount: number; mode: PayMode; paidAt: number; fy: string };
type OpenSource = "sample" | "search";

type Session = {
  payments: Record<string, PaymentResult>;
  setPayment: (id: string, result: PaymentResult) => void;
  clearPayment: (id: string) => void;
  // How the next bill page was reached from the landing page (for analytics).
  setNextSource: (source: OpenSource) => void;
  takeNextSource: () => OpenSource | null;
  // True exactly once per visit: the first page the visitor landed on.
  consumeEntry: () => boolean;
  // In-app "Back": step back in history when the previous page really is the
  // parent, otherwise navigate to the parent.
  goUp: (parent: string) => void;
};

const SessionContext = createContext<Session | null>(null);

// Lives in the root layout so it survives client-side navigation between the
// landing page, a bill and its breakdown. Nothing here is persisted.
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [payments, setPayments] = useState<Record<string, PaymentResult>>({});
  const nextSource = useRef<OpenSource | null>(null);
  const entryPending = useRef(true);
  // The pages visited in this tab and where we are in that list, so "Back" can tell
  // whether the entry behind us really is the parent screen. popstate marks a move
  // through history (browser buttons, router.back) as opposed to a new navigation.
  const trail = useRef<{ stack: string[]; pos: number; popping: boolean }>({ stack: [pathname], pos: 0, popping: false });

  useEffect(() => {
    const onPop = () => {
      trail.current.popping = true;
      window.setTimeout(() => { trail.current.popping = false; }, 1000);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const t = trail.current;
    if (t.stack[t.pos] === pathname) return;
    if (t.popping) {
      t.popping = false;
      if (t.stack[t.pos - 1] === pathname) t.pos -= 1;
      else if (t.stack[t.pos + 1] === pathname) t.pos += 1;
      else { t.stack = [pathname]; t.pos = 0; }
    } else {
      t.stack = t.stack.slice(0, t.pos + 1).concat(pathname);
      t.pos += 1;
    }
  }, [pathname]);

  const setPayment = useCallback((id: string, result: PaymentResult) => setPayments((current) => ({ ...current, [id]: result })), []);
  const clearPayment = useCallback((id: string) => setPayments((current) => {
    if (!(id in current)) return current;
    const copy = { ...current };
    delete copy[id];
    return copy;
  }), []);
  const setNextSource = useCallback((source: OpenSource) => { nextSource.current = source; }, []);
  const takeNextSource = useCallback(() => { const source = nextSource.current; nextSource.current = null; return source; }, []);
  const consumeEntry = useCallback(() => { const first = entryPending.current; entryPending.current = false; return first; }, []);
  const goUp = useCallback((parent: string) => {
    if (trail.current.stack[trail.current.pos - 1] === parent) router.back();
    else router.push(parent);
  }, [router]);

  const value = useMemo(
    () => ({ payments, setPayment, clearPayment, setNextSource, takeNextSource, consumeEntry, goUp }),
    [payments, setPayment, clearPayment, setNextSource, takeNextSource, consumeEntry, goUp],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
