import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const callbackRef           = useRef(false);

  // Restore session on mount
  useEffect(() => {
    const token  = localStorage.getItem('access_token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Verify & refresh from server
      authAPI.getProfile()
        .then((data) => { setUser(data); localStorage.setItem('user', JSON.stringify(data)); })
        .catch(() => _clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const _save = (data) => {
    localStorage.setItem('access_token',  data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const _clear = () => {
    authAPI.logout();
    setUser(null);
  };

  const githubLogin = async () => {
    try {
      setError(null);
      const data = await authAPI.getGithubAuthUrl();
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleGithubCallback = async (code) => {
    if (callbackRef.current) return;
    try {
      callbackRef.current = true;
      setError(null);
      const data = await authAPI.githubCallback(code);
      _save(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      callbackRef.current = false;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const data = await authAPI.patchProfile(profileData);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = _clear;

  return (
    <AuthContext.Provider value={{
      user, loading, error,
      githubLogin, handleGithubCallback,
      updateProfile, logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
