import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  phone: string;
  display_name: string | null;
  role: 'reader' | 'contributor' | 'admin';
  ghadam_balance: number;
  total_earned: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  applicantId: number | null;
  isLoading: boolean;
  login: (token: string, user: User, applicantId?: number) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'apply_token';
const USER_KEY = 'apply_user';
const APPLICANT_KEY = 'apply_applicant_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [applicantId, setApplicantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    const savedApplicantId = localStorage.getItem(APPLICANT_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedApplicantId) {
        setApplicantId(Number(savedApplicantId));
      }
      
      // Verify token is still valid
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${tokenToVerify}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setApplicantId(data.applicant_id);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        if (data.applicant_id) {
          localStorage.setItem(APPLICANT_KEY, String(data.applicant_id));
        }
      } else {
        // Token invalid, clear everything
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, newUser: User, newApplicantId?: number) => {
    setToken(newToken);
    setUser(newUser);
    setApplicantId(newApplicantId ?? null);
    
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    if (newApplicantId) {
      localStorage.setItem(APPLICANT_KEY, String(newApplicantId));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setApplicantId(null);
    
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(APPLICANT_KEY);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updated = { ...user, ghadam_balance: newBalance };
      setUser(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        applicantId,
        isLoading,
        login,
        logout,
        updateUser,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for authenticated API calls
export function useAuthFetch() {
  const { token } = useAuth();
  
  return async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };
}
