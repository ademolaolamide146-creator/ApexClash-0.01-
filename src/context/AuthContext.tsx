import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserProfile,
  WalletState,
  Transaction,
  ActiveMatch,
  GameId,
} from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getLocalSession,
  setLocalSession,
  getLocalUsers,
  saveLocalUsers,
  convertStoredUserToProfile,
  getLocalTransactions,
  saveLocalTransaction,
  getLocalActiveMatches,
  saveLocalActiveMatches,
  StoredUser,
  acknowledgeFinishedMatch,
} from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  wallet: WalletState;
  transactions: Transaction[];
  activeMatches: ActiveMatch[];
  loading: boolean;
  error: string | null;
  is18Verified: boolean;
  verify18Plus: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ success: boolean; error?: string; session?: any; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  depositCoins: (coins: number, paymentRef: string) => Promise<{ success: boolean; message: string }>;
  withdrawCoins: (
    coins: number,
    bankCode: string,
    accountNumber: string,
    accountName: string
  ) => Promise<{ success: boolean; error?: string }>;
  lockStakeForMatch: (
    gameId: GameId,
    stakeCoins: number,
    opponentName: string
  ) => Promise<{ success: boolean; matchId?: string; error?: string }>;
  settleMatch: (
    matchId: string,
    result: 'win' | 'loss' | 'draw'
  ) => Promise<{ success: boolean; payout?: number }>;
  updateWalletBalance: (deltaCoins: number) => void;
  isConfiguredWithSupabaseCloud: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [is18Verified, setIs18Verified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('apex_18_verified') === 'true';
    } catch {
      return false;
    }
  });

  // Calculate dual-balance wallet state
  const availableCoins = user?.wallet_balance_coins ?? 0;
  const lockedCoins = user?.locked_balance_coins ?? 0;
  const totalCoins = availableCoins + lockedCoins;

  const wallet: WalletState = {
    available_coins: availableCoins,
    locked_coins: lockedCoins,
    total_coins: totalCoins,
    available_naira: availableCoins * 10,
    locked_naira: lockedCoins * 10,
    total_naira: totalCoins * 10,
  };

  const verify18Plus = () => {
    try {
      localStorage.setItem('apex_18_verified', 'true');
    } catch {
      // ignore
    }
    setIs18Verified(true);
  };

  // Refresh user data & transactions
  const loadUserData = useCallback(async (userId: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        // Query profile & wallet
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { data: walletData } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        const coins = walletData?.balance ?? profile?.wallet_balance_coins ?? 0;
        const locked = walletData?.locked_balance ?? profile?.locked_balance_coins ?? 0;

        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email || '',
            username: profile.username || 'Contender',
            wallet_balance_coins: coins,
            wallet_balance_naira: coins * 10,
            locked_balance_coins: locked,
            won_matches: profile.won_matches || 0,
            total_matches: profile.total_matches || 0,
            win_rate: profile.total_matches > 0 ? Math.round((profile.won_matches / profile.total_matches) * 100) : 0,
            age_verified: profile.age_verified ?? true,
            terms_accepted_at: profile.terms_accepted_at || new Date().toISOString(),
            created_at: profile.created_at || new Date().toISOString(),
          });
        }

        // Query transactions
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (txs) {
          setTransactions(txs as Transaction[]);
        }
      } catch (err) {
        console.warn('Error loading Supabase user data:', err);
      }
    } else {
      // Local fallback
      const txs = getLocalTransactions(userId);
      setTransactions(txs);
      const matches = getLocalActiveMatches();
      setActiveMatches(matches);
    }
  }, []);

  // Initialize session
  useEffect(() => {
    async function initSession() {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadUserData(session.user.id);
          }
        } else {
          // Local fallback check
          const localSession = getLocalSession();
          if (localSession?.user) {
            setUser(convertStoredUserToProfile(localSession.user));
            const txs = getLocalTransactions(localSession.user.id);
            setTransactions(txs);
            const matches = getLocalActiveMatches();
            setActiveMatches(matches);
          }
        }
      } catch (err: any) {
        console.warn('Session initialization:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // Supabase Auth and Realtime listeners
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setTransactions([]);
          setActiveMatches([]);
        }
      });

      // Realtime subscription on wallets and transactions
      const channel = client
        .channel('db_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets' },
          (payload) => {
            if (user && payload.new && (payload.new as any).user_id === user.id) {
              const updated = payload.new as any;
              setUser((prev) =>
                prev
                  ? {
                      ...prev,
                      wallet_balance_coins: updated.balance,
                      wallet_balance_naira: updated.balance * 10,
                      locked_balance_coins: updated.locked_balance,
                    }
                  : null
              );
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transactions' },
          (payload) => {
            if (user && payload.new && (payload.new as any).user_id === user.id) {
              setTransactions((prev) => [payload.new as Transaction, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        client.removeChannel(channel);
      };
    }
  }, [loadUserData]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    if (!is18Verified) {
      return { success: false, error: '18+ verification and Fair Play Charter acceptance are required.' };
    }

    if (!email || !password) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (sbError) {
          return { success: false, error: sbError.message };
        }

        if (data.user) {
          await loadUserData(data.user.id);
          return { success: true };
        }
      } else {
        const users = getLocalUsers();
        const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

        if (!found) {
          return {
            success: false,
            error: 'No account registered with this email. Please verify credentials or sign up.',
          };
        }

        if (found.passwordHash !== password) {
          return {
            success: false,
            error: 'Incorrect password. Please verify and try again or use password recovery.',
          };
        }

        setLocalSession({ user: found });
        setUser(convertStoredUserToProfile(found));
        setTransactions(getLocalTransactions(found.id));
        setActiveMatches(getLocalActiveMatches());
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed. Please try again.' };
    }

    return { success: false, error: 'Unknown authentication error' };
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ success: boolean; error?: string; session?: any; requiresEmailConfirmation?: boolean }> => {
    setError(null);

    if (!is18Verified) {
      return { success: false, error: 'You must confirm that you are 18+ and accept the Terms to register.' };
    }

    if (!email || !password || !username) {
      return { success: false, error: 'All fields (email, password, and username) are required.' };
    }

    if (username.length < 3 || username.length > 20) {
      return { success: false, error: 'Username must be between 3 and 20 characters.' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { success: false, error: 'Username can only contain alphanumeric characters and underscores.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: sbError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              age_verified: true,
            },
          },
        });

        if (sbError) {
          return { success: false, error: sbError.message };
        }

        if (data.user) {
          const initialCoins = 0;
          try {
            await supabase.from('profiles').insert([
              {
                id: data.user.id,
                username: username.trim(),
                wallet_balance_coins: initialCoins,
                locked_balance_coins: 0,
                age_verified: true,
                won_matches: 0,
                total_matches: 0,
                terms_accepted_at: new Date().toISOString(),
              },
            ]);

            await supabase.from('wallets').insert([
              {
                user_id: data.user.id,
                balance: initialCoins,
                locked_balance: 0,
              },
            ]);
          } catch {
            // Handled or trigger initialized
          }

          if (data.session) {
            await loadUserData(data.user.id);
            return { success: true, session: data.session, requiresEmailConfirmation: false };
          } else {
            return { success: true, session: null, requiresEmailConfirmation: true };
          }
        }
      } else {
        const users = getLocalUsers();
        const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (existing) {
          return { success: false, error: 'An account with this email already exists. Please log in.' };
        }

        const usernameTaken = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
        if (usernameTaken) {
          return { success: false, error: 'This username is already taken. Please pick another gamer tag.' };
        }

        const userId = `apex_user_${Date.now()}`;
        const initialCoins = 0;

        const newUserObj: StoredUser = {
          id: userId,
          email: email.trim(),
          passwordHash: password,
          username: username.trim(),
          age_verified: true,
          wallet_balance_coins: initialCoins,
          locked_balance_coins: 0,
          won_matches: 0,
          total_matches: 0,
          created_at: new Date().toISOString(),
        };

        const updatedUsers = [...users, newUserObj];
        saveLocalUsers(updatedUsers);
        setLocalSession({ user: newUserObj });

        setUser(convertStoredUserToProfile(newUserObj));
        setTransactions([]);
        setActiveMatches([]);
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed. Please try again.' };
    }

    return { success: false, error: 'Unable to complete signup.' };
  };

  const signOut = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        setLocalSession(null);
      }
    } catch (err) {
      console.warn('Sign out:', err);
    } finally {
      setUser(null);
      setTransactions([]);
      setActiveMatches([]);
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!email) {
      return { success: false, error: 'Please enter your registered email address.' };
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (sbError) {
          return { success: false, error: sbError.message };
        }
        return {
          success: true,
          message: 'Password reset link dispatched. Please check your email inbox.',
        };
      } else {
        const users = getLocalUsers();
        const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!exists) {
          return {
            success: false,
            error: 'No account registered with that email address.',
          };
        }
        return {
          success: true,
          message: 'Password reset instructions have been dispatched to your email.',
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to dispatch reset email.' };
    }
  };

  // Deposit Coins (Paystack-Ready)
  const depositCoins = async (
    coins: number,
    paymentRef: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'User not authenticated' };

    const nairaValue = coins * 10;
    const newAvailable = user.wallet_balance_coins + coins;

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      user_id: user.id,
      type: 'deposit',
      amount_coins: coins,
      amount_naira: nairaValue,
      status: 'completed',
      reference_id: paymentRef,
      description: `Funded ${coins} Apex Coins via Paystack Checkout`,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      // Fetch latest wallet balance directly from Supabase to prevent fake JS drift
      const { data: dbWallet } = await supabase
        .from('wallets')
        .select('balance, locked_balance')
        .eq('user_id', user.id)
        .single();

      const currentBalance = dbWallet?.balance ?? 0;
      const updatedBalance = currentBalance + coins;

      await supabase.from('wallets').update({ balance: updatedBalance }).eq('user_id', user.id);
      await supabase.from('transactions').insert([newTx]);
      await loadUserData(user.id);
    } else {
      // Local
      const users = getLocalUsers();
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, wallet_balance_coins: newAvailable } : u
      );
      saveLocalUsers(updated);
      saveLocalTransaction(newTx);
      const sess = getLocalSession();
      if (sess && sess.user.id === user.id) {
        setLocalSession({ user: { ...sess.user, wallet_balance_coins: newAvailable } });
      }
      setUser((prev) =>
        prev
          ? {
              ...prev,
              wallet_balance_coins: newAvailable,
              wallet_balance_naira: newAvailable * 10,
            }
          : null
      );
      setTransactions((prev) => [newTx, ...prev]);
    }

    return {
      success: true,
      message: `Successfully credited ${coins} Apex Coins (₦${nairaValue.toLocaleString()})!`,
    };
  };

  // Withdraw Coins (Bank Payout)
  const withdrawCoins = async (
    coins: number,
    bankCode: string,
    accountNumber: string,
    accountName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    if (coins < 100) {
      return { success: false, error: 'Minimum withdrawal amount is 100 Apex Coins (₦1,000).' };
    }

    if (user.wallet_balance_coins < coins) {
      return {
        success: false,
        error: `Insufficient spendable balance. You have ${user.wallet_balance_coins} spendable coins. Locked stakes cannot be withdrawn.`,
      };
    }

    const nairaValue = coins * 10;
    const newAvailable = user.wallet_balance_coins - coins;
    const refId = `WD-${bankCode.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      user_id: user.id,
      type: 'withdrawal',
      amount_coins: -coins,
      amount_naira: -nairaValue,
      status: 'completed',
      reference_id: refId,
      description: `Withdrew ₦${nairaValue.toLocaleString()} to ${accountName} (${bankCode} - ${accountNumber.slice(0, 3)}****${accountNumber.slice(-3)})`,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data: dbWallet } = await supabase
        .from('wallets')
        .select('balance, locked_balance')
        .eq('user_id', user.id)
        .single();

      const currentBalance = dbWallet?.balance ?? 0;
      if (currentBalance < coins) {
        return {
          success: false,
          error: `Insufficient spendable balance in Supabase wallet. Available: ${currentBalance} Coins.`,
        };
      }

      const updatedBalance = currentBalance - coins;
      await supabase.from('wallets').update({ balance: updatedBalance }).eq('user_id', user.id);
      await supabase.from('transactions').insert([newTx]);
      await loadUserData(user.id);
    } else {
      const users = getLocalUsers();
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, wallet_balance_coins: newAvailable } : u
      );
      saveLocalUsers(updated);
      saveLocalTransaction(newTx);
      const sess = getLocalSession();
      if (sess && sess.user.id === user.id) {
        setLocalSession({ user: { ...sess.user, wallet_balance_coins: newAvailable } });
      }
      setUser((prev) =>
        prev
          ? {
              ...prev,
              wallet_balance_coins: newAvailable,
              wallet_balance_naira: newAvailable * 10,
            }
          : null
      );
      setTransactions((prev) => [newTx, ...prev]);
    }

    return { success: true };
  };

  // Dual-Balance Lock Stake for Match (Prevents double spending)
  const lockStakeForMatch = async (
    gameId: GameId,
    stakeCoins: number,
    opponentName: string
  ): Promise<{ success: boolean; matchId?: string; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    if (user.wallet_balance_coins < stakeCoins) {
      return {
        success: false,
        error: `Insufficient available coins. You need ${stakeCoins} Coins, but only have ${user.wallet_balance_coins} available.`,
      };
    }

    const newAvailable = user.wallet_balance_coins - stakeCoins;
    const newLocked = (user.locked_balance_coins ?? 0) + stakeCoins;
    const matchId = `MATCH-${gameId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const lockTx: Transaction = {
      id: `tx_${Date.now()}`,
      user_id: user.id,
      type: 'stake_locked',
      amount_coins: -stakeCoins,
      amount_naira: -(stakeCoins * 10),
      status: 'locked',
      reference_id: matchId,
      description: `Stake Locked in Match: ${gameId.toUpperCase()} vs ${opponentName}`,
      created_at: new Date().toISOString(),
      match_id: matchId,
    };

    const newActiveMatch: ActiveMatch = {
      id: matchId,
      gameId,
      stakeCoins,
      potCoins: stakeCoins * 2,
      opponentName,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      remainingSeconds: 180,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('wallets')
        .update({ balance: newAvailable, locked_balance: newLocked })
        .eq('user_id', user.id);
      await supabase.from('transactions').insert([lockTx]);
    } else {
      const users = getLocalUsers();
      const updated = users.map((u) =>
        u.id === user.id
          ? { ...u, wallet_balance_coins: newAvailable, locked_balance_coins: newLocked }
          : u
      );
      saveLocalUsers(updated);
      saveLocalTransaction(lockTx);
      const sess = getLocalSession();
      if (sess && sess.user.id === user.id) {
        setLocalSession({
          user: {
            ...sess.user,
            wallet_balance_coins: newAvailable,
            locked_balance_coins: newLocked,
          },
        });
      }

      const currentMatches = getLocalActiveMatches();
      const updatedMatches = [newActiveMatch, ...currentMatches];
      saveLocalActiveMatches(updatedMatches);
      setActiveMatches(updatedMatches);
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            wallet_balance_coins: newAvailable,
            wallet_balance_naira: newAvailable * 10,
            locked_balance_coins: newLocked,
          }
        : null
    );
    setTransactions((prev) => [lockTx, ...prev]);

    return { success: true, matchId };
  };

  // Settle Match (Win / Loss / Draw)
  const settleMatch = async (
    matchId: string,
    result: 'win' | 'loss' | 'draw'
  ): Promise<{ success: boolean; payout?: number }> => {
    if (!user) return { success: false };

    const match = activeMatches.find((m) => m.id === matchId);
    const stakeCoins = match ? match.stakeCoins : 50;
    const currentLocked = user.locked_balance_coins ?? 0;
    const newLocked = Math.max(0, currentLocked - stakeCoins);

    let newAvailable = user.wallet_balance_coins;
    let payout = 0;
    let settlementTx: Transaction | null = null;

    if (result === 'win') {
      const totalPot = stakeCoins * 2;
      const rake = Math.floor(totalPot * 0.1);
      payout = totalPot - rake; // 90% payout
      newAvailable = user.wallet_balance_coins + payout;

      settlementTx = {
        id: `tx_${Date.now()}`,
        user_id: user.id,
        type: 'win_payout',
        amount_coins: payout,
        amount_naira: payout * 10,
        status: 'completed',
        reference_id: matchId,
        description: `Victory Payout: ${match ? match.gameId.toUpperCase() : 'Duel'} (Pot: ${totalPot} AC, 10% Flat Rake -${rake} AC)`,
        created_at: new Date().toISOString(),
        match_id: matchId,
      };
    } else if (result === 'draw') {
      // 100% refund on draw
      payout = stakeCoins;
      newAvailable = user.wallet_balance_coins + stakeCoins;

      settlementTx = {
        id: `tx_${Date.now()}`,
        user_id: user.id,
        type: 'match_refund',
        amount_coins: stakeCoins,
        amount_naira: stakeCoins * 10,
        status: 'completed',
        reference_id: matchId,
        description: `Official Draw Refund: 100% of ${stakeCoins} AC stake returned with 0% fee`,
        created_at: new Date().toISOString(),
        match_id: matchId,
      };
    } else {
      // Loss: locked stake simply consumed
      settlementTx = {
        id: `tx_${Date.now()}`,
        user_id: user.id,
        type: 'stake_locked',
        amount_coins: 0,
        amount_naira: 0,
        status: 'completed',
        reference_id: matchId,
        description: `Match Concluded: ${match ? match.gameId.toUpperCase() : 'Duel'} opponent claimed pot`,
        created_at: new Date().toISOString(),
        match_id: matchId,
      };
    }

    const wonIncrement = result === 'win' ? 1 : 0;
    const newWonMatches = user.won_matches + wonIncrement;
    const newTotalMatches = user.total_matches + 1;
    const newWinRate = Math.round((newWonMatches / newTotalMatches) * 100);

    // Save
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('wallets')
        .update({ balance: newAvailable, locked_balance: newLocked })
        .eq('user_id', user.id);
      if (settlementTx) {
        await supabase.from('transactions').insert([settlementTx]);
      }
      await supabase
        .from('profiles')
        .update({
          won_matches: newWonMatches,
          total_matches: newTotalMatches,
        })
        .eq('id', user.id);
    } else {
      const users = getLocalUsers();
      const updated = users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              wallet_balance_coins: newAvailable,
              locked_balance_coins: newLocked,
              won_matches: newWonMatches,
              total_matches: newTotalMatches,
            }
          : u
      );
      saveLocalUsers(updated);
      if (settlementTx) saveLocalTransaction(settlementTx);

      const sess = getLocalSession();
      if (sess && sess.user.id === user.id) {
        setLocalSession({
          user: {
            ...sess.user,
            wallet_balance_coins: newAvailable,
            locked_balance_coins: newLocked,
            won_matches: newWonMatches,
            total_matches: newTotalMatches,
          },
        });
      }

      // Remove match from active matches
      const updatedMatches = activeMatches.filter((m) => m.id !== matchId);
      saveLocalActiveMatches(updatedMatches);
      setActiveMatches(updatedMatches);
    }

    // Acknowledge finished match to prevent refresh resurrecting finished match
    await acknowledgeFinishedMatch(user.id, matchId);

    setUser((prev) =>
      prev
        ? {
            ...prev,
            wallet_balance_coins: newAvailable,
            wallet_balance_naira: newAvailable * 10,
            locked_balance_coins: newLocked,
            won_matches: newWonMatches,
            total_matches: newTotalMatches,
            win_rate: newWinRate,
          }
        : null
    );

    if (settlementTx) {
      setTransactions((prev) => [settlementTx!, ...prev]);
    }

    return { success: true, payout };
  };

  const updateWalletBalance = (deltaCoins: number) => {
    if (!user) return;
    const newCoins = Math.max(0, user.wallet_balance_coins + deltaCoins);
    const updatedUser: UserProfile = {
      ...user,
      wallet_balance_coins: newCoins,
      wallet_balance_naira: newCoins * 10,
    };
    setUser(updatedUser);

    if (!isSupabaseConfigured) {
      const users = getLocalUsers();
      const updated = users.map((u) =>
        u.id === user.id ? { ...u, wallet_balance_coins: newCoins } : u
      );
      saveLocalUsers(updated);
      const sess = getLocalSession();
      if (sess && sess.user.id === user.id) {
        setLocalSession({ user: { ...sess.user, wallet_balance_coins: newCoins } });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        transactions,
        activeMatches,
        loading,
        error,
        is18Verified,
        verify18Plus,
        signIn,
        signUp,
        signOut,
        resetPassword,
        depositCoins,
        withdrawCoins,
        lockStakeForMatch,
        settleMatch,
        updateWalletBalance,
        isConfiguredWithSupabaseCloud: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
