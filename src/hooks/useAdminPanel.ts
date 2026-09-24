import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserSession } from '../types';

interface UseAdminPanelParams {
  user: any;
  language: 'EN' | 'FR';
  selectedMode: 'domain' | 'exam' | 'book' | 'admin';
  setSelectedMode: (mode: 'domain' | 'exam' | 'book' | 'admin') => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  setAccessStatus: (v: 'pending' | 'granted' | 'restricted') => void;
  setTestsCount: (v: number) => void;
}

// Owns the Admin Control Panel's own state (candidate directory, sub-tab, global exam config)
// and every admin action. Deliberately does NOT own `isAdmin` / `accessStatus` / `testsCount`
// themselves - those belong to the logged-in user's own session profile (loaded once at login in
// Dashboard.tsx) and are only ever self-updated here as a side effect of an admin acting on their
// own account (e.g. promoting themselves, or an admin restricting their own test access).
export function useAdminPanel({
  user,
  language,
  selectedMode,
  setSelectedMode,
  isAdmin,
  setIsAdmin,
  setAccessStatus,
  setTestsCount
}: UseAdminPanelParams) {
  // App-wide configuration values loaded from Firestore (config/settings document)
  const [appTimerLimitMinutes, setAppTimerLimitMinutes] = useState<number>(230); // Default: 230 mins
  const [appTestsLimit, setAppTestsLimit] = useState<number>(5); // Default: 5 tests

  const [allUsers, setAllUsers] = useState<UserSession[]>([]);
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'knowledge' | 'settings'>('users');
  const [adminUserSearch, setAdminUserSearch] = useState<string>('');

  // Filter registered users dynamically based on admin email search query
  const filteredUsers = allUsers.filter((u) => {
    if (!adminUserSearch.trim()) return true;
    const searchVal = adminUserSearch.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(searchVal) ||
      (u.userId || '').toLowerCase().includes(searchVal)
    );
  });

  const fetchAllUsersForAdmin = async () => {
    if (!user) return;
    setIsLoadingAllUsers(true);
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const list: UserSession[] = [];
      snap.forEach(d => {
        list.push(d.data() as UserSession);
      });
      setAllUsers(list);
    } catch (err) {
      console.error("Error loading user logs:", err);
    } finally {
      setIsLoadingAllUsers(false);
    }
  };

  useEffect(() => {
    if (selectedMode === 'admin') {
      if (isAdmin) {
        fetchAllUsersForAdmin();
      } else {
        setSelectedMode('domain');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode, isAdmin]);

  // Sets a candidate's access to an explicit target status - 'granted' (approve a pending
  // account, or re-grant a restricted one) or 'restricted' (revoke access entirely, whether the
  // account was pending or already granted). Never sets 'pending' - only the app itself does
  // that, once, at first sign-in.
  const setUserAccessStatus = async (targetUserId: string, nextAccess: 'granted' | 'restricted') => {
    try {
      await updateDoc(doc(db, 'sessions', targetUserId), {
        accessStatus: nextAccess
      });
      setAllUsers(prev => prev.map(u => u.userId === targetUserId ? { ...u, accessStatus: nextAccess } : u));
      if (targetUserId === user?.uid) {
        setAccessStatus(nextAccess);
      }
    } catch (err) {
      console.error("Action setUserAccessStatus failed:", err);
    }
  };

  const toggleUserRole = async (targetUserId: string, currentRole: 'candidate' | 'admin' | undefined) => {
    const nextRole = currentRole === 'admin' ? 'candidate' : 'admin';
    try {
      // Routed through the trusted server endpoint (not a direct Firestore updateDoc) so it also
      // mints/revokes the `admin` custom claim on the target's Firebase Auth account via the
      // Admin SDK - the Firestore `role` field is only a display mirror going forward.
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ targetUid: targetUserId, makeAdmin: nextRole === 'admin' })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed with status ${response.status}`);
      }
      setAllUsers(prev => prev.map(u => u.userId === targetUserId ? { ...u, role: nextRole } : u));
      if (targetUserId === user?.uid) {
        setIsAdmin(nextRole === 'admin');
        await auth.currentUser?.getIdToken(true); // refresh so the new claim applies locally
      }
    } catch (err) {
      console.error("Action toggleUserRole failed:", err);
    }
  };

  const resetUserTestsCount = async (targetUserId: string) => {
    if (!window.confirm(language === 'FR' ? "Réinitialiser le nombre d'examens tentés pour ce candidat ?" : "Are you sure you want to reset the exam attempts count for this candidate?")) return;
    try {
      await updateDoc(doc(db, 'sessions', targetUserId), {
        testsCount: 0
      });
      setAllUsers(prev => prev.map(u => u.userId === targetUserId ? { ...u, testsCount: 0 } : u));
      if (targetUserId === user?.uid) {
        setTestsCount(0);
      }
    } catch (err) {
      console.error("Action resetUserTestsCount failed:", err);
    }
  };

  const saveGlobalConfig = async (timerMins: number, testsLimit: number) => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'config', 'settings'), {
        examTimerMinutes: timerMins,
        maxTestsLimit: testsLimit
      });
      setAppTimerLimitMinutes(timerMins);
      setAppTestsLimit(testsLimit);
      alert(language === 'FR' ? "Configuration enregistrée !" : "Global simulation configurations saved!");
    } catch (err) {
      console.error("Failed to commit settings:", err);
      alert("Error saving settings: " + (err as Error).message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return {
    appTimerLimitMinutes,
    setAppTimerLimitMinutes,
    appTestsLimit,
    setAppTestsLimit,
    allUsers,
    filteredUsers,
    isLoadingAllUsers,
    isSavingConfig,
    adminSubTab,
    setAdminSubTab,
    adminUserSearch,
    setAdminUserSearch,
    fetchAllUsersForAdmin,
    setUserAccessStatus,
    toggleUserRole,
    resetUserTestsCount,
    saveGlobalConfig
  };
}
