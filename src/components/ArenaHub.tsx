import React, { useState, useEffect } from 'react';
import { GameId } from '../types';
import { Swords, Plus, Users, Clock, Zap, Target, Copy, Share2, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export const ArenaHub: React.FC<{
  onOpenRules: (gameId: GameId) => void;
  onOpenQueue: (gameId: GameId, stake: number) => void;
  onOpenCreateRoom: (gameId: GameId) => void;
  onOpenJoinRoom: () => void;
  onOpenDeposit: () => void;
}> = ({ onOpenRules, onOpenQueue, onOpenCreateRoom, onOpenJoinRoom, onOpenDeposit }) => {
  const { user } = useAuth();
  const [activeChallenge, setActiveChallenge] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchActiveChallenge() {
      const { data, error } = await supabase
        .from('matches')
        .select('*, match_participants(*)')
        .eq('is_private', true)
        .eq('status', 'waiting')
        .eq('creator_id', user!.id)
        .maybeSingle();

      if (data) {
        setActiveChallenge(data);
      }
    }

    fetchActiveChallenge();
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. "My Active WhatsApp Challenges" Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#F5A623]/10 to-[#0A0A0A] border border-[#F5A623]/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 flex items-center justify-center text-[#F5A623]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">My Active WhatsApp Challenges</h3>
            <p className="text-xs text-neutral-400">Manage your private rooms and stakes</p>
          </div>
        </div>
        
        {activeChallenge ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white font-bold">{activeChallenge.game_id}</span>
              <span className="bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded">{activeChallenge.room_code}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-400">Stake</span>
              <span className="text-white">{activeChallenge.stake_amount} Coins</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold">
                <Share2 className="w-3 h-3" /> Share
              </button>
              <button className="flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold">
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button className="flex items-center justify-center gap-1 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-bold">
                <Trash2 className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-neutral-400 font-mono">
            No active private challenges found.
          </div>
        )}
      </div>

      {/* 2. Game Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { id: 'whot', name: 'Whot', desc: 'Nigeria\'s #1 Card Game', icon: Zap },
          { id: 'chess', name: 'Chess', desc: 'Rapid 5m Clock', icon: Target },
          { id: 'trivia', name: 'Trivia', desc: 'Speed Questions', icon: Users },
          { id: 'ludo', name: 'Ludo', desc: 'Tactical Race', icon: Clock },
        ].map((game) => (
          <div key={game.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.2] transition-colors space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-[#F5A623]">
                <game.icon className="w-5 h-5" />
              </div>
              <button onClick={() => onOpenRules(game.id as GameId)} className="text-[10px] text-neutral-400 hover:text-white underline font-mono">
                How It Works
              </button>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{game.name}</h4>
              <p className="text-[10px] text-neutral-400">{game.desc}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => onOpenQueue(game.id as GameId, 100)}
                className="py-2 px-3 rounded-xl bg-[#F5A623]/10 text-[#F5A623] text-[10px] font-bold hover:bg-[#F5A623]/20"
              >
                Play Queue
              </button>
              <button
                onClick={() => onOpenCreateRoom(game.id as GameId)}
                className="py-2 px-3 rounded-xl bg-white/[0.05] text-white text-[10px] font-bold hover:bg-white/[0.1]"
              >
                Challenge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
