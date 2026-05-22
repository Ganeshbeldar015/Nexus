import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNexusWallet } from '../lib/useNexusWallet';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, address, isDevWallet, isDevWalletEnabled, connectDevWallet, disconnect } = useNexusWallet();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const donorLinks = [
    { name: 'Dashboard', path: '/donor-dashboard' },
    { name: 'Browse Campaigns', path: '/' },
  ];

  const ngoLinks = [
    { name: 'Dashboard', path: '/ngo-dashboard' },
    { name: 'Manage Profile', path: `/manage-ngo/${user?.id || 'ngo-1'}` },
  ];

  const adminLinks = [
    { name: 'Overview', path: '/admin-dashboard' },
    { name: 'NGOs', path: '/admin/ngos' },
  ];

  const links = user?.role === 'donor' ? donorLinks : (user?.role === 'ngo' ? ngoLinks : adminLinks);

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-black p-2 rounded-lg">
              <Heart className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">
              DisasterRelief
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-black ${location.pathname === link.path ? 'text-black' : 'text-zinc-500'}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <div className="hidden sm:block scale-90 origin-right">
              {isDevWallet ? (
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-2xl">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] bg-lime-400 text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider self-start">Shared Dev</span>
                    <span className="text-xs font-mono text-zinc-600 mt-1">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                  <button 
                    onClick={disconnect}
                    className="text-xs text-red-500 hover:text-red-600 font-bold bg-transparent border-0 cursor-pointer pl-2 border-l border-zinc-200"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ConnectButton label="Connect" accountStatus="avatar" chainStatus="icon" showBalance={false} />
                  {!isConnected && isDevWalletEnabled && (
                    <button
                      onClick={connectDevWallet}
                      className="px-4 py-2 text-xs bg-black hover:bg-lime-400 hover:text-black text-white font-bold rounded-2xl transition-all border border-zinc-800 hover:border-lime-400 shadow-sm"
                    >
                      ⚡ Use Shared Test Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-tight">{user?.full_name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-black transition-colors rounded-full hover:bg-zinc-100">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-grow">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
