import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck as ShieldIcon, History as HistoryIcon, ExternalLink as ExternalIcon, Search as SearchIcon } from 'lucide-react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../lib/contracts';
import DonationABI from '../lib/abi/Donation.json';
import { getFallbackProvider } from '../lib/providers';
import { safeParseCampaignId } from '../lib/ugf';

const Transparency = () => {
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [onChainRegistry, setOnChainRegistry] = useState([]);

  const fetchOnChainRegistry = async (approvedCampaigns) => {
    setRegistryLoading(true);
    try {
      const provider = await getFallbackProvider();
      const contractAddress = CONTRACT_ADDRESSES.baseSepolia.donation;
      const donationContract = new ethers.Contract(contractAddress, DonationABI, provider);
      
      const registryData = await Promise.all(
        approvedCampaigns.map(async (c) => {
          try {
            const numericId = c.uint_id || safeParseCampaignId(c.id);
            let registry = await donationContract.campaignRegistry(numericId);
            let finalId = numericId;

            // Fallback: If not found under sequential/uint_id, check the UUID-based parsed ID
            if ((!registry.safeAddress || registry.safeAddress === ethers.ZeroAddress) && c.uint_id) {
              const fallbackId = safeParseCampaignId(c.id);
              if (fallbackId !== BigInt(c.uint_id)) {
                const fallbackRegistry = await donationContract.campaignRegistry(fallbackId);
                if (fallbackRegistry.safeAddress && fallbackRegistry.safeAddress !== ethers.ZeroAddress) {
                  registry = fallbackRegistry;
                  finalId = fallbackId;
                }
              }
            }

            return {
              campaignId: c.id,
              numericId: finalId.toString(),
              title: c.title,
              safeAddress: registry.safeAddress,
              darpanId: registry.darpanId,
              isRegistered: registry.safeAddress && registry.safeAddress !== ethers.ZeroAddress
            };
          } catch (err) {
            console.error(`Error fetching registry for campaign ${c.id}:`, err);
            return {
              campaignId: c.id,
              numericId: 'N/A',
              title: c.title,
              safeAddress: ethers.ZeroAddress,
              darpanId: 'N/A',
              isRegistered: false
            };
          }
        })
      );
      setOnChainRegistry(registryData);
    } catch (err) {
      console.error("Error querying registry contract:", err);
    } finally {
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('*, donation_logs(amount)');
        
        if (campaignData) {
          setCampaigns(campaignData);
          const approved = campaignData.filter(c => c.status === 'approved');
          fetchOnChainRegistry(approved);
        }

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

  const totalDonations = campaigns.reduce((acc, c) => {
    const raisedAmount = c.donation_logs
      ? c.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0)
      : parseFloat(c.raised_amount || 0);
    return acc + raisedAmount;
  }, 0);

  if (loading) {
    return (
      
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 pb-12 space-y-12">
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
        {/* Ledger and On-Chain Registry */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* On-Chain Campaign Registry */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldIcon className="text-lime-500" />
              On-Chain Campaign Registry
            </h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">On-Chain ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Safe Multisig Address</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Darpan ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registryLoading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Querying Base Sepolia smart contract...
                          </div>
                        </td>
                      </tr>
                    ) : onChainRegistry.length > 0 ? (
                      onChainRegistry.map((reg) => (
                        <tr key={reg.campaignId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-700">{reg.title}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                            {reg.numericId !== 'N/A' ? `${reg.numericId.slice(0, 10)}...` : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {reg.isRegistered ? (
                              <a 
                                href={`https://sepolia.basescan.org/address/${reg.safeAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 font-mono text-sm text-lime-600 hover:underline"
                              >
                                <span className="truncate w-32">{reg.safeAddress}</span>
                                <ExternalIcon size={14} className="shrink-0" />
                              </a>
                            ) : (
                              <span className="text-sm text-red-500 font-bold">Unregistered</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold text-sm text-slate-600">
                            {reg.darpanId}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {reg.isRegistered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-lime-50 text-lime-700 border border-lime-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <ShieldIcon size={10} className="fill-current" />
                                Verified Match
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Unregistered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                          No approved campaigns registered on-chain yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Ledger */}
          <div className="space-y-6">
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


