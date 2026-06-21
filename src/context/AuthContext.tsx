import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types.ts';

export interface CustomUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: CustomUser | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changeRole: (role: 'user' | 'admin') => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load from localStorage on development boot
  useEffect(() => {
    const savedToken = localStorage.getItem('store_auth_token');
    const savedUser = localStorage.getItem('store_auth_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        fetchProfile(parsedUser, savedToken);
      } catch (err) {
        console.error('Failed to parse saved user', err);
        localStorage.removeItem('store_auth_token');
        localStorage.removeItem('store_auth_user');
      }
    }
    setLoading(false);
  }, []);

  const fetchProfile = async (currentUser: CustomUser, currentToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else {
        console.error("Failed to fetch user profile from store backend");
        if (res.status === 401) {
          // Token is dead or expired, log out gracefully
          setUser(null);
          setProfile(null);
          setToken(null);
          localStorage.removeItem('store_auth_token');
          localStorage.removeItem('store_auth_user');
        }
      }
    } catch (err) {
      console.error("Error communicating with store auth end-point", err);
    }
  };

  const refreshProfile = async () => {
    if (user && token) {
      await fetchProfile(user, token);
    }
  };

  const login = () => {
    setIsAuthModalOpen(true);
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed.');
      }

      const data = await res.json();
      
      const customUser: CustomUser = {
        uid: data.user.uid,
        email: data.user.email,
        displayName: data.user.displayName,
        photoURL: null
      };

      setToken(data.token);
      setUser(customUser);
      setProfile(data.profile);
      
      localStorage.setItem('store_auth_token', data.token);
      localStorage.setItem('store_auth_user', JSON.stringify(customUser));
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error("Login with email failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, displayName })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed.');
      }

      const data = await res.json();
      
      const customUser: CustomUser = {
        uid: data.user.uid,
        email: data.user.email,
        displayName: data.user.displayName,
        photoURL: null
      };

      setToken(data.token);
      setUser(customUser);
      setProfile(data.profile);

      localStorage.setItem('store_auth_token', data.token);
      localStorage.setItem('store_auth_user', JSON.stringify(customUser));
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      setUser(null);
      setProfile(null);
      setToken(null);
      localStorage.removeItem('store_auth_token');
      localStorage.removeItem('store_auth_user');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (newRole: 'user' | 'admin') => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else {
        console.error("Failed to update role in backend");
      }
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      token, 
      loading, 
      login, 
      logout, 
      refreshProfile, 
      changeRole,
      isAuthModalOpen,
      setIsAuthModalOpen,
      loginWithEmail,
      registerWithEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
