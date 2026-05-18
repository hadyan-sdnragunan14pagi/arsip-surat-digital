import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';

export interface UserProfile {
  role: 'admin' | 'staff';
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache the access token in memory.
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isDefaultAdmin = user.email === 'hadyan.abdul7@admin.sd.belajar.id';
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Force admin role for primary admin
            if (isDefaultAdmin && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(doc(db, 'users', user.uid), { 
                role: 'admin',
                displayName: user.displayName || '',
                email: user.email || '' 
              }, { merge: true });
            }
            // Always update display name if available
            if (user.displayName && data.displayName !== user.displayName) {
              data.displayName = user.displayName;
              await setDoc(doc(db, 'users', user.uid), { displayName: user.displayName }, { merge: true });
            }
            setProfile(data);
          } else {
            const newProfile: UserProfile = {
              role: isDefaultAdmin ? 'admin' : 'staff',
              email: user.email || '',
              displayName: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching profile", error);
        }
      } else {
        setProfile(null);
        cachedAccessToken = null;
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    // Add required Workspace scopes
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'auth');
    } finally {
      isSigningIn = false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    cachedAccessToken = null;
  };

  const getAccessToken = async () => {
    // If we have any logic to refresh, it could go here.
    // For now, return the cached token.
    return cachedAccessToken;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, getAccessToken }}>
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
