import React from 'react';
import {
  ArrowLeft,
  Coins,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Swords,
  Sparkles,
  Info,
  Check,
  Flame,
} from 'lucide-react';
import { GameId } from '../types';

export interface StakeTierConfig {
  coins: number;
  naira: number;
  winCoins: number;
  winNaira: number;
  popular?: boolean;
}

export const STAKE_TIERS_CONFIG: StakeTierConfig[] = [
  { coins: 25, naira: 250, winCoins: 45, winNaira: 450 },
  { coins: 50, naira: 500, winCoins: 90, winNaira: 900 },
  { coins: 100, naira: 1000, winCoins: 180, winNaira: 1800, popular: true },
  { coins: 200, naira: 2000, winCoins: 360, winNaira: 3600 },
  { coins: 500, naira: 5000, winCoins: 900, winNaira: 9000 },
];

const GAME_NAMES: Record<GameId, string> = {
  whot: 'Naija Whot',
  chess: 'Speed Chess',
  trivia: 'Speed Trivia',
  ludo: 'Ludo Classic',
};

interface MicroStakePickerProps {
  gameId: GameId;
  walletBalance: number;
  selectedStake: number | null;
  onSelectStake: (stake: number) => void;
  onBack: () => void;
  onFindMatch: (gameId: GameId, stake: number) => void;
  onFundWallet: () => void;
}

export const MicroStakePicker: React.FC<MicroStakePickerProps> = ({
  gameId,
  walletBalance,
  selectedStake,
  onSelectStake,
  onBack,
  onFindMatch,
  onFundWallet,
}) => {
  const gameName = GAME_NAMES[gameId] || 'Skill Arena';
  const hasZeroBalance = walletBalance <= 0;
  const isStakeValid =
    selectedStake !== null && selectedStake > 0 && walletBalance >= selectedStake;

  const currentTier = STAKE_TIERS_CONFIG.find((t) => t.coins === selectedStake);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-16">
      {/* Top Header with Back to Games */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#F5A623] font-bold block">
              Discipline Selected
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {gameName}
            </h2>
          </div>
        </div>

        {/* Live Wallet Balance Display */}
        <div className="p-3 px-4 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between sm:justify-end gap-3 font-mono">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              Spendable Balance
            </span>
            <span className="text-sm sm:text-base font-black text-[#F5A623] flex items-center gap-1.5 sm:justify-end">
              <Coins className="w-4 h-4" />
              <span>{walletBalance} Coins</span>
              <span className="text-neutral-500 text-xs font-normal">
                (₦{(walletBalance * 10).toLocaleString()})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ⚠️ Zero Balance Warning Banner */}
      {hasZeroBalance && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white font-mono">
                ⚠️ Insufficient Balance: You have 0 Coins.
              </h4>
              <p className="text-xs text-neutral-300 font-sans mt-0.5">
                Fund your wallet to enter staked matches and win real cash in Nigerian Naira.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFundWallet}
            className="py-2.5 px-5 rounded-xl font-mono text-xs font-bold bg-[#DC2626] hover:bg-[#DC2626]/80 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#DC2626]/20 flex-shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Fund Wallet</span>
          </button>
        </div>
      )}

      {/* Stake Selection Heading */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
          <span>Choose Micro-Stake Tier</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20 font-sans">
            Strict 1v1 Escrow
          </span>
        </h3>
        <p className="text-xs text-neutral-400 font-sans">
          Both players lock the exact same stake in escrow. The winner claims the pot minus 10% flat rake.
        </p>
      </div>

      {/* The 5 Micro-Stake Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {STAKE_TIERS_CONFIG.map((tier) => {
          const isSelected = selectedStake === tier.coins;
          const isInsufficient = walletBalance < tier.coins;

          return (
            <button
              key={tier.coins}
              type="button"
              disabled={isInsufficient}
              onClick={() => onSelectStake(tier.coins)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-[#F5A623]/20 via-[#1A1813] to-black border-[#F5A623] shadow-lg shadow-[#F5A623]/20'
                  : isInsufficient
                  ? 'bg-white/[0.01] border-white/[0.05] opacity-60 cursor-not-allowed'
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && !isInsufficient && (
                <div className="absolute top-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#F5A623] text-black text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Flame className="w-2.5 h-2.5 fill-current" />
                    Popular
                  </span>
                </div>
              )}

              {/* Insufficient Tag */}
              {isInsufficient && (
                <div className="absolute top-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-[#DC2626]/20 border border-[#DC2626]/40 text-[#DC2626] text-[9px] font-mono font-bold uppercase tracking-wider">
                    Insufficient Balance
                  </span>
                </div>
              )}

              {/* Tier Stake Amount */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Coins className={`w-4 h-4 ${isSelected ? 'text-[#F5A623]' : 'text-neutral-400'}`} />
                  <span className="font-mono font-black text-lg text-white">
                    {tier.coins} Coins
                  </span>
                </div>
                <div className="text-xs font-mono text-neutral-400">
                  ₦{tier.naira.toLocaleString()} Entry
                </div>
              </div>

              {/* Winning Pot Calculation */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 font-mono uppercase block">
                    Winner Takes
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Win {tier.winCoins} Coins (₦{tier.winNaira.toLocaleString()})
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-[#F5A623] text-black border-[#F5A623]'
                      : 'border-white/[0.1] bg-black/40 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Transparent Platform Fee Notice */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 text-xs text-neutral-400 font-sans">
        <Info className="w-4 h-4 text-[#F5A623] flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-neutral-200">Platform fee:</strong> 10% flat rake taken from winner. Draws are 100% refunded to both players with zero fee.
        </p>
      </div>

      {/* Selected Stake Summary Card */}
      {currentTier && walletBalance >= currentTier.coins && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#F5A623]/10 to-transparent border border-[#F5A623]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#F5A623] font-bold">
              Ready to Match
            </span>
            <div className="text-xs text-neutral-200 font-sans">
              Locking <strong className="font-mono text-white">{currentTier.coins} Coins (₦{currentTier.naira})</strong> in escrow for {gameName}.
            </div>
          </div>
          <div className="font-mono text-xs text-emerald-400 font-bold bg-black/50 px-3 py-1.5 rounded-lg border border-emerald-500/30">
            Payout: +{currentTier.winCoins} AC
          </div>
        </div>
      )}

      {/* CTA Button: Find Match */}
      <div className="pt-2">
        <button
          type="button"
          disabled={!isStakeValid}
          onClick={() => {
            if (isStakeValid && selectedStake) {
              onFindMatch(gameId, selectedStake);
            }
          }}
          className={`w-full py-4 px-6 rounded-xl font-mono font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl ${
            isStakeValid
              ? 'bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-[#F5A623]/25'
              : 'bg-white/[0.05] text-neutral-500 border border-white/[0.08] cursor-not-allowed opacity-50'
          }`}
        >
          <Swords className="w-4 h-4 fill-current" />
          <span>
            {hasZeroBalance
              ? 'Insufficient Balance — Fund Wallet First'
              : !selectedStake
              ? 'Select Stake Tier Above'
              : walletBalance < selectedStake
              ? `Insufficient Balance for ${selectedStake} Coins`
              : `Find Match (${selectedStake} Coins • ₦${selectedStake * 10})`}
          </span>
        </button>
      </div>
    </div>
  );
};
