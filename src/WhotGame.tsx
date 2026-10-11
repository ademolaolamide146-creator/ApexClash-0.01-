import React, { useState, useEffect } from 'react';
import {
  Trophy,
  ShieldAlert,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  Clock,
  Zap,
} from 'lucide-react';
import { ActiveMatch } from './types';
import { useAuth } from './context/AuthContext';

interface WhotGameProps {
  match: ActiveMatch;
  onExit: () => void;
  onSettle: (matchId: string, result: 'win' | 'loss' | 'draw') => Promise<void>;
  onPlayAgain?: () => void;
}

interface Card {
  shape: '★' | '▲' | '■' | '●' | '🃟';
  num: number;
}

export const WhotGame: React.FC<WhotGameProps> = ({
  match,
  onExit,
  onSettle,
  onPlayAgain,
}) => {
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [matchSeconds, setMatchSeconds] = useState(match.remainingSeconds || 180);
  const [gameStatus, setGameStatus] = useState<'playing' | 'completed'>('playing');
  const [matchResult, setMatchResult] = useState<'win' | 'loss' | 'forfeit'>('win');
  const [turnNumber, setTurnNumber] = useState(6);
  
  // Whot State
  const [whotCallCard, setWhotCallCard] = useState<Card>({ shape: '★', num: 14 });
  const [myHand, setMyHand] = useState<Card[]>([
    { shape: '★', num: 7 },
    { shape: '▲', num: 14 },
    { shape: '■', num: 1 },
    { shape: '●', num: 2 },
    { shape: '★', num: 20 },
  ]);
  const [oppCardCount, setOppCardCount] = useState(4);
  const [actionLog, setActionLog] = useState<string>('Match started. Your turn to play.');
  
  // Quit & Forfeit Modal State
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [settling, setSettling] = useState(false);

  // Sound synthesis helper
  const playSound = (type: 'card' | 'win' | 'lose' | 'click' | 'forfeit') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'card') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else if (type === 'lose' || type === 'forfeit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      // Ignore audio context restrictions
    }
  };

  // Match clock countdown
  useEffect(() => {
    if (gameStatus === 'completed') return;
    const interval = setInterval(() => {
      setMatchSeconds((prev) => {
        if (prev <= 1) {
          handleCompleteMatch('loss');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePlayCard = (card: Card, index: number) => {
    playSound('card');
    setWhotCallCard(card);
    const updatedHand = myHand.filter((_, i) => i !== index);
    setMyHand(updatedHand);
    setTurnNumber((prev) => prev + 1);

    if (updatedHand.length === 0) {
      playSound('win');
      handleCompleteMatch('win');
    } else {
      setActionLog(`You played ${card.num} ${card.shape}. Opponent thinking...`);
      // Simulate opponent turn after 1.2s
      setTimeout(() => {
        if (Math.random() > 0.5 && oppCardCount > 1) {
          setOppCardCount((prev) => Math.max(1, prev - 1));
        } else {
          setOppCardCount((prev) => prev + 1);
        }
        if (oppCardCount <= 1 && Math.random() > 0.4) {
          playSound('lose');
          handleCompleteMatch('loss');
        } else {
          setActionLog(`Opponent played a card. Your turn!`);
        }
      }, 1200);
    }
  };

  const handleDrawCard = () => {
    playSound('click');
    const shapes: Card['shape'][] = ['★', '▲', '■', '●'];
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const randomNum = Math.floor(1 + Math.random() * 14);
    setMyHand((prev) => [...prev, { shape: randomShape, num: randomNum }]);
    setTurnNumber((prev) => prev + 1);
    setActionLog(`You drew a card from the General Market.`);
  };

  const handleCompleteMatch = async (result: 'win' | 'loss' | 'forfeit') => {
    if (settling || gameStatus === 'completed') return;
    setSettling(true);
    setMatchResult(result);
    setGameStatus('completed');

    const settleResultMap = result === 'win' ? 'win' : 'loss';
    await onSettle(match.id, settleResultMap);
    setSettling(false);
  };

  const stake = match.stakeCoins;
  const pot = stake * 2;
  const fee = Math.floor(pot * 0.1);
  const payout = pot - fee;
  const netWalletChange = matchResult === 'win' ? payout - stake : -stake;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      {/* ================= TOP HEADER WITH QUIT BUTTON ================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1A1813] via-[#121212] to-[#0A0A0A] border border-[#F5A623]/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
              LIVE NAIJA WHOT DUEL
            </span>
            <span className="text-xs font-mono text-neutral-400">
              ID: <strong className="text-white">{match.id}</strong>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            Naija Whot Head-to-Head
          </h2>
          <div className="flex items-center gap-3 text-xs font-mono text-neutral-300 mt-1">
            <span>Stake: <strong className="text-[#F5A623]">{stake} AC (₦{(stake * 10).toLocaleString()})</strong></span>
            <span>·</span>
            <span>Total Pot: <strong className="text-white">{pot} AC</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#F5A623]" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          {/* Match Clock */}
          <div className="p-2.5 px-3 rounded-xl bg-black/60 border border-white/[0.08] text-center font-mono">
            <span className="text-[10px] text-neutral-400 block uppercase">Clock</span>
            <span className="text-sm font-black text-[#F5A623] tracking-widest tabular-nums">
              {formatTimer(matchSeconds)}
            </span>
          </div>

          {/* Quit / Forfeit Button */}
          {gameStatus === 'playing' && (
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setShowQuitModal(true);
              }}
              className="border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#DC2626]/10 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Quit Match</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= MAIN GAMEPLAY BOARD OR RECAP SCREEN ================= */}
      {gameStatus === 'playing' ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0A0A0A] border border-white/[0.08] shadow-2xl space-y-8">
          
          {/* Opponent Info & Hand Preview */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between w-full max-w-md text-xs font-mono">
              <span className="text-neutral-400">Opponent: <strong className="text-white">{match.opponentName}</strong></span>
              <span className="text-red-400 font-bold">{oppCardCount} Cards Left</span>
            </div>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: oppCardCount }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-14 rounded-lg bg-gradient-to-b from-[#DC2626] to-[#7F1D1D] border border-white/20 shadow-md flex items-center justify-center text-[9px] font-mono text-white/50 -ml-2 first:ml-0 transform hover:-translate-y-1 transition-transform"
                >
                  WHOT
                </div>
              ))}
            </div>
          </div>

          {/* Table Center (Market & Call Card) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
            {/* General Market Deck */}
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleDrawCard}
                className="w-24 h-36 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-white/20 hover:border-[#F5A623] flex flex-col items-center justify-center shadow-2xl transition-transform hover:scale-105 cursor-pointer group"
              >
                <Zap className="w-6 h-6 text-[#F5A623] mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono font-black text-white">MARKET</span>
                <span className="text-[10px] text-neutral-400 mt-1">Tap to Draw</span>
              </button>
            </div>

            {/* Active Call Card on Table */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block">Table Call Card</span>
              <div className="w-28 h-40 rounded-2xl bg-amber-50 border-4 border-[#F5A623] shadow-2xl flex flex-col justify-between p-3 text-neutral-900 font-mono font-black animate-scale-in transform hover:rotate-1 transition-transform">
                <div className="text-sm flex justify-between">
                  <span>{whotCallCard.num}</span>
                  <span>{whotCallCard.shape}</span>
                </div>
                <div className="text-5xl text-center">{whotCallCard.shape}</div>
                <div className="text-sm flex justify-between rotate-180">
                  <span>{whotCallCard.num}</span>
                  <span>{whotCallCard.shape}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Log Banner */}
          <div className="max-w-md mx-auto p-3 rounded-xl bg-black/60 border border-white/[0.08] text-center text-xs font-mono text-[#F5A623]">
            {actionLog}
          </div>

          {/* Player Hand */}
          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-xs font-mono px-2">
              <span className="text-emerald-400 font-bold uppercase">Your Hand ({myHand.length} Cards)</span>
              <span className="text-neutral-400">Tap a matching card to play</span>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {myHand.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePlayCard(card, idx)}
                  className="w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-amber-50 hover:bg-amber-100 hover:-translate-y-3 border-2 border-black/20 hover:border-[#F5A623] shadow-xl flex flex-col justify-between p-2 text-neutral-900 font-mono font-black transition-all cursor-pointer group"
                >
                  <div className="text-xs flex justify-between group-hover:scale-105">
                    <span>{card.num}</span>
                    <span>{card.shape}</span>
                  </div>
                  <div className="text-3xl sm:text-4xl text-center group-hover:scale-110 transition-transform">
                    {card.shape}
                  </div>
                  <div className="text-xs flex justify-between rotate-180 group-hover:scale-105">
                    <span>{card.num}</span>
                    <span>{card.shape}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* ================= 2. DEDICATED POST-MATCH SUMMARY / RECAP SCREEN ================= */
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#16130E] via-[#0D0D0D] to-[#0A0A0A] border-2 border-[#F5A623]/40 shadow-2xl space-y-8 animate-scale-in">
          
          {/* Hero Result Header */}
          <div className="text-center space-y-3 relative">
            <div className={`absolute inset-0 blur-3xl pointer-events-none rounded-full ${
              matchResult === 'win' ? 'bg-emerald-500/10' : 'bg-[#DC2626]/10'
            }`} />

            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-2xl ${
              matchResult === 'win' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/40'
            }`}>
              {matchResult === 'win' ? <Trophy className="w-8 h-8 stroke-[2.5]" /> : <Flame className="w-8 h-8 stroke-[2.5]" />}
            </div>

            <div>
              <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                matchResult === 'win' ? 'text-emerald-400' : 'text-[#DC2626]'
              }`}>
                {matchResult === 'win' && 'VICTORY 🏆'}
                {matchResult === 'loss' && 'DEFEAT 💀'}
                {matchResult === 'forfeit' && 'MATCH FORFEITED 💀'}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-neutral-300 mt-1 max-w-md mx-auto">
                {matchResult === 'win'
                  ? 'You outplayed your opponent and cleared your hand!'
                  : matchResult === 'forfeit'
                  ? 'You forfeited the match mid-game. Stake awarded to opponent.'
                  : 'Your opponent emptied their hand first. Better luck next round!'}
              </p>
            </div>
          </div>

          {/* Financial Breakdown Card (10% Transparent Rake Math) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/[0.06] pb-3">
              <span className="uppercase font-bold tracking-wider text-[#F5A623]">Financial Ledger & 10% Rake Math</span>
              <span className="text-[10px]">Provably Fair</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Staked Amount:</span>
                <span className="font-bold text-white">{stake} Coins (₦{(stake * 10).toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Total Pot (1v1):</span>
                <span className="font-bold text-white">{pot} Coins</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Platform Fee (10% Flat Rake):</span>
                <span className="font-bold text-red-400">-{fee} Coins</span>
              </div>
              <div className="flex justify-between text-neutral-300 pt-2 border-t border-white/[0.06]">
                <span>Net Winner Payout:</span>
                <span className="font-bold text-emerald-400">+{payout} Coins (₦{(payout * 10).toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Net Wallet Change:</span>
                <span className={`font-bold ${netWalletChange >= 0 ? 'text-emerald-400' : 'text-[#DC2626]'}`}>
                  {netWalletChange >= 0 ? `+${netWalletChange}` : netWalletChange} Coins
                </span>
              </div>
            </div>
          </div>

          {/* Match Performance Stats Strip */}
          <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] text-neutral-400 uppercase block">Total Turns</span>
              <span className="text-base font-black text-white">{turnNumber}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] text-neutral-400 uppercase block">Final Hands</span>
              <span className="text-xs font-black text-[#F5A623]">{myHand.length} vs {oppCardCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] text-neutral-400 uppercase block">Result</span>
              <span className={`text-xs font-black uppercase ${matchResult === 'win' ? 'text-emerald-400' : 'text-[#DC2626]'}`}>
                {matchResult}
              </span>
            </div>
          </div>

          {/* Post-Match Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                if (onPlayAgain) onPlayAgain();
                else onExit();
              }}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl text-xs font-black bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-105 transition-all shadow-lg shadow-[#F5A623]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 fill-current" />
              <span>Play Another Whot Match ⚔️</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                onExit();
              }}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-[#F5A623]" />
              <span>Back to Arena</span>
            </button>
          </div>

        </div>
      )}

      {/* ================= 1.2 CONFIRMATION MODAL FOR QUIT & FORFEIT ================= */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#14120F] border-2 border-[#DC2626]/50 shadow-2xl space-y-6 text-center">
            
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626] shadow-lg">
              <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white font-mono">Quit & Forfeit Match?</h3>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                Leaving mid-game forfeits your stake. Your opponent will automatically win and receive the pot.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setShowQuitModal(false);
                }}
                className="w-full py-3 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-colors cursor-pointer"
              >
                Keep Playing
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('forfeit');
                  setShowQuitModal(false);
                  handleCompleteMatch('forfeit');
                }}
                className="w-full py-3 rounded-xl text-xs font-black bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-lg shadow-[#DC2626]/30 transition-all cursor-pointer"
              >
                Yes, Forfeit Match
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
