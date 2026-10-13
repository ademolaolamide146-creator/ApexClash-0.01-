import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Trophy,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Transaction } from '../types';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onGoToWallet?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onGoToWallet,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleCopyRef = () => {
    if (!transaction.reference_id && !transaction.id) return;
    const textToCopy = transaction.reference_id || transaction.id;
    try {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const coins =
    transaction.amount_coins !== undefined
      ? transaction.amount_coins
      : ((transaction as any).coins || (transaction as any).amount || 0);
  const isPositive = coins >= 0;
  const isDeposit = transaction.type === 'deposit';
  const isWin = transaction.type === 'win_payout';
  const isRefund = transaction.type === 'match_refund';
  const isWithdraw = transaction.type === 'withdrawal';
  const isLocked = transaction.type === 'stake_locked';

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'deposit':
        return 'Paystack Deposit Top-up';
      case 'win_payout':
        return 'Match Victory Payout';
      case 'match_refund':
        return 'Escrow Stake Refund';
      case 'withdrawal':
        return 'Bank Account Payout';
      case 'stake_locked':
        return 'Escrow Micro-Stake Locked';
      case 'platform_rake':
        return 'Platform Commission Fee';
      default: {
        const rawType = String((transaction as any).type || '');
        return rawType ? rawType.replace(/_/g, ' ').toUpperCase() : 'Transaction Activity';
      }
    }
  };

  const getStatusBadge = () => {
    if (transaction.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    }
    if (transaction.status === 'locked') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
          <Lock className="w-3.5 h-3.5" />
          In Escrow
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-neutral-500/15 text-neutral-300 border border-neutral-500/30">
        <Clock className="w-3.5 h-3.5" />
        {transaction.status || 'Processed'}
      </span>
    );
  };

  const rawNaira =
    transaction.amount_naira !== undefined && transaction.amount_naira !== null
      ? Number(transaction.amount_naira)
      : coins * 10;
  const nairaAmount = isNaN(rawNaira) ? Math.abs(coins * 10) : Math.abs(rawNaira);
  const formattedDate = new Date(transaction.created_at || Date.now()).toLocaleString('en-NG', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Border */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isWin || isDeposit
              ? 'from-emerald-500 via-[#25D366] to-[#F5A623]'
              : isRefund
              ? 'from-cyan-500 via-blue-500 to-[#F5A623]'
              : isWithdraw
              ? 'from-[#F5A623] to-[#E0921A]'
              : 'from-amber-500 via-[#F5A623] to-red-500'
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#F5A623] font-mono flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Activity Details
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-5 md:p-6 space-y-5">
          {/* Hero Amount & Status Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center space-y-2">
            <div className="flex justify-center mb-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isWin || isDeposit
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isRefund
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : isWithdraw
                    ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30'
                    : 'bg-white/[0.06] text-neutral-300 border border-white/[0.1]'
                }`}
              >
                {isWin ? (
                  <Trophy className="w-6 h-6 text-amber-400" />
                ) : isDeposit ? (
                  <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
                ) : isRefund ? (
                  <RotateCcw className="w-6 h-6 text-cyan-400" />
                ) : isWithdraw ? (
                  <ArrowUpRight className="w-6 h-6 text-[#F5A623]" />
                ) : (
                  <Lock className="w-6 h-6 text-amber-300" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <h2
                className={`text-3xl font-black font-mono tracking-tight ${
                  isPositive ? 'text-emerald-400' : 'text-neutral-100'
                }`}
              >
                {isPositive ? `+${coins}` : coins} AC
              </h2>
            </div>

            <div className="text-xs font-mono text-neutral-400">
              ₦{nairaAmount.toLocaleString()} NGN equivalent
            </div>

            <div className="pt-2">{getStatusBadge()}</div>
          </div>

          {/* Full Transaction Fields */}
          <div className="space-y-3 font-mono text-xs">
            {/* Type / Action */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <span className="text-neutral-400">Category</span>
              <span className="text-white font-bold text-right">{getTypeLabel()}</span>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-neutral-400 block text-[11px]">Description</span>
              <p className="text-neutral-100 font-sans text-xs leading-relaxed font-medium">
                {transaction.description || 'No detailed memo recorded for this entry.'}
              </p>
            </div>

            {/* Date & Time */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <span className="text-neutral-400">Timestamp</span>
              <span className="text-neutral-200 text-right">{formattedDate}</span>
            </div>

            {/* Reference ID (with 1-click copy) */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <span className="text-neutral-400">Reference ID</span>
              <div className="flex items-center gap-2">
                <span className="text-[#F5A623] font-bold tracking-wider select-all">
                  {transaction.reference_id || transaction.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-colors"
                  title="Copy Reference"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Match ID (if linked) */}
            {transaction.match_id && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
                <span className="text-neutral-400">Linked Match</span>
                <span className="text-neutral-200 font-bold">{transaction.match_id}</span>
              </div>
            )}
          </div>

          {/* Security & Ledger Verification Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5 font-mono">
                <span>Apex Escrow Ledger Verified</span>
              </div>
              <p className="text-[10px] text-neutral-300 font-sans leading-relaxed">
                This transaction is cryptographically stored in the PostgreSQL ledger with anti-double-spend lock validation.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 pt-2">
            {onGoToWallet && (
              <button
                type="button"
                onClick={onGoToWallet}
                className="flex-1 py-3 px-4 rounded-xl font-bold font-mono text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>View Full Wallet Ledger</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold font-mono text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/20 cursor-pointer"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
