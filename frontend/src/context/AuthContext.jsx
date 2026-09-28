import { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from '../services/api.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'prepbot.session';
function readSession() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const accept = (data) => { const next = { user: data.user, token: data.token }; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSession(next); };
  const login = async (email, password) => accept(await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  const register = async (name, email, password) => accept(await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }));
  const logout = () => { localStorage.removeItem(STORAGE_KEY); setSession(null); };
  const value = useMemo(() => ({ user: session?.user || null, token: session?.token || null, login, register, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
