import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    if (localStorage.getItem('pmp_guest_user') === 'true') {
      return {
        uid: 'guest-simulator',
        displayName: 'Guest Candidate',
        email: 'guest@simulator.local',
        isAnonymous: true,
        photoURL: null,
      } as any;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [language, setLanguage] = useState<'EN' | 'FR'>(() => {
    const saved = localStorage.getItem('pmp_language');
    return saved === 'FR' ? 'FR' : 'EN';
  });

  const handleSetLanguage = (lang: 'EN' | 'FR') => {
    setLanguage(lang);
    localStorage.setItem('pmp_language', lang);
  };

  // Initial connection readiness audit and auth subscriber
  useEffect(() => {
    // 1. Validate connection to Firestore as per mandatory SKILL guidelines
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setConnectionError(true);
        }
      }
    }
    
    testConnection();

    // 2. Auth state change listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.removeItem('pmp_guest_user');
      } else {
        if (localStorage.getItem('pmp_guest_user') === 'true') {
          setUser({
            uid: 'guest-simulator',
            displayName: 'Guest Candidate',
            email: 'guest@simulator.local',
            isAnonymous: true,
            photoURL: null,
          } as any);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('pmp_guest_user');
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out fail:", err);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center space-y-4" id="app_loader">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-zinc-600 text-xs font-mono">
          {language === 'FR' ? 'Initialisation de l’environnement PMP...' : 'Initializing PMP Simulator Sandbox...'}
        </span>
      </div>
    );
  }

  // Render Login screen or main dynamic PMP Simulator Workspace
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900" id="pmp_app_root">
      {connectionError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 p-3 text-xs text-center font-mono font-medium shadow-sm">
          {language === 'FR' 
            ? '⚠️ Attention : Bac à sable hors-ligne. Les questions locales fonctionnent, mais le suivi de progression dans le cloud peut être désactivé.' 
            : '⚠️ Warning: Sandbox offline. Local questions are operational, but cloud progress tracking might be disabled.'}
        </div>
      )}
      
      {!user ? (
        <AuthScreen 
          onAuthSuccess={(guestUser) => {
            if (guestUser) {
              setUser(guestUser);
            }
          }} 
          language={language} 
          setLanguage={handleSetLanguage} 
        />
      ) : (
        <Dashboard 
          user={user}
          onLogout={handleLogout} 
          language={language} 
          setLanguage={handleSetLanguage} 
        />
      )}
    </div>
  );
}
