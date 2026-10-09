import React from 'react';
import { Home, Swords, Trophy, Wallet as WalletIcon, User } from 'lucide-react';
import { DashboardTab } from '../types';

interface BottomNavBarProps {
  currentTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  lockedCoinsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    { id: 'home' as DashboardTab, label: 'Home', icon: Home },
    { id: 'arena' as DashboardTab, label: 'Arena', icon: Swords },
    { id: 'rankings' as DashboardTab, label: 'Rankings', icon: Trophy },
    { id: 'wallet' as DashboardTab, label: 'Wallet', icon: WalletIcon },
    { id: 'profile' as DashboardTab, label: 'Profile', icon: User },
  ];

  return (
    <nav aria-label="Bottom Navigation" className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-white/[0.08] px-2 sm:px-6 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#F5A623]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#F5A623] shadow-[0_0_8px_#F5A623]" />
                )}
              </div>
              <span className={`text-[10px] font-mono mt-1 ${isActive ? 'font-bold text-[#F5A623]' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
