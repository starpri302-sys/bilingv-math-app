import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  isGuest: boolean;
  isEditor: boolean;
  isChiefEditor: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isGuest: false,
  isEditor: false,
  isChiefEditor: false,
  isSuperAdmin: false,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshProfile: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const userData = await api.getMe(token);
        if (userData && !userData.error) {
          setUser(userData);
          setProfile(userData);
        } else {
          logout();
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (data: any) => {
    const res = await api.login(data);
    if (res.success) {
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      setProfile(res.user);
    }
    return res;
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.success) {
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      setProfile(res.user);
    }
    return res;
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('auth_token');
  };

  const value = {
    user,
    profile,
    loading,
    isGuest: profile?.role === 'guest',
    isEditor: profile?.role === 'editor',
    isChiefEditor: profile?.role === 'chief_editor',
    isSuperAdmin: profile?.role === 'super_admin',
    isAdmin: profile?.role === 'chief_editor' || profile?.role === 'super_admin',
    login,
    register,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
