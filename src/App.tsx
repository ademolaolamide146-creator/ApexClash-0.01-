import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { LegalGateModal } from './components/LegalGateModal';
import { AuthModal } from './components/AuthModal';
import { LegalModal } from './components/LegalModal';
import { WhatsAppRoomModal } from './components/WhatsAppRoomModal';
import { GameId, LegalDocType, SavedBank } from './types';
import { getLocalTransactions } from './lib/supabase';

function MainApp() {
  const { user, refreshUserData } = useAuth();

  // 1. 18+ Checklist Verification State (checked from localStorage 'apex_18_verified')
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('apex_18_verified') === 'true';
    } catch {
      return false;
    }
  });
  const [showAgeModal, setShowAgeModal] = useState<boolean>(false);
  const [intendedTargetView, setIntendedTargetView] = useState<'signup' | 'login'>('signup');

  // Supabase session and view state
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');
  const [dashboardTab, setDashboardTab] = useState<'home' | 'arena' | 'rankings' | 'wallet' | 'profile'>(() => {
    try {
      return (localStorage.getItem('apex_active_tab') as any) || 'home';
    } catch {
      return 'home';
    }
  });
  const [isAuthResolving, setIsAuthResolving] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.setItem('apex_active_tab', dashboardTab);
    } catch {}
  }, [dashboardTab]);

  // Real Supabase database state for Dashboard
  const [realUsername, setRealUsername] = useState<string>('');
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [realWallet, setRealWallet] = useState<{ balance: number; locked_balance: number }>({
    balance: 0,
    locked_balance: 0,
  });
  const [walletBalance, setWalletBalanceState] = useState<number>(0);
  const [lockedBalance, setLockedBalanceState] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activePrivateRoom, setActivePrivateRoom] = useState<string | null>(null);

  const setWalletBalance = useCallback((b: number) => {
    setWalletBalanceState(b);
    setRealWallet((prev) => ({ ...prev, balance: b }));
  }, []);

  const setLockedBalance = useCallback((lb: number) => {
    setLockedBalanceState(lb);
    setRealWallet((prev) => ({ ...prev, locked_balance: lb }));
  }, []);
  const [realTransactions, setRealTransactions] = useState<any[]>([]);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [legalDocType, setLegalDocType] = useState<LegalDocType | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);

  // Auth submission state
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailConfirmationNotice, setEmailConfirmationNotice] = useState<string | null>(null);

  // Network offline/online status state
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);
  const [showRestoredToast, setShowRestoredToast] = useState<boolean>(false);

  // 1. Fetch wallet balance from Supabase wallets table
  const fetchWalletBalance = useCallback(async (userId: string) => {
    try {
      const { data: w } = await supabase
        .from('wallets')
        .select('balance, locked_balance')
        .eq('user_id', userId)
        .maybeSingle();
      if (w) {
        setWalletBalance(w.balance ?? 0);
        setLockedBalance(w.locked_balance ?? 0);
      }
    } catch (err) {
      console.warn('fetchWalletBalance error:', err);
    }
  }, [setWalletBalance, setLockedBalance]);

  // 2. PURGE ALL DUMMY / DEMO DASHBOARD DATA:
  // When an authenticated session is active, fetch real data from Supabase
  const fetchRealDashboardData = useCallback(async (activeSession?: Session | null) => {
    try {
      let currentSess = activeSession || session;
      if (!currentSess) {
        try {
          const { data: { session: fetchedSession } } = await supabase.auth.getSession();
          if (fetchedSession) {
            currentSess = fetchedSession;
            setSession(fetchedSession);
          }
        } catch {}
      }

      const userId = currentSess?.user?.id || user?.id;
      if (!userId) return;

      const cacheKey = `dashboard_cache_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { uname, bankData, realWallet, realTransactions } = JSON.parse(cached);
        setRealUsername(uname);
        setSavedBank(bankData);
        setRealWallet(realWallet);
        setWalletBalanceState(realWallet?.balance ?? 0);
        setLockedBalanceState(realWallet?.locked_balance ?? 0);
        setRealTransactions(realTransactions);
      }

      const [profileRes, walletRes, txRes] = await Promise.all([
        supabase.from('profiles').select('username, email, bank_name, bank_code, account_number, account_name, wallet_balance_coins, locked_balance_coins').eq('id', userId).maybeSingle(),
        supabase.from('wallets').select('balance, locked_balance').eq('user_id', userId).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      let uname = user?.username || (currentSess?.user?.email?.split('@')[0] || 'Contender');
      let bankData: SavedBank | null = null;
      let profileCoins = 0;
      let profileLocked = 0;

      if (profileRes.data) {
        const profile = profileRes.data;
        if (profile.username) uname = profile.username;
        profileCoins = profile.wallet_balance_coins ?? 0;
        profileLocked = profile.locked_balance_coins ?? 0;
        if (profile.bank_name && profile.account_number) {
          bankData = { bank_name: profile.bank_name, bank_code: profile.bank_code || '', account_number: profile.account_number, account_name: profile.account_name || '' };
        }
      }

      let bal = user?.wallet_balance_coins ?? profileCoins;
      let lockedBal = user?.locked_balance_coins ?? profileLocked;

      if (walletRes.data) {
        bal = Math.max(user?.wallet_balance_coins ?? 0, walletRes.data.balance ?? profileCoins);
        lockedBal =
          user?.locked_balance_coins !== undefined
            ? user.locked_balance_coins
            : (walletRes.data.locked_balance ?? profileLocked);
      } else {
        try { await supabase.from('wallets').upsert({ user_id: userId, balance: bal, locked_balance: lockedBal }); } catch {}
      }

      const realWalletData = { balance: bal, locked_balance: lockedBal };
      const remoteTxs = txRes.data || [];
      const localTxs = getLocalTransactions(userId);
      const txMap = new Map<string, any>();
      localTxs.forEach((t) => {
        if (t?.id) txMap.set(t.id, t);
        else if (t?.reference_id) txMap.set(t.reference_id, t);
      });
      remoteTxs.forEach((t: any) => {
        if (t?.id) txMap.set(t.id, t);
        else if (t?.reference_id) txMap.set(t.reference_id, t);
      });
      const realTransactions = Array.from(txMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setRealUsername(uname);
      setSavedBank(bankData);
      setRealWallet(realWalletData);
      setWalletBalanceState(bal);
      setLockedBalanceState(lockedBal);
      setRealTransactions(realTransactions);

      localStorage.setItem(cacheKey, JSON.stringify({ uname, bankData, realWallet: realWalletData, realTransactions }));

    } catch (err) {
      console.warn('Error fetching real Supabase state:', err);
    }
  }, [session, user]);

  // Master wallet and profile sync handler
  const handleRefreshData = useCallback(async () => {
    try {
      await fetchRealDashboardData();
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (err) {
      console.warn('Error syncing wallet data:', err);
    }
  }, [fetchRealDashboardData, refreshUserData]);

  // Check active matches and refresh wallet state across all screens
  const checkActiveMatches = useCallback(async (userId: string) => {
    try {
      await fetchRealDashboardData();
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (err) {
      console.warn('checkActiveMatches error:', err);
    }
  }, [fetchRealDashboardData, refreshUserData]);

  // 1. GLOBAL REALTIME WALLET & MATCH LISTENER
  useEffect(() => {
    if (!session?.user?.id) return;

    // 1. Initial wallet fetch
    fetchWalletBalance(session.user.id);

    // 2. Global Realtime Subscription on wallets table
    const walletChannel = supabase
      .channel(`realtime_wallet_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload: any) => {
          if (payload.new) {
            setWalletBalance(payload.new.balance);
            setLockedBalance(payload.new.locked_balance);
            if (refreshUserData) {
              refreshUserData();
            }
          }
        }
      )
      .subscribe();

    // 3. Realtime Subscription on matches table (detects cancellations and settlements live)
    const matchesChannel = supabase
      .channel(`realtime_matches_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => {
          // Instantly refresh active match and wallet state across all screens without reloading
          checkActiveMatches(session.user.id);
          fetchWalletBalance(session.user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [session?.user?.id]);

  // 3. WIRE "CANCEL CHALLENGE" TO cancel_private_room RPC
  const handleCancelChallenge = async (matchId: string) => {
    try {
      setIsCancelling(true);
      const { data, error } = await supabase.rpc('cancel_private_room', {
        p_match_id: matchId
      });
      if (error) {
        alert(`Failed to cancel: ${error.message}`);
        return;
      }
      // Realtime will auto-update the balance, but also clear local active challenge state
      setActivePrivateRoom(null);
      if (session?.user?.id) {
        fetchWalletBalance(session.user.id);
        checkActiveMatches(session.user.id);
      }
    } catch (err: any) {
      console.error("Cancel room error:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  // 1. FIX onAuthStateChange ROUTING TRAP:
  // Do NOT add an else { setCurrentView('landing'); } branch!
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession) {
        setCurrentView('dashboard');
        fetchRealDashboardData(existingSession);
      }
      setIsAuthResolving(false);
    }).catch(() => {
      setIsAuthResolving(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setCurrentView('dashboard');
        fetchRealDashboardData(newSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentView('landing');
      }
      setIsAuthResolving(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync currentView with user if logged in via context
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    }
  }, [user]);

  // 3. LIVE INTERNET & OFFLINE LISTENER
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestoredToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Match Queue and Room Configs for Unified Dashboard Launch
  const [quickQueueConfig, setQuickQueueConfig] = useState<{
    gameId: GameId;
    stake: number;
  } | null>(null);

  const [quickPrivateRoom, setQuickPrivateRoom] = useState<{
    mode: 'create' | 'join';
    roomCode?: string;
    gameId?: GameId;
    stake?: number;
  } | null>(null);

  // 1. FIX THE 18+ CHECKLIST MODAL ON "GET STARTED" AND "LOG IN":
  // In the "Get Started" and "Log In" button click handlers:
  // If !isAgeVerified (checked from localStorage 'apex_18_verified'):
  //   - Immediately open the 18+ Checklist Modal (setShowAgeModal(true))
  //   - Store the intended target view ('signup' or 'login')
  //   - Do NOT advance to the signup/login screen until the user confirms the checklist.
  const handleOpenAuth = (mode: 'signin' | 'signup' | 'login') => {
    const target = mode === 'signin' || mode === 'login' ? 'login' : 'signup';
    setIntendedTargetView(target);

    const verified = typeof window !== 'undefined' && localStorage.getItem('apex_18_verified') === 'true';
    if (!verified || !isAgeVerified) {
      setShowAgeModal(true);
      return;
    }

    setAuthMode(target === 'login' ? 'signin' : 'signup');
    setAuthError(null);
    setEmailConfirmationNotice(null);
    setAuthModalOpen(true);
  };

  // Upon clicking "Confirm & Continue":
  // • Save 'apex_18_verified' = 'true' to localStorage.
  // • Set isAgeVerified = true.
  // • Close the modal and automatically transition to the intended view ('signup' or 'login').
  const handleAgeModalConfirm = () => {
    try {
      localStorage.setItem('apex_18_verified', 'true');
    } catch {
      // ignore
    }
    setIsAgeVerified(true);
    setShowAgeModal(false);
    setAuthMode(intendedTargetView === 'login' ? 'signin' : 'signup');
    setAuthError(null);
    setEmailConfirmationNotice(null);
    setAuthModalOpen(true);
  };

  // 2. FIX SIGN-UP SUBMISSION & IN-PLACE CONFIRMATION:
  const handleAuthSubmit = async (
    e: React.FormEvent,
    formData: { email: string; password: string; username?: string; mode: 'signin' | 'signup' }
  ) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setEmailConfirmationNotice(null);

    try {
      if (formData.mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              username: formData.username?.trim(),
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        // If sign-up succeeds and data.session exists: automatically transition to dashboard
        if (data.session) {
          setSession(data.session);
          setCurrentView('dashboard');
          setAuthModalOpen(false);
          fetchRealDashboardData(data.session);
        } else {
          // If sign-up succeeds and data.session is null: show in-place email confirmation card
          setEmailConfirmationNotice(formData.email.trim());
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (data.session) {
          setSession(data.session);
          setCurrentView('dashboard');
          setAuthModalOpen(false);
          fetchRealDashboardData(data.session);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Play handler from landing page or dashboard
  const handleQuickPlay = (gameId: GameId, stake: number) => {
    const verified = typeof window !== 'undefined' && localStorage.getItem('apex_18_verified') === 'true';
    if (!verified || !isAgeVerified) {
      setIntendedTargetView('signup');
      setShowAgeModal(true);
      return;
    }
    if (!session && !user) {
      handleOpenAuth('signin');
      return;
    }
    // Strict Balance Check: Block 0-balance or insufficient players from auto-queueing
    const availableBalance = realWallet?.balance ?? 0;
    if (availableBalance < stake) {
      setQuickQueueConfig(null);
      setCurrentView('dashboard');
      setDashboardTab('arena');
      return;
    }
    setQuickQueueConfig({ gameId, stake });
    setCurrentView('dashboard');
    setDashboardTab('arena');
  };

  const handleLaunchLobbyFromWhatsApp = (roomId: string, gameId: GameId, stake: number) => {
    const verified = typeof window !== 'undefined' && localStorage.getItem('apex_18_verified') === 'true';
    if (!verified || !isAgeVerified) {
      setIntendedTargetView('login');
      setShowAgeModal(true);
      return;
    }
    if (!session && !user) {
      handleOpenAuth('signin');
      return;
    }
    setQuickPrivateRoom({
      mode: 'join',
      roomCode: roomId,
      gameId,
      stake,
    });
    setCurrentView('dashboard');
    setDashboardTab('arena');
  };

  if (isAuthResolving) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F5A623]/20 border border-[#F5A623]/40 flex items-center justify-center text-[#F5A623] font-mono font-black text-2xl shadow-xl shadow-[#F5A623]/20">
            AC
          </div>
          <p className="text-sm font-mono text-neutral-300 tracking-wider">ApexClash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 flex flex-col font-sans selection:bg-[#F5A623]/20 selection:text-[#F5A623]">
      
      {/* 3. LIVE INTERNET & OFFLINE LISTENER BANNER */}
      {isOffline && (
        <div className="sticky top-0 left-0 right-0 z-50 bg-[#DC2626]/95 backdrop-blur-md text-white text-xs font-bold py-2 text-center shadow-lg">
          ⚠️ Network Disconnected: You are currently offline. Actions will resume when reconnected.
        </div>
      )}

      {/* Reconnected 3-Second Toast */}
      {showRestoredToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-1.5 animate-fade-in pointer-events-none">
          <span>✓ Internet connection restored</span>
        </div>
      )}

      {/* 1. Global Navigation Bar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenLegalGate={() => {
          setIntendedTargetView('signup');
          setShowAgeModal(true);
        }}
        activeTab={user || session ? 'dashboard' : currentView}
        setActiveTab={(view) => {
          if (!user && !session) {
            setCurrentView(view);
          }
        }}
        onOpenWhatsAppModal={() => setWhatsAppModalOpen(true)}
        onNavigateDashboardTab={(tab) => {
          setCurrentView('dashboard');
          setDashboardTab(tab);
        }}
        onSignOut={() => {
          setSession(null);
          setCurrentView('landing');
        }}
      />

      {/* 2. Main View Content */}
      <main className="flex-1">
        {user || session ? (
          <DashboardView
            onOpenWhatsApp={() => setWhatsAppModalOpen(true)}
            onLaunchMatchQueue={handleQuickPlay}
            initialTab={dashboardTab}
            initialQueueConfig={quickQueueConfig}
            initialPrivateRoom={quickPrivateRoom}
            onOpenDoc={(doc) => setLegalDocType(doc)}
            realProfileUsername={realUsername}
            realWallet={realWallet}
            realTransactions={realTransactions}
            onRefreshData={handleRefreshData}
            savedBank={savedBank}
            onUpdateSavedBank={(bank) => setSavedBank(bank)}
            onCancelChallenge={handleCancelChallenge}
            activePrivateRoom={activePrivateRoom}
          />
        ) : (
          <LandingPage
            onOpenAuth={handleOpenAuth}
            onOpenWhatsAppModal={() => setWhatsAppModalOpen(true)}
            onOpenLegalGate={() => {
              setIntendedTargetView('signup');
              setShowAgeModal(true);
            }}
            onOpenDoc={(doc) => setLegalDocType(doc)}
            onQuickPlay={handleQuickPlay}
          />
        )}
      </main>

      {/* 3. Modals */}

      {/* 18+ Legal Compliance Checklist Modal */}
      <LegalGateModal
        isOpen={showAgeModal}
        onClose={() => setShowAgeModal(false)}
        onOpenDoc={(doc) => setLegalDocType(doc)}
        onVerifiedSuccess={handleAgeModalConfirm}
      />

      {/* Authentication Modal with In-Place Confirmation and ErrorCard */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthError(null);
          setEmailConfirmationNotice(null);
        }}
        onRequireLegalGate={() => {
          setAuthModalOpen(false);
          setShowAgeModal(true);
        }}
        onSuccess={() => {
          setCurrentView('dashboard');
          if (session) fetchRealDashboardData(session);
        }}
        onAuthSubmit={handleAuthSubmit}
        authLoading={authLoading}
        authError={authError}
        emailConfirmationNotice={emailConfirmationNotice}
        onClearError={() => setAuthError(null)}
      />

      {/* Full Legal Document Reader Modal */}
      <LegalModal
        isOpen={Boolean(legalDocType)}
        docType={legalDocType}
        onClose={() => setLegalDocType(null)}
      />

      {/* WhatsApp Challenge Room Modal */}
      <WhatsAppRoomModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        onLaunchLobby={handleLaunchLobbyFromWhatsApp}
        onRequireAuth={() => {
          setWhatsAppModalOpen(false);
          handleOpenAuth('signin');
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
