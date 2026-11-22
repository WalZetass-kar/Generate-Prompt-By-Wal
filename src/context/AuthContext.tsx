import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  ensureUserProfile,
  seedUserWorkspaceIfEmpty,
  purgeLegacySeededSamples,
} from '../lib/firebaseStorage';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  profileReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  retryWorkspaceInit: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const initializeUserWorkspace = useCallback(async (firebaseUser: User) => {
    setAuthError(null);
    setProfileReady(false);
    try {
      const { seeded } = await ensureUserProfile(firebaseUser);
      if (!seeded) {
        await seedUserWorkspaceIfEmpty(firebaseUser.uid);
      } else {
        await purgeLegacySeededSamples(firebaseUser.uid);
      }
      setProfileReady(true);
      setAuthError(null);
    } catch (err: any) {
      console.error('Failed initializing user workspace profile:', err);
      setAuthError(
        'Gagal menyinkronkan profil workspace Firebase Anda. Silakan klik Coba Lagi.'
      );
      setProfileReady(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      setUser(firebaseUser);
      setProfileReady(false);

      if (firebaseUser) {
        await initializeUserWorkspace(firebaseUser);
      }

      if (active) {
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [initializeUserWorkspace]);

  const retryWorkspaceInit = useCallback(async () => {
    if (auth.currentUser) {
      await initializeUserWorkspace(auth.currentUser);
    }
  }, [initializeUserWorkspace]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Login Google dibatalkan. Klik tombol di bawah untuk mencoba lagi.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.');
      } else {
        setAuthError(err?.message || 'Gagal masuk menggunakan akun Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setProfileReady(false);
      setAuthError(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setAuthError(err?.message || 'Gagal keluar dari akun.');
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        profileReady,
        isSigningIn,
        authError,
        signInWithGoogle,
        signOutUser,
        retryWorkspaceInit,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
