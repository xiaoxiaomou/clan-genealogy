import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore, TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import appReducer, {
  addToast,
  removeToast,
  setCurrentFamilyId,
  setShowMobileMenu,
  setUnreadCount,
  setNotifications,
  setShowNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setTheme,
  cycleTheme,
  toggleTheme,
  selectTheme,
  selectIsDark,
} from './slices/appSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    app: appReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = () => useStore<AppStore>();

// Re-export action creators and selectors so callers can import them from '@/store'
export {
  addToast,
  removeToast,
  setCurrentFamilyId,
  setShowMobileMenu,
  setUnreadCount,
  setNotifications,
  setShowNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setTheme,
  cycleTheme,
  toggleTheme,
  selectTheme,
  selectIsDark,
};
