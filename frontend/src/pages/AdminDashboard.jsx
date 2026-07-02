import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Users, BarChart3, AlertCircle, Check, X, Search, Megaphone } from 'lucide-react';
import Button from '../components/Button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../lib/contracts';
import DonationABI from '../lib/abi/Donation.json';
import { safeParseCampaignId } from '../lib/ugf';
import { useNexusWallet } from '../lib/useNexusWallet';

const AdminDashboard = () => {
  const [ngos, setNgos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isConnected, getSigner } = useNexusWallet();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch NGOs (users with ngo role and their profile)
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*, ngos(*)')
        .eq('role', 'ngo');
      
      if (userError) throw userError;

      const formattedNgos = users.map(u => ({
        id: u.id,
        name: u.ngos?.[0]?.organization_name || u.full_name,
        email: u.email,
        status: u.ngos?.[0]?.verification_status || 'pending',
        joined: new Date(u.created_at).toLocaleDateString()
      }));
      setNgos(formattedNgos);

      // Fetch Campaigns for stats & approval
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*, ngos(organization_name), donation_logs(amount)');
      if (campaignData) setCampaigns(campaignData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, name) => {
    try {
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        await supabase.from('ngos').update({ verification_status: 'verified' }).eq('user_id', id);
      } else {
        await supabase.from('ngos').insert({ user_id: id, organization_name: name, verification_status: 'verified' });
      }
      toast.success('NGO successfully verified!');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve NGO');
    }
  };

  const handleReject = async (id, name) => {
    try {
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        await supabase.from('ngos').update({ verification_status: 'rejected' }).eq('user_id', id);
      } else {
        await supabase.from('ngos').insert({ user_id: id, organization_name: name, verification_status: 'rejected' });
      }
      toast.error('NGO verification rejected.');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject NGO');
    }
  };

  const handleApproveCampaign = async (campaign) => {
    const { id, title, ngo_wallet_address, darpan_id, uint_id } = campaign;
    
    if (!ngo_wallet_address) {
      toast.error("NGO wallet address is missing. Cannot deploy Safe multisig.");
      return;
    }
    
    if (!isConnected) {
      toast.error("Please connect your wallet to approve this campaign.");
      return;
    }
    
    const adminAddress = '0x27850D1Caf47dDe211c37e15e1e76112b27d2cce';
    const toastId = toast.loading(`Deploying 2/2 Safe Multisig for "${title}"...`);
    
    try {
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      
      if (userAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        toast.error(`Please switch to the fixed Admin wallet: ${adminAddress}`, { id: toastId });
        return;
      }

      // 1. Configure the Safe multisig owners and threshold
      const safeAccountConfig = {
        owners: [
          ethers.getAddress(ngo_wallet_address),
          ethers.getAddress(adminAddress)
        ],
        threshold: 2
      };

      // 2. Initialize the Safe Protocol Kit with predictedSafe configuration
      const protocolKit = await Safe.init({
        provider: window.ethereum || signer.provider,
        signer: userAddress,
        predictedSafe: {
          safeAccountConfig
        }
      });

      // 3. Predict the Safe address
      const safeAddress = await protocolKit.getAddress();
      toast.loading(`Deploying Safe multisig at: ${safeAddress.substring(0, 6)}...${safeAddress.substring(38)}`, { id: toastId });

      // 4. Create deployment transaction
      const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

      // 5. Send transaction using the Admin signer
      const txResponse = await signer.sendTransaction({
        to: deploymentTx.to,
        value: deploymentTx.value ? ethers.parseUnits(deploymentTx.value, 'wei').toString() : '0',
        data: deploymentTx.data
      });
      
      toast.loading("Waiting for Safe deployment confirmation on-chain...", { id: toastId });
      await txResponse.wait();
      toast.success(`Safe multisig deployed successfully at ${safeAddress}!`, { id: toastId });

      // 6. Register campaign on-chain in Donation registry contract
      toast.loading("Registering campaign registry on-chain...", { id: toastId });
      const contractAddress = CONTRACT_ADDRESSES.baseSepolia.donation;
      const donationContract = new ethers.Contract(contractAddress, DonationABI, signer);
      
      const numericCampaignId = uint_id || safeParseCampaignId(id);
      
      const regTx = await donationContract.registerCampaign(
        numericCampaignId,
        safeAddress,
        darpan_id || "N/A"
      );
      await regTx.wait();
      toast.success("On-chain campaign registry complete!", { id: toastId });

      // 7. Update Supabase campaign status to approved
      const { error: dbError } = await supabase
        .from('campaigns')
        .update({ status: 'approved' })
        .eq('id', id);

      if (dbError) throw dbError;
      toast.success(`Campaign "${title}" approved and registered successfully!`, { id: toastId });
      fetchData();
    } catch (error) {
      console.error("Failed to approve campaign:", error);
      toast.error(`Error during approval: ${error.message || error}`, { id: toastId });
    }
  };

  const handleRejectCampaign = async (id, title) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      toast.error(`Campaign "${title}" rejected.`);
      fetchData();
    } catch (error) {
      console.error('Error rejecting campaign:', error);
      toast.error(`Failed to reject campaign: ${error.message}`);
    }
  };


  const filteredNgos = ngos.filter(ngo => 
    (ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    ngo.status === 'pending'
  );

  const totalRaised = campaigns.reduce((acc, c) => {
    const raisedAmount = c.donation_logs
      ? c.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0)
      : parseFloat(c.raised_amount || 0);
    return acc + raisedAmount;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-8">
      {/* Header & Stats */}
      <div className="text-center space-y-12 pb-12 border-b border-zinc-100">
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-black tracking-tight">Platform Overview</h1>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto">Monitor system health, manage partner NGOs, and review transparency metrics.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Revenue', value: `$${totalRaised.toLocaleString()}`, icon: BarChart3 },
            { label: 'Total Users', value: '2,841', icon: Users },
            { label: 'Active NGOs', value: ngos.filter(n => n.status === 'verified').length.toString(), icon: ShieldCheck },
            { label: 'Flagged Activities', value: '3', icon: AlertCircle },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-[2rem]">
               <stat.icon size={28} className="mb-3 text-black" />
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
               <p className="text-2xl font-black text-black">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Column */}
      <div className="space-y-16">
        
        {/* NGO Requests */}
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="text-2xl font-black text-black flex items-center gap-2" id="ngos">
                <ShieldCheck className="text-zinc-400" />
                Verification Queue
             </h3>
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Search NGOs..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-transparent rounded-full text-sm font-medium focus:outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all" 
               />
             </div>
           </div>

           <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[600px]">
                 <thead className="bg-zinc-50 border-b border-zinc-100">
                   <tr>
                     <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Organization</th>
                     <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                     <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date Joined</th>
                     <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-50">
                   {filteredNgos.length > 0 ? filteredNgos.map((ngo) => (
                     <tr key={ngo.id} className="hover:bg-zinc-50/50 transition-colors group">
                       <td className="px-6 py-5">
                         <div>
                           <Link to={`/manage-ngo/${ngo.id}`} className="text-base font-bold text-black hover:underline">
                             {ngo.name}
                           </Link>
                           <p className="text-sm text-zinc-500 font-medium">{ngo.email}</p>
                         </div>
                       </td>
                       <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            ngo.status === 'verified' ? 'bg-zinc-100 text-black border-zinc-200' :
                            ngo.status === 'pending' ? 'bg-white text-zinc-400 border-zinc-200' :
                            'bg-black text-white border-black'
                          }`}>
                            {ngo.status}
                          </span>
                       </td>
                       <td className="px-6 py-5 text-sm font-medium text-zinc-500">{ngo.joined}</td>
                       <td className="px-6 py-5 text-right">
                         <div className="flex justify-end gap-2 transition-opacity">
                           {ngo.status !== 'verified' && (
                             <button 
                               onClick={() => handleApprove(ngo.id, ngo.name)}
                               className="p-2.5 bg-zinc-100 text-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                               title="Approve NGO"
                             >
                               <Check size={16} />
                             </button>
                           )}
                           {ngo.status !== 'rejected' && (
                             <button 
                               onClick={() => handleReject(ngo.id, ngo.name)}
                               className="p-2.5 bg-zinc-100 text-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                               title="Reject NGO"
                             >
                               <X size={16} />
                             </button>
                           )}
                         </div>
                       </td>
                     </tr>
                   )) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 font-medium text-sm">
                        No pending NGO verification requests.
                      </td>
                    </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

         {/* Campaign Requests Queue */}
         <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-2xl font-black text-black flex items-center gap-2" id="campaigns">
                 <Megaphone className="text-zinc-400" />
                 Campaign Approval Queue
              </h3>
            </div>

            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[700px]">
                   <thead className="bg-zinc-50 border-b border-zinc-100">
                     <tr>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Campaign</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">NGO</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Darpan ID</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Wallet Address</th>
                       <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Goal</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                     {campaigns.filter(c => c.status === 'pending').length > 0 ? (
                       campaigns.filter(c => c.status === 'pending').map((campaign) => (
                         <tr key={campaign.id} className="hover:bg-zinc-50/50 transition-colors group">
                           <td className="px-6 py-5">
                             <div>
                               <p className="text-base font-bold text-black">{campaign.title}</p>
                               <p className="text-xs text-zinc-500 line-clamp-1 max-w-xs">{campaign.description}</p>
                             </div>
                           </td>
                           <td className="px-6 py-5 text-sm font-semibold text-zinc-700">
                             {campaign.ngos?.organization_name || 'Unknown NGO'}
                           </td>
                           <td className="px-6 py-5 text-sm font-mono text-zinc-600">
                             {campaign.darpan_id || 'N/A'}
                           </td>
                           <td className="px-6 py-5 text-sm font-mono text-zinc-500" title={campaign.ngo_wallet_address}>
                             {campaign.ngo_wallet_address ? `${campaign.ngo_wallet_address.substring(0, 6)}...${campaign.ngo_wallet_address.substring(38)}` : 'N/A'}
                           </td>
                           <td className="px-6 py-5 text-sm font-bold text-black">
                             ${parseFloat(campaign.goal_amount).toLocaleString()}
                           </td>
                           <td className="px-6 py-5 text-right">
                             <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => handleApproveCampaign(campaign)}
                                 className="p-2.5 bg-zinc-100 text-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                                 title="Approve Campaign"
                               >
                                 <Check size={16} />
                               </button>
                               <button 
                                 onClick={() => handleRejectCampaign(campaign.id, campaign.title)}
                                 className="p-2.5 bg-zinc-100 text-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                                 title="Reject Campaign"
                               >
                                 <X size={16} />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 font-medium text-sm">
                           No pending campaign approval requests.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
         </div>

        {/* System Alerts */}
        <div className="space-y-6">
           <h3 className="text-2xl font-black text-black flex items-center gap-2">
             <AlertCircle className="text-zinc-400" />
             System Alerts
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
               { title: 'Suspicious Activity', desc: 'Multiple failed login attempts from IP 192.168.1.1', time: '2 mins ago', type: 'error' },
               { title: 'New Campaign Flagged', desc: 'Campaign "Fast Relief" contains unverified images.', time: '1 hour ago', type: 'warning' },
               { title: 'System Update', desc: 'V3 Transparency Engine successfully deployed.', time: '5 hours ago', type: 'success' },
             ].map((alert, i) => (
               <div key={i} className={`p-6 rounded-[2rem] border ${
                 alert.type === 'error' ? 'bg-zinc-900 text-white border-black' :
                 alert.type === 'warning' ? 'bg-zinc-50 text-black border-zinc-200' :
                 'bg-white border-zinc-200 shadow-sm'
               }`}>
                 <p className={`text-lg font-black ${alert.type === 'error' ? 'text-white' : 'text-black'}`}>{alert.title}</p>
                 <p className={`text-sm font-medium mt-2 leading-relaxed ${alert.type === 'error' ? 'text-zinc-400' : 'text-zinc-500'}`}>{alert.desc}</p>
                 <p className="text-[10px] text-zinc-400 mt-4 font-bold uppercase tracking-widest">{alert.time}</p>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
