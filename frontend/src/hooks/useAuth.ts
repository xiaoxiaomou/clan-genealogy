import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const isAuthenticated = !!user && (() => {
    const token = localStorage.getItem('access_token');
    // 验证 token 不是 "undefined" 或空字符串等无效值
    return !!token && token !== 'undefined' && token.length > 10;
  })();

  const clearAuth = useCallback(() => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }, []);

  return { user, setUser, isLoading, isAuthenticated, clearAuth };
}
