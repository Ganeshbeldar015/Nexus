import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogIn, LogOut, Menu, User, X } from 'lucide-react';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary-600 p-2 rounded-lg group-hover:bg-primary-700 transition-colors">
              <Heart className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">
              Disaster<span className="text-primary-600">Relief</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-slate-600 hover:text-primary-600 transition-colors">Home</Link>
            <Link to="/transparency" className="text-slate-600 hover:text-primary-600 transition-colors">Transparency</Link>
            
            <ConnectButton accountStatus="avatar" chainStatus="icon" />

            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to={`/${user.role}-dashboard`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <User size={18} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-black transition-colors flex items-center gap-1"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-slate-600 hover:text-black transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="px-5 py-2.5 bg-black text-white rounded-full hover:bg-zinc-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Join Us
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 p-2"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 py-4 px-4 space-y-4 animate-in slide-in-from-top duration-300">
          <Link to="/" className="block text-slate-600 py-2">Home</Link>
          <Link to="/transparency" className="block text-slate-600 py-2">Transparency</Link>
          
          <div className="py-2">
            <ConnectButton accountStatus="avatar" chainStatus="icon" />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            {user ? (
              <>
                <Link to={`/${user.role}-dashboard`} className="block text-black font-medium">Dashboard</Link>
                <button onClick={handleLogout} className="block text-zinc-600">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-slate-600">Login</Link>
                <Link to="/signup" className="block w-full py-3 bg-black text-white text-center rounded-xl font-semibold">Join Us</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
