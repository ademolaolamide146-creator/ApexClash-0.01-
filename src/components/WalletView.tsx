import React, { useState } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  ShieldCheck,
  CreditCard,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SavedBank, Transaction } from '../types';

interface WalletViewProps {
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  savedBank?: SavedBank | null;
  realWallet?: { balance: number; locked_balance: number };
  realTransactions?: Transaction[];
  onRefreshData?: () => void | Promise<void>;
}

export const WalletView: React.FC<WalletViewProps> = ({
  onOpenDeposit,
  onOpenWithdraw,
  savedBank,
  realWallet,
  realTransactions = [],
  onRefreshData,
}) => {
  const { wallet, refreshUserData } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const availableCoins = realWallet !== undefined ? realWallet.balance : wallet?.available_coins ?? 0;
  const lockedCoins = realWallet !== undefined ? realWallet.locked_balance : wallet?.locked_coins ?? 0;
  const availableNaira = availableCoins * 10;
  const lockedNaira = lockedCoins * 10;

  const handleSyncWallet = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      if (onRefreshData) {
        await Promise.resolve(onRefreshData());
      }
      if (refreshUserData) {
        await refreshUserData();
      }
      const now = new Date();
      setLastSyncedAt(now);
      setSyncStatus({
        type: 'success',
        message: 'Wallet balance and escrow history synchronized with Supabase vault.',
      });
    } catch (err: any) {
      console.warn('Wallet sync error:', err);
      setSyncStatus({
        type: 'error',
        message: 'Unable to sync balance. Check your internet connection.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus(null);
      }, 4000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono flex items-center gap-1.5 mb-1">
            <Coins className="w-3.5 h-3.5" />
            Apex Escrow Vault
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            Wallet & Payouts
          </h1>
          <p className="text-xs text-neutral-400 font-sans mt-0.5">
            Manage your competitive coin balance, instant Naira funding, and verified bank withdrawals.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSyncWallet}
            disabled={isSyncing}
            className={`px-4 py-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isSyncing
                ? 'bg-[#F5A623]/10 text-white border-[#F5A623]/50 cursor-not-allowed opacity-90'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border-white/[0.1] hover:border-[#F5A623]/40 active:scale-[0.98]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#F5A623] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Vault...' : 'Sync Wallet'}</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {lastSyncedAt
                ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Live Supabase Escrow'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 animate-fade-in ${
            syncStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{syncStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="text-neutral-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Balance & Action Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A623]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Left: Balances */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block font-semibold mb-1">
                Available Spendable Balance
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-5xl font-black text-[#F5A623] font-mono tracking-tight">
                  {availableCoins.toLocaleString()}
                </span>
                <span className="text-base sm:text-xl font-bold font-mono text-white/80">
                  Coins
                </span>
              </div>
              <div className="text-sm font-mono text-neutral-300 mt-1">
                ≈ ₦{availableNaira.toLocaleString()} NGN
              </div>
            </div>

            {/* Locked Coins (Small UI below available balance) */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-neutral-400">
                <Lock className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Locked in Active Matches:</span>
              </div>
              <div className="font-bold text-white">
                {lockedCoins} Coins <span className="text-neutral-500 font-normal">(₦{lockedNaira.toLocaleString()})</span>
              </div>
            </div>
          </div>

          {/* Right: Deposit & Withdraw CTAs */}
          <div className="flex flex-col justify-center gap-3">
            <button
              type="button"
              onClick={onOpenDeposit}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-[0.99] text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit Naira (Min ₦1,000)</span>
            </button>

            <button
              type="button"
              onClick={onOpenWithdraw}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#F5A623] to-[#E0921A] hover:brightness-110 active:scale-[0.99] text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#F5A623]/25 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw to Bank (Min 100 AC)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payout & Bank Account Card */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#F5A623]" />
            <h3 className="text-base font-bold text-white font-mono">
              Saved Payout Account
            </h3>
          </div>
          {savedBank && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
              ✓ Verified Payout Account
            </span>
          )}
        </div>

        {savedBank ? (
          <div className="bg-white/[0.04] border border-[#F5A623]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 font-mono">
              <span className="text-sm font-bold text-white block">
                {savedBank.bank_name}
              </span>
              <div className="text-xs text-neutral-400">
                Account Number: <strong className="text-white tracking-widest">{savedBank.account_number}</strong>
              </div>
              <div className="text-xs text-emerald-400 font-bold">
                {savedBank.account_name}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenWithdraw}
              className="py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-[#F5A623] border border-[#F5A623]/40 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <span>Withdraw to this Account</span>
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-black/40 border border-white/[0.06] text-center space-y-3">
            <div className="text-xs text-neutral-400 font-sans">
              No Nigerian bank account saved yet. Add your account during your next withdrawal or via your profile to enjoy instant 1-tap payouts.
            </div>
            <button
              type="button"
              onClick={onOpenWithdraw}
              className="py-2.5 px-5 rounded-xl text-xs font-mono font-bold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>Set Up Payout Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction Activity Feed */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono">
            Transaction Activity & Escrow History
          </h3>
          <span className="text-xs font-mono text-[#F5A623] font-bold">
            {realTransactions.length} Recorded
          </span>
        </div>

        {realTransactions.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {realTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between gap-4 font-mono text-xs hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'deposit' || tx.type === 'win_payout'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : tx.type === 'withdrawal'
                        ? 'bg-[#F5A623]/15 text-[#F5A623]'
                        : 'bg-white/[0.05] text-neutral-400'
                    }`}
                  >
                    {tx.type === 'deposit' || tx.type === 'win_payout' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : tx.type === 'withdrawal' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-white font-bold block truncate">
                      {tx.description || tx.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {new Date(tx.created_at).toLocaleString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`font-black tabular-nums block ${
                      tx.amount_coins >= 0 ? 'text-emerald-400' : 'text-neutral-200'
                    }`}
                  >
                    {tx.amount_coins >= 0 ? `+${tx.amount_coins}` : tx.amount_coins} AC
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    ₦{Math.abs(tx.amount_naira || tx.amount_coins * 10).toLocaleString()} NGN
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-neutral-400 font-mono">
            No transactions yet. Deposit funds or complete a staked match to build your transaction record.
          </div>
        )}
      </div>
    </div>
  );
};
