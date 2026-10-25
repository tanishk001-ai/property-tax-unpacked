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
  const trail = useRef<{ current: string; previous: string | null }>({ current: pathname, previous: null });

  useEffect(() => {
    if (trail.current.current !== pathname) trail.current = { current: pathname, previous: trail.current.current };
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
    if (trail.current.previous === parent) router.back();
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
