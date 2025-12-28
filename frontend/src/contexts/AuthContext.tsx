import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setToken, clearToken } from '../api/client';
import { authApi } from '../api/services';
import type { User, AuthResponse, UserGoal } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, code: string) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setGoal: (goal: UserGoal) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then(setUser)
        .catch(() => clearToken())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (phone: string, code: string): Promise<AuthResponse> => {
    const response = await authApi.verifyOTP(phone, code);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    const updatedUser = await authApi.getMe();
    setUser(updatedUser);
  };

  const setGoal = async (goal: UserGoal) => {
    const updatedUser = await authApi.setGoal(goal);
    setUser(updatedUser);
  };

  const completeOnboarding = async () => {
    const updatedUser = await authApi.completeOnboarding();
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        setGoal,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
