import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, Users, Landmark, Heart, Play, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CampaignCard from '../components/CampaignCard';
import bgImage from '../../bg.png';

const Landing = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) setCampaigns(data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  if (user?.role === 'ngo') {
    return <Navigate to="/ngo-dashboard" replace />;
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white antialiased font-sans">
      
      {/* Background Cinematic Asset */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          alt="Cinematic Disaster Relief Context"
          className="w-full h-full object-cover object-center scale-100"
        />
        {/* Dark cinematic color-grading layer mimicking the image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
      </div>

  


      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 min-h-screen flex flex-col justify-between pb-8">
        
        {/* Hero Section */}
        <section className="pt-28 lg:pt-36 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col"
          >
            {/* Gen-Z Editorial Headline */}
            <div className="w-full text-left">
                <h1 className="text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7rem] xl:text-[8rem] font-display font-black tracking-tighter leading-[0.9] uppercase text-white ">
                  WHERE <br />
                  <span className="font-serif italic font-medium text-lime-400 lowercase tracking-normal pl-8 sm:pl-16 md:pl-32 drop-shadow-[0_0_40px_rgba(163,230,53,0.4)] block -mt-2 md:-mt-4">
                    humanity
                  </span>
                  MEETS <br />
                  <span className="font-display text-5xl md:text-8xl text-transparent [-webkit-text-stroke:2px_white] block -mt-1 md:-mt-3">
  TRANSPARENCY.
</span>
                    
                  
                </h1>
            </div>

            <div className="mt-12 md:mt-20 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10">
              <p className="text-zinc-300 text-xl md:text-2xl leading-relaxed max-w-xl font-medium pl-2 md:pl-8 border-l-4 border-lime-400">
                We ensure every donation is transparent, verified, and makes a real difference in someone's life.
              </p>

              {/* CTA Elements */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to="/signup">
                  <button className="bg-lime-400 text-black hover:bg-white font-black px-10 py-5 rounded-full text-lg transition-all duration-300 shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 uppercase tracking-widest">
                    Join the Network
                  </button>
                </Link>

                <button className="flex items-center gap-4 text-lg font-bold text-white group bg-white/5 hover:bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 transition-all hover:border-lime-400">
                  <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:border-lime-400 transition-all">
                    <Play size={14} className="fill-white group-hover:fill-lime-400 transition-colors ml-1" />
                  </div>
                  Watch How It Works
                </button>
              </div>
            </div>
          </motion.div>
        </section>



        {/* Integrated Floating Metrics Dashboard Bottom Section */}
        <section className="mt-24 mb-12">
          <div className="bg-zinc-950/60 backdrop-blur-4xl border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl">
            
            {/* Top row mini features layout indicators inside the frame */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8 border-b border-white/10 mb-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-white flex-shrink-0" size={20} />
                <div>
                  <h5 className="text-m font-bold text-white">Verified NGOs</h5>
                  <p className="text-s text-zinc-400">Every NGO is verified before listing.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-white flex-shrink-0" size={20} />
                <div>
                  <h5 className="text-m font-bold text-white">Verified Volunteers</h5>
                  <p className="text-s text-zinc-400">Every volunteer's background is checked.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Landmark className="text-white flex-shrink-0" size={20} />
                <div>
                  <h5 className="text-m font-bold text-white">Transparent Tracking</h5>
                  <p className="text-s text-zinc-400">Track every donation in real-time.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Heart className="text-white flex-shrink-0" size={20} />
                <div>
                  <h5 className="text-m font-bold text-white">Real Impact</h5>
                  <p className="text-s text-zinc-400">See the real impact of your money.</p>
                </div>
              </div>
            </div>

            {/* Bottom row statistical numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center lg:text-left">
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight text-white">1200+</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1 uppercase tracking-wider">Verified NGOs</p>
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight text-white">25,000+</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1 uppercase tracking-wider">Volunteers</p>
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight text-white">₹12.8 Cr+</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1 uppercase tracking-wider">Donations Tracked</p>
              </div>
              <div className="text-center lg:text-left">
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight text-white">3.4M+</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1 uppercase tracking-wider">Lives Impacted</p>
              </div>
            </div>

          </div>
        </section>

        {/* Active Campaigns Section */}
        <section className="mt-32 space-y-12 mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-4">
                <Megaphone className="text-lime-400" size={32} />
                Active <span className="text-white">Campaigns</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-xl">
                Browse through verified disaster relief efforts and support those in urgent need.
              </p>
            </div>
            <Link to="/signup">
              <button className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold transition text-white">
                View All Campaigns
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.length > 0 ? campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            )) : (
              <div className="col-span-full py-20 text-center bg-white/5 rounded-[2rem] border border-white/10">
                 <p className="text-lg font-bold text-zinc-500">No active campaigns available at the moment.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Landing;