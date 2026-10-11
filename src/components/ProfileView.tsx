import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Mail,
  Zap,
  Target,
  Users,
  Clock,
  ShieldAlert,
  LogOut,
  ChevronRight,
  FileText,
  AlertTriangle,
  Coins,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Edit2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { LegalDocType, SavedBank } from '../types';
import { NIGERIAN_BANKS } from '../lib/nigerianBanks';

interface ProfileViewProps {
  onOpenDoc?: (doc: LegalDocType) => void;
  onSignOut?: () => void;
  realProfileUsername?: string;
  realWallet?: { balance: number; locked_balance: number };
  savedBank?: SavedBank | null;
  onUpdateSavedBank?: (bank: SavedBank) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenDoc,
  onSignOut,
  realProfileUsername,
  realWallet,
  savedBank: initialSavedBank,
  onUpdateSavedBank,
}) => {
  const { user, wallet, signOut } = useAuth();
  const [profileData, setProfileData] = useState<{
    username: string;
    email: string;
    created_at: string;
  } | null>(null);

  const [currentBank, setCurrentBank] = useState<SavedBank | null>(initialSavedBank || null);

  const [liveWallet, setLiveWallet] = useState<{
    balance: number;
    locked_balance: number;
  }>({
    balance: realWallet?.balance ?? wallet?.available_coins ?? 0,
    locked_balance: realWallet?.locked_balance ?? wallet?.locked_coins ?? 0,
  });

  const [loading, setLoading] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showResponsibleModal, setShowResponsibleModal] = useState(false);
  const [responsibleNotice, setResponsibleNotice] = useState<string | null>(null);

  // Bank Edit / Add Modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankModalName, setBankModalName] = useState(NIGERIAN_BANKS[0].name);
  const [bankModalCode, setBankModalCode] = useState(NIGERIAN_BANKS[0].code);
  const [bankModalAccountNum, setBankModalAccountNum] = useState('');
  const [bankModalAccountName, setBankModalAccountName] = useState('');
  const [bankModalSaving, setBankModalSaving] = useState(false);
  const [bankModalError, setBankModalError] = useState<string | null>(null);
  const [bankModalSuccess, setBankModalSuccess] = useState<string | null>(null);

  // Sync initialSavedBank
  useEffect(() => {
    if (initialSavedBank) {
      setCurrentBank(initialSavedBank);
    }
  }, [initialSavedBank]);

  // Fetch live profiles and wallets row for current user
  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Query profiles table including bank details
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('username, email, created_at, bank_name, bank_code, account_number, account_name')
          .eq('id', user.id)
          .single();

        if (!profError && prof && isMounted) {
          setProfileData({
            username: prof.username || realProfileUsername || user.username || 'Contender',
            email: prof.email || user.email || '',
            created_at: prof.created_at || new Date().toISOString(),
          });

          if (prof.bank_name && prof.account_number) {
            const bData: SavedBank = {
              bank_name: prof.bank_name,
              bank_code: prof.bank_code || '',
              account_number: prof.account_number,
              account_name: prof.account_name || '',
            };
            setCurrentBank(bData);
            if (onUpdateSavedBank) onUpdateSavedBank(bData);
          }
        } else if (isMounted) {
          setProfileData({
            username: realProfileUsername || user.username || 'Contender',
            email: user.email || '',
            created_at: new Date().toISOString(),
          });
        }

        // 2. Query wallets table
        const { data: wal, error: walError } = await supabase
          .from('wallets')
          .select('balance, locked_balance')
          .eq('user_id', user.id)
          .single();

        if (!walError && wal && isMounted) {
          setLiveWallet({
            balance: Number(wal.balance) || 0,
            locked_balance: Number(wal.locked_balance) || 0,
          });
        }
      } catch (err) {
        console.warn('Error fetching live profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [user, realProfileUsername, onUpdateSavedBank]);

  const username = profileData?.username || realProfileUsername || user?.username || 'Contender';
  const email = profileData?.email || user?.email || 'contender@apexclash.ng';
  const memberDate = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'October 2026';

  const handleOpenBankModal = () => {
    setBankModalError(null);
    setBankModalSuccess(null);
    if (currentBank) {
      setBankModalName(currentBank.bank_name);
      setBankModalCode(currentBank.bank_code);
      setBankModalAccountNum(currentBank.account_number);
      setBankModalAccountName(currentBank.account_name);
    } else {
      setBankModalName(NIGERIAN_BANKS[0].name);
      setBankModalCode(NIGERIAN_BANKS[0].code);
      setBankModalAccountNum('');
      setBankModalAccountName('');
    }
    setShowBankModal(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankModalError(null);

    if (!bankModalAccountNum || bankModalAccountNum.trim().length !== 10) {
      setBankModalError('Please enter a valid 10-digit Nigerian NUBAN account number.');
      return;
    }

    if (!bankModalAccountName || bankModalAccountName.trim().length < 3) {
      setBankModalError('Please enter the registered account holder name.');
      return;
    }

    if (!user) return;

    setBankModalSaving(true);

    try {
      const cleanNum = bankModalAccountNum.trim();
      const cleanName = bankModalAccountName.trim().toUpperCase();

      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: bankModalName,
          bank_code: bankModalCode,
          account_number: cleanNum,
          account_name: cleanName,
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(error.message || 'Failed to update bank account in profile.');
      }

      const updated: SavedBank = {
        bank_name: bankModalName,
        bank_code: bankModalCode,
        account_number: cleanNum,
        account_name: cleanName,
      };

      setCurrentBank(updated);
      if (onUpdateSavedBank) {
        onUpdateSavedBank(updated);
      }

      setBankModalSuccess('Bank account details saved successfully!');
      setTimeout(() => {
        setShowBankModal(false);
      }, 1500);
    } catch (err: any) {
      setBankModalError(err.message || 'Could not save bank details. Please try again.');
    } finally {
      setBankModalSaving(false);
    }
  };

  const handleSignOutAction = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      signOut();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono flex items-center gap-1.5 mb-1">
          <UserIcon className="w-3.5 h-3.5" />
          Contender Profile & Governance
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
          Player Identity
        </h1>
        <p className="text-xs text-neutral-400 font-sans mt-0.5">
          Manage your verified Nigerian contender profile, ratings, and persistent payout bank details.
        </p>
      </div>

      {/* 1. Player Identity Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/6 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Large Avatar Monogram (Gold Gradient Box) */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#F5A623] via-[#E0921A] to-[#B8720A] p-[2px] shadow-xl flex-shrink-0">
              <div className="w-full h-full bg-[#0A0A0A] rounded-[14px] flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-black font-mono text-[#F5A623]">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white font-mono">
                  {username}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Account Status: Verified 18+ 🛡️
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-mono text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  {email}
                </span>
                <span className="hidden sm:inline text-neutral-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  Member since {memberDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Wallet Summary */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] font-mono space-y-1 sm:text-right flex-shrink-0">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Available Wallet
            </span>
            <div className="text-lg font-black text-[#F5A623] flex items-center gap-1.5 sm:justify-end">
              <Coins className="w-4 h-4" />
              <span>{liveWallet.balance} Coins</span>
            </div>
            <span className="text-[10px] text-neutral-500 block">
              (₦{(liveWallet.balance * 10).toLocaleString()} NGN)
            </span>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED PAYOUT & BANK DETAILS CARD */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#F5A623]" />
            <h3 className="text-base font-bold text-white font-mono">
              Payout & Bank Details
            </h3>
          </div>
          {currentBank ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
              ✓ Verified Payout Account
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-neutral-400 text-[10px] font-mono">
              No payout account saved
            </span>
          )}
        </div>

        {currentBank ? (
          <div className="bg-white/[0.04] border border-[#F5A623]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {currentBank.bank_name}
                </span>
              </div>
              <div className="text-xs text-neutral-400">
                NUBAN Account: <strong className="text-white tracking-widest">{currentBank.account_number}</strong>
              </div>
              <div className="text-xs text-emerald-400 font-bold">
                {currentBank.account_name}
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenBankModal}
              className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-[#F5A623] border border-[#F5A623]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Bank Account</span>
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-mono font-bold text-white block">
                No Nigerian bank account linked yet
              </span>
              <p className="text-xs text-neutral-400 font-sans">
                Link your Access, GTBank, Zenith, Kuda, OPay, or PalmPay account for instant payouts whenever you withdraw.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenBankModal}
              className="py-2.5 px-5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 shadow-lg shadow-[#F5A623]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Bank Account</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Career Elo Ratings Grid (4 Cards) */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-bold flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[#F5A623]" />
          Career Discipline Elo Ratings
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              game: 'Naija Whot',
              rating: 1200,
              icon: Zap,
              color: 'text-[#F5A623]',
              tier: 'Contender',
            },
            {
              game: 'Speed Chess',
              rating: 1200,
              icon: Target,
              color: 'text-sky-400',
              tier: 'Contender',
            },
            {
              game: 'Speed Trivia',
              rating: 1200,
              icon: Users,
              color: 'text-purple-400',
              tier: 'Contender',
            },
            {
              game: 'Ludo Classic',
              rating: 1200,
              icon: Clock,
              color: 'text-emerald-400',
              tier: 'Contender',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.game}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                    {item.tier}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono text-neutral-400 block">{item.game}</span>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    {item.rating}{' '}
                    <span className="text-xs text-neutral-500 font-normal">Elo</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Career Performance Stats (3-Column) */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#F5A623]" />
          Competitive Match Record
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
              Matches Played
            </span>
            <span className="text-3xl font-black text-white font-mono block">0</span>
            <span className="text-[10px] text-neutral-500 font-mono">Official Arena Duels</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
              Career Win Rate
            </span>
            <span className="text-3xl font-black text-[#F5A623] font-mono block">0%</span>
            <span className="text-[10px] text-neutral-500 font-mono">1v1 Verification</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
              Win / Loss / Draw
            </span>
            <span className="text-3xl font-black text-emerald-400 font-mono block">0W - 0L - 0D</span>
            <span className="text-[10px] text-neutral-500 font-mono">Draws 100% Refunded</span>
          </div>
        </div>
      </div>

      {/* 5. Account & Safety Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Responsible Gaming Tools Card */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#F5A623]" />
              <h4 className="text-base font-bold text-white font-mono">
                Responsible Gaming Tools
              </h4>
            </div>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Enforce self-exclusion cool-offs and player welfare protection in compliance with Nigerian esports standards.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setShowResponsibleModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] font-mono text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
            >
              <span>Responsible Gaming Tools & Limits</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Legal Documents & Charter */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F5A623]" />
              <h4 className="text-base font-bold text-white font-mono">
                Statutory Compliance & Legal
              </h4>
            </div>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Transparent terms, Nigerian peer-to-peer escrow rules, and fair play algorithms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenDoc && onOpenDoc('terms')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-center font-mono text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onOpenDoc && onOpenDoc('privacy')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-center font-mono text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenDoc && onOpenDoc('fair_play')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-center font-mono text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              Fair Play Charter
            </button>
          </div>
        </div>
      </div>

      {/* Sign Out Section with Confirmation */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white font-mono">Session Governance</h4>
          <p className="text-xs text-neutral-400 font-sans mt-0.5">
            Safely terminate your active session on this device.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="py-3 px-6 rounded-xl font-mono text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* EDIT / ADD BANK ACCOUNT MODAL */}
      {showBankModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setShowBankModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121212] border border-[#F5A623]/30 shadow-2xl p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F5A623]/15 text-[#F5A623] flex items-center justify-center border border-[#F5A623]/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {currentBank ? 'Edit Payout Account' : 'Add Payout Account'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Nigerian NUBAN bank transfer details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankModalError && (
              <div className="p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs font-mono flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{bankModalError}</span>
              </div>
            )}

            {bankModalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{bankModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveBankAccount} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="modal-bank-select" className="text-[11px] font-mono text-neutral-400 block">Bank Name</label>
                <select
                  id="modal-bank-select"
                  value={bankModalName}
                  onChange={(e) => {
                    const bName = e.target.value;
                    setBankModalName(bName);
                    const found = NIGERIAN_BANKS.find((b) => b.name === bName);
                    if (found) setBankModalCode(found.code);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs focus:border-[#F5A623] focus:outline-none"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-account-number" className="text-[11px] font-mono text-neutral-400 block">
                  NUBAN Account Number (10 digits)
                </label>
                <input
                  id="modal-account-number"
                  type="text"
                  maxLength={10}
                  pattern="\d{10}"
                  value={bankModalAccountNum}
                  onChange={(e) => setBankModalAccountNum(e.target.value.replace(/\D/g, ''))}
                  placeholder="0123456789"
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs tracking-wider focus:border-[#F5A623] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-account-name" className="text-[11px] font-mono text-neutral-400 block">
                  Registered Account Holder Name
                </label>
                <input
                  id="modal-account-name"
                  type="text"
                  value={bankModalAccountName}
                  onChange={(e) => setBankModalAccountName(e.target.value.toUpperCase())}
                  placeholder="CHIDI EMEKA"
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs uppercase focus:border-[#F5A623] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bankModalSaving}
                  className="py-2.5 px-5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#F5A623]/20 flex items-center gap-1.5"
                >
                  {bankModalSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Bank Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#121212] border border-red-500/30 shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  Sign Out Confirmation
                </h3>
                <p className="text-xs text-neutral-400">
                  Are you sure you want to log out of ApexClash?
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Your coins, locked active challenges, and career Elo ratings will remain safe and synchronized in your account.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  handleSignOutAction();
                }}
                className="py-2.5 px-5 rounded-xl font-mono text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer shadow-lg shadow-red-500/25"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsible Gaming Modal */}
      {showResponsibleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setShowResponsibleModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#121212] border border-[#F5A623]/30 shadow-2xl p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5A623]/15 text-[#F5A623] flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Responsible Gaming Controls
                  </h3>
                  <p className="text-xs text-neutral-400">
                    National self-exclusion & budget protection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResponsibleModal(false)}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {responsibleNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                {responsibleNotice}
              </div>
            )}

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Deposit Freedom</span>
                  <span className="text-neutral-400 text-[10px]">Zero deposit limits — unrestricted wallet funding</span>
                </div>
                <span className="text-emerald-400 font-bold">Unrestricted</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Anti-Double-Spend Escrow</span>
                  <span className="text-neutral-400 text-[10px]">Strict peer validation</span>
                </div>
                <span className="text-emerald-400 font-bold">Enforced</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">24-Hour Cool-Off Break</span>
                  <span className="text-neutral-400 text-[10px]">Pause all match entries</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResponsibleNotice('A 24-hour cool-off pause has been registered for your account.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.1] text-[11px] font-bold transition-all cursor-pointer"
                >
                  Request Cool-Off
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setShowResponsibleModal(false)}
                className="py-2.5 px-5 rounded-xl font-mono text-xs font-bold bg-[#F5A623] text-black hover:brightness-105 transition-all cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
