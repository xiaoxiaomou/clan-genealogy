import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  })(),
  isAuthenticated: (() => {
    const token = localStorage.getItem('access_token');
    return !!token && token !== 'undefined' && token.length > 10;
  })(),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await api.login(username, password);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || '登录失败');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { username, email, password, display_name }: { username: string; email: string; password: string; display_name?: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.register(username, email, password, display_name);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || '注册失败');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.getProfile();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || '获取用户信息失败');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    },
    clearError(state) {
      state.error = null;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        localStorage.setItem('access_token', action.payload.access_token || '');
        localStorage.setItem('refresh_token', action.payload.refresh_token || '');
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        // 注册不返回 token，不改变认证状态
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setUser, logout, clearError, setIsLoading } = authSlice.actions;
export default authSlice.reducer;
