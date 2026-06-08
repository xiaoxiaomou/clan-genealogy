import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Notification {
  id: number;
  title: string;
  content: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto' | 'ink'

interface AppState {
  theme: ThemeMode
  unreadCount: number
  notifications: Notification[]
  showNotifications: boolean
  showMobileMenu: boolean
  toasts: Toast[]
  currentFamilyId: number | null
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'auto') return systemPrefersDark()
  return mode === 'dark' || mode === 'ink'
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const isDark = resolveDark(mode)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.classList.toggle('ink', mode === 'ink')
}

const stored = ((typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'auto') as ThemeMode
const validModes: ThemeMode[] = ['light', 'dark', 'auto', 'ink']
const initialTheme: ThemeMode = (validModes as string[]).includes(stored) ? stored : 'auto'

const storedFamilyId = (() => {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem('current_family_id')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
})()

const initialState: AppState = {
  theme: initialTheme,
  unreadCount: 0,
  notifications: [],
  showNotifications: false,
  showMobileMenu: false,
  toasts: [],
  currentFamilyId: storedFamilyId,
}

if (typeof window !== 'undefined') {
  applyThemeClass(initialTheme)
  if (initialTheme === 'auto') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      applyThemeClass('auto')
    })
  }
}

let toastCounter = 0;

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
      applyThemeClass(action.payload)
    },
    cycleTheme(state) {
      const order: ThemeMode[] = ['light', 'dark', 'ink', 'auto']
      const i = order.indexOf(state.theme)
      const next = order[(i + 1) % order.length]
      state.theme = next
      localStorage.setItem('theme', next)
      applyThemeClass(next)
    },
    setCurrentFamilyId(state, action: PayloadAction<number | null>) {
      state.currentFamilyId = action.payload
      if (action.payload == null) {
        localStorage.removeItem('current_family_id')
      } else {
        localStorage.setItem('current_family_id', String(action.payload))
      }
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
    },
    setShowNotifications(state, action: PayloadAction<boolean>) {
      state.showNotifications = action.payload;
    },
    markNotificationRead(state, action: PayloadAction<number>) {
      const n = state.notifications.find((n) => n.id === action.payload);
      if (n) n.is_read = true;
    },
    markAllNotificationsRead(state) {
      state.notifications.forEach((n) => (n.is_read = true));
    },
    setShowMobileMenu(state, action: PayloadAction<boolean>) {
      state.showMobileMenu = action.payload;
    },
    addToast(state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) {
      const id = `toast-${++toastCounter}`;
      state.toasts.push({ id, ...action.payload });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setTheme,
  cycleTheme,
  setUnreadCount,
  setNotifications,
  setShowNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setShowMobileMenu,
  addToast,
  removeToast,
  setCurrentFamilyId,
} = appSlice.actions;

// Backward-compat shim for older callers
export const toggleTheme = cycleTheme

export const selectTheme = (state: { app: AppState }) => state.app.theme
export const selectIsDark = (state: { app: AppState }) => resolveDark(state.app.theme)

export default appSlice.reducer;
