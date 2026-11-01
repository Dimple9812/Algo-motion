import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Mode = 'playful' | 'technical';
export type MotionPref = 'system' | 'reduce' | 'full';

interface PrefsState {
  mode: Mode;
  gamification: boolean;
  motion: MotionPref;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setGamification: (g: boolean) => void;
  setMotion: (m: MotionPref) => void;
}

/** localStorage can be unavailable (private mode, sandboxed iframes) — degrade to memory. */
const safeStorage = createJSONStorage(() => {
  try {
    const k = '__algomotion_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      mode: 'playful',
      gamification: true,
      motion: 'system',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'playful' ? 'technical' : 'playful' })),
      setGamification: (gamification) => set({ gamification }),
      setMotion: (motion) => set({ motion }),
    }),
    { name: 'algomotion-prefs', storage: safeStorage },
  ),
);

export function prefersReducedMotion(pref: MotionPref): boolean {
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export { safeStorage };
