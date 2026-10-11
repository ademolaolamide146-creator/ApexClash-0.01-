import React, { useState, useEffect, useCallback } from 'react';
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
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { ActiveMatch } from './types';

// Simple sound synthesizer
const playSound = (type: 'roll' | 'move' | 'win' | 'loss' | 'click') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'roll') {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'move') {
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {}
};

interface LudoGameProps {
  matchId: string;
  match?: ActiveMatch;
  onExit: () => void;
  onSettle: (result: { winner: boolean; payout: number }) => void;
}

export const LudoGame: React.FC<LudoGameProps> = ({ matchId, match, onExit, onSettle }) => {
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<any>(null);
  const [lastDice, setLastDice] = useState<number | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnState, setTurnState] = useState<'waiting_roll' | 'waiting_move'>('waiting_roll');
  const [showQuitModal, setShowQuitModal] = useState(false);
  
  // Dummy State for prototype
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setIsMyTurn(true);
      setBoard({ status: 'in_progress', tokens: [] });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRoll = async () => {
    playSound('roll');
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastDice(roll);
    setTurnState('waiting_move');
    // Actual implementation: supabase.functions.invoke('ludo-action', { body: { match_id: matchId, action: 'roll_dice' } })
  };

  const handleMove = async (tokenId: number) => {
    playSound('move');
    setTurnState('waiting_roll');
    // Actual implementation: supabase.functions.invoke('ludo-action', { body: { match_id: matchId, action: 'move_token', token_id: tokenId } })
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-[#F5A623]">Loading Ludo Board...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1A1A1A] p-4 rounded-2xl border border-white/10">
        <h2 className="text-xl font-black text-white">Classic Ludo</h2>
        <button onClick={() => setShowQuitModal(true)} className="px-3 py-1.5 bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 rounded-lg text-xs font-bold">Resign</button>
      </div>

      {/* Board Placeholder */}
      <div className="aspect-square bg-black border-2 border-[#333] rounded-xl flex items-center justify-center text-white/20">
        15x15 SVG Ludo Board
      </div>

      {/* Controls */}
      {isMyTurn && (
        <div className="flex justify-center gap-4">
          {turnState === 'waiting_roll' ? (
            <button onClick={handleRoll} className="px-8 py-4 bg-[#F5A623] text-black font-black rounded-full animate-pulse">ROLL DICE</button>
          ) : (
            <div className="text-[#F5A623] font-mono">Move with dice: {lastDice}</div>
          )}
        </div>
      )}

      {/* Modals */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#DC2626]/30 text-center max-w-sm">
            <ShieldAlert className="w-12 h-12 text-[#DC2626] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Quit & Forfeit Match?</h3>
            <p className="text-gray-400 text-sm mb-6">Stake awarded to opponent.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowQuitModal(false)} className="flex-1 py-3 bg-white/10 rounded-xl">Cancel</button>
              <button onClick={onExit} className="flex-1 py-3 bg-[#DC2626] rounded-xl">Yes, Quit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
