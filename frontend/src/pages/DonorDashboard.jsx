import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import CampaignCard from '../components/CampaignCard';
import { Wallet, History, Heart, ArrowUpRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const DonorDashboard = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch all campaigns
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (campaignData) setCampaigns(campaignData);

        // Fetch user donations
        const { data: donationData } = await supabase
          .from('donation_logs')
          .select('*, campaigns(*)')
          .eq('donor_id', user.id)
          .order('created_at', { ascending: false });

        if (donationData) setMyDonations(donationData);
      } catch (error) {
        console.error("Error fetching donor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const totalDonated = myDonations.reduce((acc, d) => acc + parseFloat(d.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-16 py-8">
      {/* Welcome & Stats */}
      <div className="text-center space-y-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight text-black">Welcome back, {user?.full_name}</h1>
          <p className="text-lg text-zinc-500">Here is a summary of your impact on the network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-[2rem]">
            <Heart size={28} className="mb-4 text-black" fill="currentColor" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Donated</p>
            <p className="text-3xl font-black text-black">${totalDonated.toLocaleString()}</p>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-[2rem]">
            <History size={28} className="mb-4 text-black" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Donations</p>
            <p className="text-3xl font-black text-black">{myDonations.length}</p>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-[2rem]">
            <Wallet size={28} className="mb-4 text-black" />
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Impact Score</p>
            <p className="text-3xl font-black text-black">84/100</p>
          </div>
        </div>
      </div>

      {/* Active Campaigns to Explore */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h3 className="text-2xl font-black text-black flex items-center gap-3">
            <Megaphone className="text-zinc-400" />
            Explore Campaigns
          </h3>
          <Link to="/" className="text-sm font-bold text-zinc-500 hover:text-black transition-colors">View All</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {campaigns.length > 0 ? campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          )) : (
            <div className="col-span-full py-20 text-center bg-zinc-50 rounded-[2rem] border border-zinc-100">
               <p className="text-lg font-bold text-zinc-500">No active campaigns available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Donation History */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h3 className="text-2xl font-black text-black">Donation History</h3>
          <button className="text-sm font-bold text-zinc-500 hover:text-black transition-colors">View All</button>
        </div>

        <div className="bg-white">
           {myDonations.length > 0 ? (
             <div className="divide-y divide-zinc-100">
               {myDonations.map((d) => {
                 const campaign = d.campaigns;
                 return (
                   <div key={d.id} className="py-6 flex items-center justify-between group">
                      <div className="flex items-center gap-6">
                        <img src={campaign?.image_url} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        <div>
                          <p className="text-lg font-bold text-black">{campaign?.title}</p>
                          <p className="text-sm text-zinc-400 font-mono mt-1">Tx: {d.tx_hash.slice(0, 16)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-black">+${parseFloat(d.amount).toLocaleString()}</p>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="py-20 text-center space-y-6 border border-zinc-100 rounded-[2rem] bg-zinc-50">
               <div className="h-20 w-20 bg-white text-zinc-300 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <History size={32} />
               </div>
               <div className="space-y-2">
                 <p className="text-lg font-bold text-black">No donations yet.</p>
                 <p className="text-zinc-500">Your contribution can save lives today.</p>
               </div>
               <Link to="/" className="inline-block mt-4 px-8 py-3 bg-black text-white font-bold rounded-full hover:bg-zinc-800 transition-colors">
                 Find a Campaign
               </Link>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;
