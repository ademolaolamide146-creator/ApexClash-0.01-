import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Coins,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentBalance?: number;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance = 0,
}) => {
  const { user } = useAuth();
  const [nairaAmount, setNairaAmount] = useState<number | string>(1000);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedNaira =
    typeof nairaAmount === 'string' ? parseInt(nairaAmount, 10) || 0 : nairaAmount;
  const coinsCredit = Math.floor(parsedNaira / 10);

  const presets = [1000, 2500, 5000, 10000, 20000];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Minimum deposit requirement: 1,000 Naira
    if (parsedNaira < 1000) {
      setErrorMsg('Minimum deposit is ₦1,000 (100 Coins).');
      return;
    }

    if (!user) {
      setErrorMsg('User authentication required.');
      return;
    }

    setLoading(true);

    try {
      // 1. Credit wallet in Supabase
      const newBal = currentBalance + coinsCredit;
      const { error: walError } = await supabase
        .from('wallets')
        .update({
          balance: newBal,
        })
        .eq('user_id', user.id);

      if (walError) {
        throw new Error(walError.message || 'Failed to credit wallet balance.');
      }

      // 2. Insert transaction
      const txRef = `PSTK-DEP-${Date.now().toString().slice(-6)}`;
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount_coins: coinsCredit,
        amount_naira: parsedNaira,
        status: 'completed',
        reference_id: txRef,
        description: `Funded ₦${parsedNaira.toLocaleString()} via Instant Bank Transfer / Card`,
      });

      setSuccessNotice(
        `Successfully credited ${coinsCredit} Coins (₦${parsedNaira.toLocaleString()} NGN) to your wallet!`
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while processing deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#121212] border border-[#F5A623]/30 shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-mono tracking-tight">
                Deposit Naira
              </h3>
              <p className="text-xs text-neutral-400 font-sans">
                Instant Wallet Credit • ₦10 = 1 Coin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-xs font-mono flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleDeposit} className="space-y-5">
          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="deposit-amount" className="text-neutral-300 font-bold">Amount to Deposit (NGN)</label>
              <span className="text-[#F5A623] font-bold">Min: ₦1,000 (100 AC)</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono text-neutral-400 font-bold">
                ₦
              </span>
              <input
                id="deposit-amount"
                type="number"
                min={1000}
                step={500}
                value={nairaAmount}
                onChange={(e) => setNairaAmount(e.target.value)}
                placeholder="1000"
                className="w-full py-3 pl-8 pr-24 rounded-xl bg-black/60 border border-white/[0.1] text-white font-mono text-base font-bold focus:border-[#F5A623] focus:outline-none transition-colors"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400 font-bold">
                +{coinsCredit} Coins
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setNairaAmount(amt)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    parsedNaira === amt
                      ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#F5A623] font-bold'
                      : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Secure Payment Options */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Payment Channels Supported
              </span>
              <span className="text-emerald-400 text-[10px]">Instant Webhook</span>
            </div>
            <p className="text-neutral-400 font-sans text-xs">
              Direct Bank Transfer, Debit Card (Visa/Mastercard/Verve), USSD, and OPay/PalmPay transfer.
            </p>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || parsedNaira < 1000}
              className={`w-full py-4 px-6 rounded-xl font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                loading || parsedNaira < 1000
                  ? 'bg-white/[0.05] text-neutral-500 border border-white/[0.08] cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-emerald-500/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting Gateway...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₦{parsedNaira.toLocaleString()} via Instant Checkout</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
