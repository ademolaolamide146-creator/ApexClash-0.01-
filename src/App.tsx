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
import { GameId, LegalDocType } from './types';

function MainApp() {
  const { user } = useAuth();

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
  const [dashboardTab, setDashboardTab] = useState<'home' | 'arena' | 'rankings' | 'wallet' | 'profile'>('home');

  // Real Supabase database state for Dashboard
  const [realUsername, setRealUsername] = useState<string>('');
  const [realWallet, setRealWallet] = useState<{ balance: number; locked_balance: number }>({
    balance: 0,
    locked_balance: 0,
  });
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

  // 2. PURGE ALL DUMMY / DEMO DASHBOARD DATA:
  // When an authenticated session is active, fetch real data from Supabase
  const fetchRealDashboardData = useCallback(async (activeSession: Session) => {
    try {
      const userId = activeSession.user.id;
      const userEmail = activeSession.user.email;
      const fallbackName = userEmail ? userEmail.split('@')[0] : 'Contender';

      // 1. Fetch Profile safely (handle missing record without crashing)
      let uname = fallbackName;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.username) {
          uname = profile.username;
        }
      } catch {
        // use fallback
      }
      setRealUsername(uname);

      // 2. Fetch Real Wallet safely (handle missing record without crashing)
      let bal = 0;
      let lockedBal = 0;
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance, locked_balance')
          .eq('user_id', userId)
          .maybeSingle();
        if (wallet) {
          bal = wallet.balance ?? 0;
          lockedBal = wallet.locked_balance ?? 0;
        }
      } catch {
        // use fallback 0
      }

      setRealWallet({
        balance: bal,
        locked_balance: lockedBal,
      });

      // 3. Fetch Real Transactions / Match Activity safely
      let txs: any[] = [];
      try {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (txData) {
          txs = txData;
        }
      } catch {
        // ignore
      }

      setRealTransactions(txs);
    } catch (err) {
      console.warn('Error fetching real Supabase state:', err);
    }
  }, []);

  // 1. FIX onAuthStateChange ROUTING TRAP:
  // Do NOT add an else { setCurrentView('landing'); } branch!
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession) {
        setCurrentView('dashboard');
        fetchRealDashboardData(existingSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setCurrentView('dashboard');
        fetchRealDashboardData(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRealDashboardData]);

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
        activeTab={currentView}
        setActiveTab={setCurrentView}
        onOpenWhatsAppModal={() => setWhatsAppModalOpen(true)}
        onNavigateDashboardTab={(tab) => {
          setCurrentView('dashboard');
          setDashboardTab(tab);
        }}
      />

      {/* 2. Main View Content */}
      <main className="flex-1">
        {currentView === 'dashboard' && (session || user) ? (
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
            onRefreshData={() => {
              if (session) fetchRealDashboardData(session);
            }}
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
