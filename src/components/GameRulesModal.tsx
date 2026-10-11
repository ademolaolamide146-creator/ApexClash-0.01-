import React from 'react';
import { X, Zap, Target, Users, Clock, ShieldCheck, CheckCircle2, Swords, Award, AlertCircle } from 'lucide-react';
import { GameId } from '../types';

interface GameRulesModalProps {
  isOpen: boolean;
  gameId: GameId;
  onClose: () => void;
  onPlayNow: (gameId: GameId) => void;
}

interface RuleItem {
  title: string;
  desc: string;
}

interface GameDetail {
  name: string;
  tagline: string;
  formatBadge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  rulesList: RuleItem[];
  tips: string[];
}

const GAME_DETAILS: Record<GameId, GameDetail> = {
  whot: {
    name: 'Naija Whot',
    tagline: "Nigeria's #1 Skill Card Game",
    formatBadge: 'Whot: 1v1 First to Empty Hand • 10% Flat Rake',
    icon: Zap,
    iconColor: '#F5A623',
    rulesList: [
      {
        title: 'Core Objective',
        desc: 'First player to empty all cards from their hand wins the match and collects the staked pot.',
      },
      {
        title: 'Turn Matching',
        desc: 'Match the top card on the pile by shape (Circle, Triangle, Cross, Square, Star) or by number (1-14).',
      },
      {
        title: 'Special Action Cards',
        desc: 'Hold On (1) repeats your turn. Pick Two (2) forces opponent to draw 2. Pick Three (5) forces opponent to draw 3. Suspension (8) skips opponent. General Market (14) forces all rivals to draw 1.',
      },
      {
        title: 'Whot (20) Wild Card',
        desc: 'Play card 20 on any shape or number to call for whatever shape you need next.',
      },
      {
        title: 'Strict Engine Rules',
        desc: 'Server-authoritative card deck shuffling and validation. Defend Pick 2 with Pick 2 or Pick 3 with Pick 3 according to authentic Naija rules.',
      },
    ],
    tips: [
      'Save your Whot 20 card for defensive plays when an opponent calls "Last Card".',
      'Use Suspension (8) and Hold On (1) to chain multiple cards in a single turn.',
    ],
  },
  chess: {
    name: 'Speed Chess',
    tagline: '5-Minute Blitz Clock',
    formatBadge: 'Chess: 5-minute Rapid Clock • 10% Flat Rake',
    icon: Target,
    iconColor: '#38BDF8',
    rulesList: [
      {
        title: '5-Minute Rapid Clock',
        desc: 'Each player has 5 minutes of total thinking time. Moving passes the turn and pauses your clock.',
      },
      {
        title: 'Server-Validated Moves',
        desc: 'Every move is validated in real time against strict FIDE standard chess rules by our server engine.',
      },
      {
        title: 'Checkmate or Timeout to Win',
        desc: 'Deliver checkmate or win when your opponent runs out of time on their clock.',
      },
      {
        title: 'Full Refund on Draw',
        desc: 'Stalemate, threefold repetition, 50-move rule, or agreed draws result in 100% full refund with 0% platform fee.',
      },
      {
        title: 'Fair-Play Engine',
        desc: 'Stockfish evaluation and anti-engine heuristics monitor moves to guarantee authentic human-to-human play.',
      },
    ],
    tips: [
      'Control the center squares (e4, d4, e5, d5) early to dominate piece mobility.',
      'Manage your clock wisely; losing on time loses the stake regardless of piece advantage.',
    ],
  },
  trivia: {
    name: 'Speed Trivia',
    tagline: 'Naija Culture & World Knowledge',
    formatBadge: 'Trivia: 10 Speed Questions • 10% Flat Rake',
    icon: Users,
    iconColor: '#A855F7',
    rulesList: [
      {
        title: '10 Synchronized Questions',
        desc: 'Both players receive the exact same 10 multiple-choice questions simultaneously in real time.',
      },
      {
        title: 'Speed + Accuracy Scoring',
        desc: 'Earn 100 base points for each correct answer plus up to 50 reaction speed bonus points the faster you lock in.',
      },
      {
        title: '15-Second Buzzer Limit',
        desc: 'You have exactly 15 seconds to answer each question before the round advances automatically.',
      },
      {
        title: 'Highest Score Takes Pot',
        desc: 'The player with the highest total points after question 10 wins the match and claims the pot.',
      },
      {
        title: 'Draw Policy',
        desc: 'In the rare event of identical total scores, the locked stake is 100% refunded to both players.',
      },
    ],
    tips: [
      'Lock in quickly! Answering correctly in 2 seconds yields nearly 50% more points than answering in 14 seconds.',
      'Questions cover Naija music, Super Eagles football, Nigerian history, and global general knowledge.',
    ],
  },
  ludo: {
    name: 'Ludo Classic',
    tagline: 'Tactical 4-Token Race',
    formatBadge: 'Ludo: Tactical 4-Token Race • 10% Flat Rake',
    icon: Clock,
    iconColor: '#34D399',
    rulesList: [
      {
        title: 'Roll 6 to Launch Tokens',
        desc: 'Tokens stay in your base yard until you roll a 6 on the die. Rolling a 6 earns a free bonus roll.',
      },
      {
        title: 'Cut Opponent Pawns',
        desc: 'Landing on an opponent token cuts it and sends it straight back to their base yard.',
      },
      {
        title: 'Safe Squares & Blocks',
        desc: 'Star spaces and starting positions are safe zones where tokens cannot be captured.',
      },
      {
        title: 'First to 4 Tokens Home Wins',
        desc: 'Navigate all 4 of your colored tokens around the perimeter track and into the home column to win.',
      },
      {
        title: 'Server-Authoritative Dice',
        desc: 'All dice rolls are cryptographic pseudo-random numbers generated server-side to prevent tampering.',
      },
    ],
    tips: [
      'Prioritize cutting an opponent’s advanced pawn even if it delays moving your own tokens.',
      'Keep a token waiting in your starting safe square to trap opponents passing by.',
    ],
  },
};

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  gameId,
  onClose,
  onPlayNow,
}) => {
  if (!isOpen) return null;

  const detail = GAME_DETAILS[gameId] || GAME_DETAILS.whot;
  const Icon = detail.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#121212] border border-[#F5A623]/30 shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-white/[0.03] to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.1] bg-white/[0.04]"
              style={{ color: detail.iconColor }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white font-mono tracking-tight">
                  {detail.name}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 font-sans">{detail.tagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Format Badge */}
          <div className="p-3.5 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center gap-2.5 text-[#F5A623] font-mono font-bold">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs tracking-wide">{detail.formatBadge}</span>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-widest text-neutral-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#F5A623]" />
              Official Match Rules
            </h4>
            <div className="space-y-2.5">
              {detail.rulesList.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-[#F5A623]/15 text-[#F5A623] flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-white font-mono block">{rule.title}</span>
                    <p className="text-neutral-300 font-sans leading-relaxed text-xs">
                      {rule.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical Tips */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pro Tips
            </span>
            <ul className="space-y-1.5 text-neutral-300 text-xs font-sans list-disc pl-4">
              {detail.tips.map((tip, idx) => (
                <li key={idx} className="leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="p-6 border-t border-white/[0.08] bg-black/60 flex items-center justify-between gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-xl font-mono text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.1] transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onPlayNow(gameId)}
            className="flex-1 py-3.5 px-6 rounded-xl font-mono font-black text-xs uppercase tracking-wider bg-gradient-to-r from-[#F5A623] to-[#E0921A] text-black hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5A623]/25 cursor-pointer"
          >
            <Swords className="w-4 h-4 fill-current" />
            <span>Play {detail.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
