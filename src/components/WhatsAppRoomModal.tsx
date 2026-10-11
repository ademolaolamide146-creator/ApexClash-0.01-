import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Shield, Coins, Sparkles, Clock } from 'lucide-react';
import { GameId, StakeTier } from '../types';
import { useAuth } from '../context/AuthContext';

interface WhatsAppRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchLobby: (roomId: string, gameId: GameId, stake: number) => void;
  onRequireAuth: () => void;
}

const STAKE_TIERS: StakeTier[] = [
  { coins: 25, naira: 250, label: 'Micro Starter' },
  { coins: 50, naira: 500, label: 'Standard Dual' },
  { coins: 100, naira: 1000, popular: true, label: 'Pro Contender' },
  { coins: 200, naira: 2000, label: 'Master Arena' },
  { coins: 500, naira: 5000, label: 'Apex High Stake' },
];

export const WhatsAppRoomModal: React.FC<WhatsAppRoomModalProps> = ({
  isOpen,
  onClose,
  onLaunchLobby,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameId>('whot');
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [copied, setCopied] = useState(false);
  const [roomCode] = useState(() => `AC-${Math.floor(1000 + Math.random() * 9000)}`);

  if (!isOpen) return null;

  const roomLink = `https://apexclash.ng/room/${roomCode}`;
  const totalPot = selectedStake * 2;
  const winnerPayout = Math.floor(totalPot * 0.9);
  const rake = totalPot - winnerPayout;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const gameName =
      selectedGame === 'whot'
        ? 'Naija Whot'
        : selectedGame === 'chess'
        ? 'Speed Chess'
        : selectedGame === 'trivia'
        ? 'Live Trivia'
        : 'Ludo Classic';

    const message = encodeURIComponent(
      `⚔️ I'm challenging you to a ${selectedStake} Apex Coins match in ${gameName} on ApexClash! Join here: https://apexclash.ng/room/${roomCode}`
    );

    try {
      navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard fallback
    }

    try {
      window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
    } catch {
      // iframe sandbox safeguard
    }
  };

  const handleEnterLobby = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    onLaunchLobby(roomCode, selectedGame, selectedStake);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Top Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#F5A623] to-[#E0921A]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#25D366] font-mono flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Instant Challenge
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Create Private Room
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Generate an encrypted private match link to challenge a friend directly via WhatsApp.
          </p>

          {/* Game Selector */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Select Game
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'whot', label: 'Whot' },
                  { id: 'chess', label: 'Chess' },
                  { id: 'trivia', label: 'Trivia' },
                  { id: 'ludo', label: 'Ludo' },
                ] as const
              ).map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                    selectedGame === game.id
                      ? 'bg-[#F5A623] text-[#0A0A0A] border-[#F5A623] shadow-md shadow-[#F5A623]/20'
                      : 'bg-white/[0.03] text-neutral-300 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {game.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stake Tier Selector */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Select Micro-Stake
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STAKE_TIERS.map((tier) => (
                <button
                  key={tier.coins}
                  type="button"
                  onClick={() => setSelectedStake(tier.coins)}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    selectedStake === tier.coins
                      ? 'bg-[#F5A623]/15 border-[#F5A623] text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-mono text-xs font-black text-[#F5A623]">
                    {tier.coins} AC
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    ₦{tier.naira.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Economy Calculation Box */}
          <div className="mt-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-white/[0.06]">
              <span>Total Match Pot (2x {selectedStake} Coins)</span>
              <span className="font-mono text-white font-bold">{totalPot} AC (₦{(totalPot * 10).toLocaleString()})</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-emerald-400 font-medium">Winner Receives (90% after 10% Rake)</span>
              <span className="font-mono text-emerald-400 font-black text-sm">{winnerPayout} AC (₦{(winnerPayout * 10).toLocaleString()})</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-2 font-mono">
              Transparent 10% rake ({rake} AC) deducted only on match victory. Official draws result in 100% refund with 0% fee.
            </p>
          </div>

          {/* 15-Minute Expiration Notice Card */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>15 Minutes Before Expiration</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#25D366]/20 text-[#25D366] font-bold">
                  100% Refund
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                Your friend has <strong className="text-white">15 minutes</strong> to accept and join your WhatsApp link. If they do not enter within 15 minutes, the room expires automatically and your <span className="text-[#F5A623] font-bold">{selectedStake} Coins</span> will be 100% unlocked and returned to your balance.
              </p>
            </div>
          </div>

          {/* Room Link Display */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Room Link
            </label>
            <div className="flex items-center gap-2 bg-black/50 border border-white/[0.1] rounded-xl p-1.5 pl-3">
              <span className="font-mono text-xs text-neutral-200 truncate flex-1">
                {roomLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Buttons: WhatsApp Share & Enter Lobby */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#20BD5A] text-black transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleEnterLobby}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#F5A623]/20"
            >
              <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
              <span>Enter Room Lobby</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
