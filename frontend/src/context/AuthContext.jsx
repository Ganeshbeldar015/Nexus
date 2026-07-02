import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNexusWallet } from '../lib/useNexusWallet';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setRoleInLocalStorage = (role) => {
    if (role) {
      localStorage.setItem('nexus_user_role', role);
    } else {
      localStorage.removeItem('nexus_user_role');
    }
    // Notify dev wallet hooks/listeners to recalculate derived address/signer
    window.dispatchEvent(new Event('nexus-dev-wallet-change'));
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setRoleInLocalStorage(null);
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setRoleInLocalStorage(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      if (error) throw error;
      setUser(data);
      if (data?.role) {
        setRoleInLocalStorage(data.role);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const fallbackUser = { ...authUser, ...authUser.user_metadata };
      setUser(fallbackUser); // fallback
      if (fallbackUser.role) {
        setRoleInLocalStorage(fallbackUser.role);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user profile to get the role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userWithProfile = profileError ? { ...data.user, ...data.user.user_metadata } : profile;
      
      setUser(userWithProfile);
      if (userWithProfile.role) {
        setRoleInLocalStorage(userWithProfile.role);
      }
      toast.success(`Welcome back!`);
      return userWithProfile;
    } catch (error) {
      toast.error(error.message || 'Invalid email or password');
      setLoading(false);
      throw error;
    }
  };

  const signup = async (data) => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role,
          },
        },
      });

      if (error) throw error;

      const userWithProfile = { ...authData.user, role: data.role, full_name: data.full_name };
      setUser(userWithProfile);
      if (data.role) {
        setRoleInLocalStorage(data.role);
      }
      
      toast.success('Account created successfully!');
      return userWithProfile;
    } catch (error) {
      toast.error(error.message || 'Error creating account');
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setRoleInLocalStorage(null);
      toast.info('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out');
    }
  };

  const { address, isConnected } = useNexusWallet();

  useEffect(() => {
    const syncWalletAddress = async () => {
      if (user && isConnected && address) {
        if (!user.wallet_address || user.wallet_address.toLowerCase() !== address.toLowerCase()) {
          console.log(`Syncing wallet address ${address} for user ${user.id}`);
          try {
            const { error } = await supabase
              .from('users')
              .update({ wallet_address: address })
              .eq('id', user.id);
            
            if (error) throw error;
            
            setUser(prev => prev ? { ...prev, wallet_address: address } : null);
            toast.success('Wallet address successfully linked to your profile!');
          } catch (err) {
            console.error('Failed to sync wallet address:', err);
          }
        }
      }
    };

    syncWalletAddress();
  }, [user, address, isConnected]);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
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
