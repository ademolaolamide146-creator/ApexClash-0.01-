import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Coins,
  Sparkles,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SavedBank } from '../types';
import { NIGERIAN_BANKS } from '../lib/nigerianBanks';
import { useAuth } from '../context/AuthContext';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBank: SavedBank | null;
  availableCoins: number;
  onBankUpdated: (bank: SavedBank) => void;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  savedBank,
  availableCoins,
  onBankUpdated,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [coinsAmount, setCoinsAmount] = useState<number | string>(100);
  const [useDifferentBank, setUseDifferentBank] = useState(false);

  // Manual / New bank form state
  const [selectedBankName, setSelectedBankName] = useState(NIGERIAN_BANKS[0].name);
  const [selectedBankCode, setSelectedBankCode] = useState(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUseDifferentBank(false);
      setErrorMsg(null);
      setSuccessNotice(null);
      setCoinsAmount(100);
      if (!savedBank) {
        setSelectedBankName(NIGERIAN_BANKS[0].name);
        setSelectedBankCode(NIGERIAN_BANKS[0].code);
        setAccountNumber('');
        setAccountName('');
      } else {
        setSelectedBankName(savedBank.bank_name);
        setSelectedBankCode(savedBank.bank_code);
        setAccountNumber(savedBank.account_number);
        setAccountName(savedBank.account_name);
      }
    }
  }, [isOpen, savedBank]);

  if (!isOpen) return null;

  const parsedCoins = typeof coinsAmount === 'string' ? parseInt(coinsAmount, 10) || 0 : coinsAmount;
  const nairaAmount = parsedCoins * 10;
  const hasSavedBank = Boolean(savedBank && !useDifferentBank);

  const handleBankSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bName = e.target.value;
    setSelectedBankName(bName);
    const found = NIGERIAN_BANKS.find((b) => b.name === bName);
    if (found) {
      setSelectedBankCode(found.code);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Minimum withdrawal validation
    if (parsedCoins < 100) {
      setErrorMsg('Minimum withdrawal is 100 Coins (₦1,000 NGN).');
      return;
    }

    // 2. Available balance validation
    if (parsedCoins > availableCoins) {
      setErrorMsg(
        `Insufficient available balance. You have ${availableCoins} Coins (₦${(
          availableCoins * 10
        ).toLocaleString()} NGN). Locked tournament stakes cannot be withdrawn.`
      );
      return;
    }

    let finalBankName = '';
    let finalBankCode = '';
    let finalAccountNum = '';
    let finalAccountName = '';

    if (hasSavedBank && savedBank) {
      finalBankName = savedBank.bank_name;
      finalBankCode = savedBank.bank_code;
      finalAccountNum = savedBank.account_number;
      finalAccountName = savedBank.account_name;
    } else {
      // Validate manual input
      if (!accountNumber || accountNumber.trim().length !== 10) {
        setErrorMsg('Please enter a valid 10-digit Nigerian NUBAN account number.');
        return;
      }
      if (!accountName || accountName.trim().length < 3) {
        setErrorMsg('Please enter the verified account holder name.');
        return;
      }
      finalBankName = selectedBankName;
      finalBankCode = selectedBankCode;
      finalAccountNum = accountNumber.trim();
      finalAccountName = accountName.trim().toUpperCase();
    }

    if (!user) {
      setErrorMsg('User authentication required.');
      return;
    }

    setLoading(true);

    try {
      // 1. If saveToProfile is checked (or no saved bank previously), persist to profiles table
      if ((!hasSavedBank && saveToProfile) || !savedBank) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            bank_name: finalBankName,
            bank_code: finalBankCode,
            account_number: finalAccountNum,
            account_name: finalAccountName,
          })
          .eq('id', user.id);

        if (!profileUpdateError) {
          onBankUpdated({
            bank_name: finalBankName,
            bank_code: finalBankCode,
            account_number: finalAccountNum,
            account_name: finalAccountName,
          });
        }
      }

      // 2. Deduct available balance in wallets table
      const newBalance = Math.max(0, availableCoins - parsedCoins);
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
        })
        .eq('user_id', user.id);

      if (walletError) {
        throw new Error(walletError.message || 'Failed to update wallet balance.');
      }

      // 3. Insert real withdrawal transaction
      const txRef = `WTH-${Date.now().toString().slice(-6)}`;
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount_coins: -parsedCoins,
        amount_naira: -nairaAmount,
        status: 'pending',
        reference_id: txRef,
        description: `Direct Payout to ${finalBankName} (${finalAccountNum.slice(-4)})`,
      });

      setSuccessNotice(
        `Withdrawal of ${parsedCoins} Coins (₦${nairaAmount.toLocaleString()} NGN) successfully initiated to ${finalAccountName} at ${finalBankName}. Payout will arrive within minutes.`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during withdrawal processing.');
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
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5A623]/15 text-[#F5A623] flex items-center justify-center border border-[#F5A623]/30 flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-mono tracking-tight">
                Withdraw Winnings
              </h3>
              <p className="text-xs text-neutral-400 font-sans">
                Direct NGN bank transfer • 1 Coin = ₦10
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

        {/* Available Balance Strip */}
        <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Withdrawable Balance
            </span>
            <span className="text-sm font-black text-[#F5A623]">
              {availableCoins} Coins <span className="text-neutral-400 text-xs font-normal">(₦{(availableCoins * 10).toLocaleString()} NGN)</span>
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 font-sans">
            Locked stakes excluded
          </span>
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

        <form onSubmit={handleSubmitWithdrawal} className="space-y-5">
          {/* Amount input */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="withdraw-coins" className="text-neutral-300 font-bold">Coins to Withdraw</label>
              <span className="text-[#F5A623] font-bold">Min: 100 Coins (₦1,000)</span>
            </div>
            <div className="relative">
              <input
                id="withdraw-coins"
                type="number"
                min={100}
                max={availableCoins}
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder="100"
                className="w-full py-3 pl-4 pr-24 rounded-xl bg-black/60 border border-white/[0.1] text-white font-mono text-base font-bold focus:border-[#F5A623] focus:outline-none transition-colors"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                ≈ ₦{nairaAmount.toLocaleString()} NGN
              </span>
            </div>
            {/* Quick quick chips */}
            <div className="flex gap-2 pt-1 font-mono text-xs">
              {[100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCoinsAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                    parsedCoins === amt
                      ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#F5A623] font-bold'
                      : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
                  }`}
                >
                  {amt} AC
                </button>
              ))}
              {availableCoins > 100 && (
                <button
                  type="button"
                  onClick={() => setCoinsAmount(availableCoins)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-400 hover:text-[#F5A623] text-[11px] ml-auto transition-all cursor-pointer"
                >
                  Max Available
                </button>
              )}
            </div>
          </div>

          {/* SCENARIO A: User already has a saved bank account */}
          {hasSavedBank && savedBank ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-neutral-300">
                  Payout Destination
                </span>
                <button
                  type="button"
                  onClick={() => setUseDifferentBank(true)}
                  className="text-xs font-mono text-[#F5A623] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Use different bank</span>
                </button>
              </div>

              {/* Sleek Saved Bank Card (bg-white/[0.04] border border-[#F5A623]/30 rounded-xl p-3.5) */}
              <div className="bg-white/[0.04] border border-[#F5A623]/30 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#F5A623]" />
                    <span className="text-sm font-bold text-white font-mono">
                      {savedBank.bank_name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Verified Payout Account
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                  <div className="text-neutral-400">
                    Account: <strong className="text-white tracking-widest">{savedBank.account_number}</strong>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    {savedBank.account_name}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SCENARIO B: User has NO saved bank (or chose to change it) */
            <div className="space-y-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-neutral-300">
                  Enter Nigerian Bank Details
                </span>
                {savedBank && (
                  <button
                    type="button"
                    onClick={() => setUseDifferentBank(false)}
                    className="text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
                  >
                    ← Back to saved account
                  </button>
                )}
              </div>

              {/* Bank Select dropdown */}
              <div className="space-y-1">
                <label htmlFor="bank-select" className="text-[11px] font-mono text-neutral-400 block">Bank Name</label>
                <select
                  id="bank-select"
                  value={selectedBankName}
                  onChange={handleBankSelectChange}
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs focus:border-[#F5A623] focus:outline-none"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number input (10 digits) */}
              <div className="space-y-1">
                <label htmlFor="account-number" className="text-[11px] font-mono text-neutral-400 block">
                  NUBAN Account Number (10 digits)
                </label>
                <input
                  id="account-number"
                  type="text"
                  maxLength={10}
                  pattern="\d{10}"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="0123456789"
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs tracking-wider focus:border-[#F5A623] focus:outline-none"
                  required
                />
              </div>

              {/* Account Name field */}
              <div className="space-y-1">
                <label htmlFor="account-name" className="text-[11px] font-mono text-neutral-400 block">
                  Account Name (as registered with bank)
                </label>
                <input
                  id="account-name"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  placeholder="CHIDI EMEKA"
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/[0.1] text-white font-mono text-xs uppercase focus:border-[#F5A623] focus:outline-none"
                  required
                />
              </div>

              {/* Checkbox: Save this bank account */}
              <label className="flex items-center gap-2.5 text-xs text-neutral-300 font-sans cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                  className="w-4 h-4 rounded bg-black border-white/20 text-[#F5A623] focus:ring-0 cursor-pointer accent-[#F5A623]"
                />
                <span>Save this bank account to my profile for future instant withdrawals</span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || parsedCoins < 100 || parsedCoins > availableCoins}
              className={`w-full py-4 px-6 rounded-xl font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                loading || parsedCoins < 100 || parsedCoins > availableCoins
                  ? 'bg-white/[0.05] text-neutral-500 border border-white/[0.08] cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-[#F5A623]/25'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {hasSavedBank
                      ? `Withdraw ₦${nairaAmount.toLocaleString()} to Saved Account`
                      : `Withdraw ₦${nairaAmount.toLocaleString()}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
