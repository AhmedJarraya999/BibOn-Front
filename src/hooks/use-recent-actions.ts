import { useState, useCallback } from 'react';

export interface RecentAction {
  id: string;
  label: string;
  undo?: () => Promise<void>;
  timestamp: number;
}

export function useRecentActions(max = 5) {
  const [actions, setActions] = useState<RecentAction[]>([]);

  const push = useCallback((label: string, undo?: () => Promise<void>) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const action: RecentAction = { id, label, undo, timestamp: Date.now() };
    setActions((prev) => [action, ...prev].slice(0, max));
  }, [max]);

  const remove = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { actions, push, remove };
}
