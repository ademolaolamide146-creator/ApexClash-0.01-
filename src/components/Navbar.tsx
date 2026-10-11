import React from 'react';
import { Coins, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenLegalGate: () => void;
  activeTab: 'landing' | 'dashboard';
  setActiveTab: (tab: 'landing' | 'dashboard') => void;
  onOpenWhatsAppModal: () => void;
  onNavigateDashboardTab?: (tab: 'home' | 'arena' | 'rankings' | 'wallet' | 'profile') => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenLegalGate,
  activeTab,
  setActiveTab,
  onOpenWhatsAppModal,
  onNavigateDashboardTab,
  onSignOut,
}) => {
  const { user, wallet, signOut, is18Verified } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Title with AC Monogram */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (user) {
                setActiveTab('dashboard');
                if (onNavigateDashboardTab) onNavigateDashboardTab('home');
              } else {
                setActiveTab('landing');
              }
            }}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A623] via-[#DC2626] to-[#991B1B] p-[1.5px] shadow-sm shadow-[#F5A623]/20 flex-shrink-0">
              <div className="w-full h-full bg-[#0A0A0A] rounded-[10px] flex items-center justify-center">
                <span className="font-mono font-extrabold text-sm tracking-tighter bg-gradient-to-r from-[#F5A623] to-[#FCD34D] bg-clip-text text-transparent">
                  AC
                </span>
              </div>
            </div>
            <span className="text-lg font-black tracking-tight text-white group-hover:text-neutral-200 transition-colors uppercase">
              Apex<span className="text-[#F5A623]">Clash</span>
            </span>
          </button>

          {/* 18+ Compliance indicator */}
          <button
            type="button"
            onClick={onOpenLegalGate}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-[10px] font-mono font-bold hover:bg-[#DC2626]/20 transition-colors"
            title="Regulatory Compliance: 18+ Peer-to-Peer Skill Gaming in Nigeria"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>18+ NIGERIA</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-300 font-mono">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('home');
                }}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('arena');
                }}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap cursor-pointer"
              >
                Arena
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('rankings');
                }}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap cursor-pointer"
              >
                Rankings
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('wallet');
                }}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap cursor-pointer"
              >
                Wallet
              </button>
              <button
                type="button"
                onClick={onOpenWhatsAppModal}
                className="text-[#25D366] hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                WhatsApp Rooms
              </button>
            </>
          ) : (
            <>
              <a
                href="#disciplines"
                onClick={() => setActiveTab('landing')}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap"
              >
                Disciplines
              </a>
              <a
                href="#stakes"
                onClick={() => setActiveTab('landing')}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap"
              >
                Stakes & Rake
              </a>
              <a
                href="#features"
                onClick={() => setActiveTab('landing')}
                className="hover:text-[#F5A623] transition-colors whitespace-nowrap"
              >
                WhatsApp Rooms
              </a>
              <button
                type="button"
                onClick={onOpenWhatsAppModal}
                className="text-xs text-[#F5A623] hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                Create Room
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Dynamic Auth & Wallet Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('wallet');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#F5A623]/30 hover:border-[#F5A623]/60 transition-all text-left cursor-pointer"
                title="Wallet Balance (100 Coins = ₦1,000)"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#F5A623] to-[#E0921A] flex items-center justify-center text-[#0A0A0A]">
                  <Coins className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-xs font-bold text-[#F5A623] tabular-nums">
                      {wallet?.available_coins ?? 0}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">AC</span>
                  </div>
                  <span className="text-[9px] text-neutral-400 font-mono -mt-1 hidden sm:inline">
                    ₦{((wallet?.available_coins ?? 0) * 10).toLocaleString()}
                    {(wallet?.locked_coins ?? 0) > 0 && ` (${wallet?.locked_coins} locked)`}
                  </span>
                </div>
              </button>

              <div
                onClick={() => {
                  setActiveTab('dashboard');
                  if (onNavigateDashboardTab) onNavigateDashboardTab('profile');
                }}
                className="cursor-pointer hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                title="View Profile"
              >
                <div className="w-6 h-6 rounded-lg bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626]">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-neutral-200 max-w-[100px] truncate font-mono">
                  {user.username}
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  if (onSignOut) onSignOut();
                  setActiveTab('landing');
                }}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#F5A623]/20 whitespace-nowrap cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
