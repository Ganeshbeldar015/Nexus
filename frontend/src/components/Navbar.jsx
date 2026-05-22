import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Menu, User, X, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNexusWallet } from '../lib/useNexusWallet';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected, address, isDevWallet, isDevWalletEnabled, connectDevWallet, disconnect } = useNexusWallet();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
 className={`absolute w-full left-0 top-0 z-50 ${
  location.pathname === '/transparency'
    ? 'bg-black shadow-lg'
    : 'bg-transparent'
}`}
>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo Section */}
          <Link to={user?.role === 'ngo' ? '/ngo-dashboard' : '/'} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-lime-400 blur-md opacity-40 group-hover:opacity-100 transition-opacity rounded-xl"></div>
              <div className="relative bg-lime-400 p-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] group-hover:scale-105 group-hover:rotate-3 duration-300">
                <Heart className="h-6 w-6 text-black" fill="currentColor" />
              </div>
            </div>
            <span className="font-black text-2xl tracking-tighter text-white hidden sm:block">
              Disaster<span className="text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.5)]">Relief</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-black uppercase tracking-widest">
            {user?.role !== 'ngo' && (
              <>
                <Link to="/" className="text-zinc-400  hover:text-lime-400 transition-all hover:scale-105">Home</Link>
                <Link to="/transparency" className="text-zinc-400 hover:text-lime-400 transition-all hover:scale-105 flex items-center gap-1.5">
                  <Sparkles size={16} className="mb-0.5" />
                  Transparency
                </Link>
              </>
            )}
            
            {/* Wallet Connect Button - visible to all users */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              {isDevWallet ? (
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-lime-400 text-black px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Dev</span>
                    <span className="text-xs font-mono text-zinc-300">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <button 
                    onClick={disconnect}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold bg-transparent border-0 cursor-pointer pl-2 border-l border-white/10"
                  >
                    ✕
                  </button>
                </div>
              ) : isConnected && address ? (
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-lime-400/30 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-mono text-lime-300">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="scale-[0.82] origin-right">
                    <ConnectButton label="Connect Wallet" accountStatus="avatar" chainStatus="icon" showBalance={false} />
                  </div>
                  {isDevWalletEnabled && (
                    <button
                      onClick={connectDevWallet}
                      className="py-1.5 px-2.5 text-[10px] bg-white/5 hover:bg-lime-400 hover:text-black text-zinc-400 font-bold rounded-lg transition-all flex items-center gap-1 border border-white/10 hover:border-lime-400 whitespace-nowrap"
                    >
                      ⚡ Dev
                    </button>
                  )}
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-6 pl-4 border-l border-white/10">
                <Link 
                  to={`/${user.role}-dashboard`}
                  className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-lime-400 border border-white/10 hover:border-lime-400 text-white hover:text-black transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(163,230,53,0.4)]"
                >
                  <User size={18} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-2 bg-transparent hover:bg-red-500/10 px-4 py-2 rounded-full"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
               <div className="flex items-center gap-6 pl-4 border-l border-white/10">
                 <Link 
                   to="/login" 
                   className="text-white hover:text-lime-400 transition-colors"
                 >
                   Login
                 </Link>
                 <Link 
                   to="/signup" 
                   className="relative group overflow-hidden px-8 py-3 bg-lime-400 text-black rounded-full font-black transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.6)] hover:scale-105"
                 >
                   <span className="relative z-10 flex items-center gap-2">Join Us</span>
                   <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                 </Link>
               </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white p-2 hover:text-lime-400 transition-colors"
            >
              {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-3xl border-b border-white/10 py-6 px-6 space-y-6 animate-in slide-in-from-top duration-300 shadow-2xl absolute w-full left-0 top-20">
          {user?.role !== 'ngo' && (
            <>
              <Link to="/" className="block text-2xl text-zinc-300 hover:text-lime-400 font-black tracking-tight" onClick={() => setIsMenuOpen(false)}>Home</Link>
              <Link to="/transparency" className="block text-2xl text-zinc-300 hover:text-lime-400 font-black tracking-tight flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                <Sparkles size={24} />
                Transparency
              </Link>
            </>
          )}

          {/* Mobile Wallet Section */}
          <div className="py-4 border-t border-b border-white/10 space-y-3">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} />
              Wallet
            </div>
            {isDevWallet ? (
              <div className="flex items-center justify-between bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-lime-400 text-black px-2 py-0.5 rounded-full font-bold uppercase">Dev Wallet</span>
                  <span className="text-sm font-mono text-zinc-300">{address?.slice(0, 8)}...{address?.slice(-4)}</span>
                </div>
                <button onClick={disconnect} className="text-xs text-red-400 font-bold">Disconnect</button>
              </div>
            ) : isConnected && address ? (
              <div className="flex items-center gap-2 bg-white/5 border border-lime-400/30 px-4 py-3 rounded-2xl">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono text-lime-300">{address.slice(0, 8)}...{address.slice(-4)}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <ConnectButton label="Connect Wallet" accountStatus="avatar" chainStatus="icon" showBalance={false} />
                </div>
                {isDevWalletEnabled && (
                  <button
                    onClick={connectDevWallet}
                    className="w-full py-2.5 px-3 text-xs bg-zinc-800 hover:bg-lime-400 hover:text-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-zinc-700/50 hover:border-lime-400"
                  >
                    ⚡ Use Shared Test Wallet
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {user ? (
              <>
                <Link to={`/${user.role}-dashboard`} className="block text-2xl text-lime-400 font-black tracking-tight" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block text-xl text-red-400 hover:text-red-300 font-bold">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-xl text-white font-bold" onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="block w-full py-4 mt-4 bg-lime-400 text-black text-center rounded-2xl font-black text-xl shadow-[0_0_20px_rgba(163,230,53,0.3)]" onClick={() => setIsMenuOpen(false)}>Join Us</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
