import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck as ShieldIcon, History as HistoryIcon, ExternalLink as ExternalIcon, Search as SearchIcon } from 'lucide-react';

const Transparency = () => {
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('*');
        
        if (campaignData) setCampaigns(campaignData);

        const { data: donationData } = await supabase
          .from('donation_logs')
          .select('*, campaigns(title)')
          .order('created_at', { ascending: false });

        if (donationData) setDonations(donationData);
      } catch (error) {
        console.error("Error fetching transparency data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalDonations = campaigns.reduce((acc, c) => acc + parseFloat(c.raised_amount), 0);

  if (loading) {
    return (
      
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">Transparency Dashboard</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          Track every donation, campaign update, and fund utilization in real time through our public transparency dashboard. Every transaction is securely recorded on the blockchain, making relief efforts fully verifiable, accountable, and impossible to manipulate.

From donation inflows to NGO spending records, anyone can monitor how funds are being used during disasters — building trust through complete transparency.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Value Distributed', value: `$${totalDonations.toLocaleString()}`, color: 'bg-zinc-100 text-zinc-900' },
          { label: 'Active Campaigns', value: campaigns.length, color: 'bg-zinc-100 text-zinc-900' },
          { label: 'Platform Uptime', value: '100%', color: 'bg-zinc-100 text-zinc-900' },
          { label: 'Network Nodes', value: '14,281', color: 'bg-zinc-100 text-zinc-900' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl ${stat.color} flex flex-col items-center justify-center text-center space-y-1`}>
            <span className="text-sm font-bold opacity-70">{stat.label}</span>
            <span className="text-3xl font-extrabold">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <HistoryIcon className="text-black" />
              Public Ledger
            </h2>
            <div className="relative w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search tx hash..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-black"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Hash</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donations.length > 0 ? donations.map((tx) => {
                    const campaignTitle = tx.campaigns?.title || 'Unknown';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-mono text-sm text-zinc-900">
                            <span className="truncate w-32">{tx.tx_hash}</span>
                            <ExternalIcon size={14} className="shrink-0" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-700">{campaignTitle}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-900">${parseFloat(tx.amount).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-900 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                        No transactions found in the ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-black rounded-3xl p-8 text-white space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl" />
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShieldIcon className="text-zinc-400" />
              Verified NGO List
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              We only partner with NGOs that meet our strict transparency standards. All partner accounts are multi-sig wallets managed by verified humanitarian leaders.
            </p>
            <div className="space-y-4">
              {['Red Cross International', 'Save the Children', 'Global Relief Fund'].map((ngo, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm font-medium">{ngo}</span>
                  <ShieldIcon size={16} className="text-zinc-500" />
                </div>
              ))}
            </div>
            <button className="w-full py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all">
              Apply as NGO
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">How to Verify?</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Copy any transaction hash and paste it into a blockchain explorer (Etherscan, Polygonscan) to verify the movement of funds independently.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-mono text-[10px] text-slate-400">
              0x71C7656EC7ab88b098defB751B7401B5f6d8976F
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export default Transparency;


