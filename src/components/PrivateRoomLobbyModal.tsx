import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageSquare,
  ShieldAlert,
  Coins,
  ArrowRight,
  Clock,
  Sparkles,
  Users,
  KeyRound,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { GameId } from '../types';
import { useAuth } from '../context/AuthContext';
import { createPrivateRoomRpc, joinPrivateRoomRpc, cancelPrivateRoomRpc } from '../lib/supabase';
import { STAKE_TIERS_CONFIG } from './MicroStakePicker';
import { ErrorCard } from './ErrorCard';

interface PrivateRoomLobbyModalProps {
  isOpen: boolean;
  initialMode?: 'create' | 'join';
  initialRoomCode?: string;
  onClose: () => void;
  onMatchMatched: (
    gameId: GameId,
    stake: number,
    opponentName: string,
    opponentLocation: string
  ) => void;
}

export const PrivateRoomLobbyModal: React.FC<PrivateRoomLobbyModalProps> = ({
  isOpen,
  initialMode = 'create',
  initialRoomCode = '',
  onClose,
  onMatchMatched,
}) => {
  const { user, wallet, lockStakeForMatch, refundStakeForCancelledMatch } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>(initialMode);

  // Create state
  const [selectedGame, setSelectedGame] = useState<GameId>('whot');
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [roomCode, setRoomCode] = useState<string>('');
  const [isRoomCreated, setIsRoomCreated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [waitingElapsed, setWaitingElapsed] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Join state
  const [joinCodeInput, setJoinCodeInput] = useState<string>(initialRoomCode);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Reset or initialize room code when opening
  useEffect(() => {
    if (isOpen) {
      setTab(initialMode);
      if (initialRoomCode) setJoinCodeInput(initialRoomCode);
      setIsRoomCreated(false);
      setWaitingElapsed(0);
      setJoinError(null);
      setCreateError(null);
      setIsCancelling(false);
    }
  }, [isOpen, initialMode, initialRoomCode]);

  // Timer in waiting lobby (15 minutes = 900 seconds limit)
  useEffect(() => {
    if (!isOpen || !isRoomCreated) return;
    const interval = setInterval(() => {
      setWaitingElapsed((prev) => {
        const next = prev + 1;
        // Auto-expire when reaching 15 minutes (900 seconds)
        if (next >= 900) {
          clearInterval(interval);
          handleAutoExpire();
          return 900;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isRoomCreated]);

  const handleAutoExpire = async () => {
    await refundStakeForCancelledMatch(selectedStake, undefined, 'WhatsApp room expired after 15 minutes');
    await cancelPrivateRoomRpc('', roomCode);
    setCreateError('Challenge room expired after 15 minutes. 100% of your stake has been automatically unlocked and refunded to your wallet.');
    setIsRoomCreated(false);
  };

  const handleCancelCreatedRoom = async () => {
    setIsCancelling(true);
    await refundStakeForCancelledMatch(selectedStake, undefined, 'WhatsApp challenge cancelled by host');
    await cancelPrivateRoomRpc('', roomCode);
    setIsCancelling(false);
    setIsRoomCreated(false);
    onClose();
  };


  if (!isOpen || !user) return null;

  const currentTier =
    STAKE_TIERS_CONFIG.find((t) => t.coins === selectedStake) || STAKE_TIERS_CONFIG[2];

  const generateRandomCode = (game: GameId) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 3; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${game.toUpperCase()}-${rand}`;
  };

  const handleCreateRoom = async () => {
    setCreateError(null);
    if (wallet.available_coins < selectedStake) {
      setCreateError(
        `Insufficient spendable balance. You have ${wallet.available_coins} Coins, but this room requires ${selectedStake} Coins.`
      );
      return;
    }

    const newCode = generateRandomCode(selectedGame);
    setRoomCode(newCode);

    // Call RPC to create room and lock creator stake
    const rpcRes = await createPrivateRoomRpc(
      selectedGame,
      user.id,
      selectedStake,
      newCode,
      user.username
    );

    if (rpcRes.error) {
      setCreateError(rpcRes.error);
      return;
    }

    // Lock creator stake
    await lockStakeForMatch(selectedGame, selectedStake, 'Awaiting Opponent');
    setIsRoomCreated(true);
  };

  const roomLink = `https://apexclash.ng/room/${roomCode}`;

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
        ? 'Speed Trivia'
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

  const handleSimulateFriendJoined = () => {
    onClose();
    onMatchMatched(
      selectedGame,
      selectedStake,
      'Friend_Accepted (WhatsApp)',
      'Lagos, Nigeria'
    );
  };

  const handleJoinRoom = async () => {
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean.length < 5) {
      setJoinError('Please enter a valid 6-character room code (e.g. WHOT-8K2).');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const res = await joinPrivateRoomRpc(clean, user.id, user.username);
    setIsJoining(false);

    if (res.error) {
      setJoinError(res.error);
      return;
    }

    const stake = res.matchData?.stake_amount || 100;
    const game = res.matchData?.game_id || 'whot';
    const opponent = res.matchData?.participants[0]?.username || 'Room Host';

    // Lock joiner stake
    await lockStakeForMatch(game, stake, opponent);

    onClose();
    onMatchMatched(game, stake, opponent, 'Host Arena');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#25D366] font-mono flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Private Challenge Rooms
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            WhatsApp 1v1 Arena
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Challenge your friends directly via viral WhatsApp links or join a private room code.
          </p>

          {/* Mode Switcher Tabs */}
          {!isRoomCreated && (
            <div className="flex p-1 my-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === 'create'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setTab('join')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === 'join'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Join with Code
              </button>
            </div>
          )}

          {/* 1. ROOM CREATED: WAITING LOBBY */}
          {isRoomCreated ? (
            <div className="space-y-5 my-2">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-[#25D366]/40 text-center space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Waiting for Friend ({formatTimer(waitingElapsed)})</span>
                  </div>

                  {/* 15-Minute Expiry Countdown */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in: {formatTimer(Math.max(0, 900 - waitingElapsed))}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-neutral-400 block">Room Code</span>
                  <div className="text-3xl font-black font-mono tracking-widest text-white">
                    {roomCode}
                  </div>
                  <span className="text-xs font-mono text-[#F5A623]">
                    {selectedGame.toUpperCase()} Duel · {selectedStake} Coins (₦{(selectedStake * 10).toLocaleString()})
                  </span>
                </div>

                {/* Expiration Notice Pill */}
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] font-mono text-neutral-300">
                  ⏳ Challenge expires in <span className="text-[#25D366] font-bold">{formatTimer(Math.max(0, 900 - waitingElapsed))}</span> (15m limit). 100% stake auto-refunded if friend does not join.
                </div>

                {/* Room Link Display */}
                <div className="flex items-center gap-2 bg-black/60 border border-white/[0.1] rounded-xl p-1.5 pl-3 text-left">
                  <span className="font-mono text-xs text-neutral-200 truncate flex-1">
                    {roomLink}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Share to WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#20BD5A] text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Challenge to WhatsApp</span>
              </button>

              {/* Cancel Challenge & Refund Stake Button */}
              <button
                type="button"
                onClick={handleCancelCreatedRoom}
                disabled={isCancelling}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCancelling ? 'Refunding Stake...' : 'Cancel Challenge & Refund Stake'}</span>
              </button>

              {/* Fast Test Simulator Button */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSimulateFriendJoined}
                  className="text-xs text-neutral-400 hover:text-[#F5A623] font-mono transition-colors cursor-pointer"
                >
                  [Simulate Friend Accepting Room Link]
                </button>
              </div>
            </div>
          ) : tab === 'create' ? (
            /* 2. CREATE ROOM FORM */
            <div className="space-y-4">
              {/* Game Selector */}
              <div>
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
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGame(g.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                        selectedGame === g.id
                          ? 'bg-[#F5A623] text-[#0A0A0A] border-[#F5A623]'
                          : 'bg-white/[0.03] text-neutral-300 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Select Micro-Stake
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {STAKE_TIERS_CONFIG.map((tier) => (
                    <button
                      key={tier.coins}
                      type="button"
                      onClick={() => setSelectedStake(tier.coins)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        selectedStake === tier.coins
                          ? 'bg-[#F5A623]/20 border-[#F5A623] text-white'
                          : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:border-white/20'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-[#F5A623]">{tier.coins} AC</div>
                      <div className="text-[10px] text-neutral-400 font-mono">₦{tier.naira}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout Summary */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono space-y-1">
                <div className="flex justify-between text-neutral-400">
                  <span>Match Stake:</span>
                  <span>{selectedStake} AC each (Pot: {selectedStake * 2} AC)</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-white/[0.06]">
                  <span>Winner Receives (90% after 10% rake):</span>
                  <span>+{currentTier.winCoins} Coins (₦{currentTier.winNaira.toLocaleString()})</span>
                </div>
              </div>

              {/* 15-Minute Expiration Notice Card */}
              <div className="p-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>15 Minutes Before Expiration</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#25D366]/20 text-[#25D366] font-bold">
                      100% Refund
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                    Your friend has <strong className="text-white">15 minutes</strong> to tap and join your WhatsApp link. If they do not enter within 15 minutes, the room expires automatically and your <span className="text-[#F5A623] font-bold">{selectedStake} Coins</span> will be 100% unlocked and returned to your spendable balance immediately.
                  </p>
                </div>
              </div>

              {createError && (
                <div className="mb-2">
                  <ErrorCard
                    title="Cannot Create Room"
                    message={createError}
                    onDismiss={() => setCreateError(null)}
                    autoDismissSeconds={6}
                  />
                </div>
              )}

              {/* Create CTA */}
              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-3.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all shadow-md shadow-[#F5A623]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
                <span>Create Room & Generate WhatsApp Link</span>
              </button>
            </div>
          ) : (
            /* 3. JOIN ROOM FORM */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Enter 6-Character Challenge Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value.toUpperCase());
                      setJoinError(null);
                    }}
                    placeholder="e.g. WHOT-8K2"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#F5A623] transition-colors font-mono tracking-widest uppercase font-bold"
                  />
                </div>
              </div>

              {joinError && (
                <ErrorCard
                  title="Failed to Join Room"
                  message={joinError}
                  onDismiss={() => setJoinError(null)}
                  autoDismissSeconds={6}
                />
              )}

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-neutral-400 font-mono">
                Joining will lock the designated match stake from your available balance into anti-double-spend escrow and transition straight to match start.
              </div>

              <button
                type="button"
                disabled={isJoining || joinCodeInput.trim().length < 5}
                onClick={handleJoinRoom}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-[#0A0A0A] hover:brightness-105 transition-all shadow-md shadow-[#F5A623]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isJoining ? (
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Duel Lobby</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
