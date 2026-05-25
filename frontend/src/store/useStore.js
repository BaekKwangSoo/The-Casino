import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── 인증 ─────────────────────────────────────────────
  user:  null,
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  updateBalance: (balance) => set((s) => ({ user: s.user ? { ...s.user, balance } : null })),

  // ── 게임 상태 ─────────────────────────────────────────
  gamePhase:   'betting',   // betting | rolling | result
  timeLeft:    30,
  playerCount: 0,
  currentBets: [],          // 현재 라운드 베팅 목록
  lastResult:  null,        // 마지막 결과 { dice, sum, myResults }
  history:     [],          // 최근 결과 이력

  setGamePhase:   (phase)   => set({ gamePhase: phase }),
  setTimeLeft:    (t)       => set({ timeLeft: t }),
  setPlayerCount: (n)       => set({ playerCount: n }),
  addBet:         (bet)     => set((s) => ({ currentBets: [...s.currentBets, bet] })),
  cancelBet:      (betType) => set((s) => ({ currentBets: s.currentBets.filter(b => b.betType !== betType) })),
  clearBets:      ()        => set({ currentBets: [] }),
  setLastResult:  (result)  => set({ lastResult: result }),
  addHistory:     (entry)   => set((s) => ({
    history: [entry, ...s.history].slice(0, 20),
  })),

  // ── 알림 ─────────────────────────────────────────────
  notifications: [],
  addNotification: (msg, type = 'info') => {
    const id = Date.now();
    set((s) => ({ notifications: [...s.notifications, { id, msg, type }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 4000);
  },
}));

export default useStore;
