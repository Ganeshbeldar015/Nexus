import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Menu, User, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <div className="hidden md:flex items-center gap-10 text-sm font-black uppercase tracking-widest">
            {user?.role !== 'ngo' && (
              <>
                <Link to="/" className="text-zinc-400  hover:text-lime-400 transition-all hover:scale-105">Home</Link>
                <Link to="/transparency" className="text-zinc-400 hover:text-lime-400 transition-all hover:scale-105 flex items-center gap-1.5">
                  <Sparkles size={16} className="mb-0.5" />
                  Transparency
                </Link>
              </>
            )}
            
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
          <div className="pt-6 border-t border-white/10 space-y-4">
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
