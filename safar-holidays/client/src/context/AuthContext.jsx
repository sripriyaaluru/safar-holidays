// Keeps track of the logged-in user and their saved (wishlist) packages.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [savedIds, setSavedIds] = useState(() => new Set());

  // Restore the session from a saved token when the site loads.
  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  // Load the wishlist whenever the user changes.
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    api('/wishlist')
      .then((d) => setSavedIds(new Set(d.packages.map((p) => p.id))))
      .catch(() => setSavedIds(new Set()));
  }, [user]);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (form) => {
    const d = await api('/auth/register', { method: 'POST', body: form });
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  /** Replaces the stored user after a profile update. */
  const updateUser = useCallback((next) => setUser(next), []);

  /** Adds or removes a package from the wishlist. Returns the new saved state. */
  const toggleSaved = useCallback(
    async (packageId) => {
      const isSaved = savedIds.has(packageId);
      await api(`/wishlist/${packageId}`, { method: isSaved ? 'DELETE' : 'POST' });
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(packageId);
        else next.add(packageId);
        return next;
      });
      return !isSaved;
    },
    [savedIds],
  );

  const value = useMemo(
    () => ({ user, ready, login, register, logout, updateUser, savedIds, toggleSaved }),
    [user, ready, login, register, logout, updateUser, savedIds, toggleSaved],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
