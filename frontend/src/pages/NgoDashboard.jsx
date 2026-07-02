import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Megaphone, Plus, FileText, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useNexusWallet } from '../lib/useNexusWallet';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESSES } from '../lib/contracts';
import DonationABI from '../lib/abi/Donation.json';
import { getDirectImageUrl } from '../lib/imageHelper';
import { safeParseCampaignId } from '../lib/ugf';
import { ethers } from 'ethers';
import { uploadToIPFS } from '../utils/ipfs';

const campaignSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  goal_amount: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(1, 'Goal must be at least $1')),
  image_url: z.string().url('Invalid image URL'),
  darpan_id: z.string().min(3, 'Darpan ID is required'),
  ngo_wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address'),
});

  const NgoDashboard = () => {
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [ngoId, setNgoId] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

    // Usage Logs states
    const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [isAddingLog, setIsAddingLog] = useState(false);

    // Form inputs for recording spend
    const [spendDescription, setSpendDescription] = useState('');
    const [spendAmount, setSpendAmount] = useState('');
    const [spendProofFile, setSpendProofFile] = useState(null);

    const fetchUsageLogs = async (campaignId) => {
      setLoadingLogs(true);
      try {
        const { data, error } = await supabase
          .from('fund_usage')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        // Filter to only display records stored on the Pinata (IPFS) network
        const validLogs = (data || []).filter(log => log.proof_url && log.proof_url.includes('pinata.cloud'));
        setLogs(validLogs);
      } catch (err) {
        console.error("Error fetching usage logs:", err);
        toast.error("Failed to load spending logs.");
      } finally {
        setLoadingLogs(false);
      }
    };

    const handleOpenLogs = (campaign) => {
      setSelectedCampaignForLogs(campaign);
      setShowLogsModal(true);
      fetchUsageLogs(campaign.id);
      
      // Clear form states
      setSpendDescription('');
      setSpendAmount('');
      setSpendProofFile(null);
    };

    const handleAddSpendingLog = async (e) => {
      e.preventDefault();
      if (!selectedCampaignForLogs) return;

      if (!spendDescription.trim() || !spendAmount || parseFloat(spendAmount) <= 0) {
        toast.error("Please enter a valid description and amount.");
        return;
      }

      if (!spendProofFile) {
        toast.error("Please upload a receipt or invoice file as proof.");
        return;
      }

      setIsAddingLog(true);
      const toastId = toast.loading("Uploading proof to IPFS network...");

      try {
        const fileExtension = spendProofFile.name.split('.').pop();
        const fileName = `spend-proof-${selectedCampaignForLogs.id}-${Date.now()}.${fileExtension}`;
        
        // 1. Upload proof file to IPFS
        const ipfsResult = await uploadToIPFS(spendProofFile, fileName);
        if (!ipfsResult.success) throw new Error("Failed to upload proof to IPFS");
        const finalProofUrl = ipfsResult.gatewayUrl;

        toast.loading("Recording spending details in database...", { id: toastId });

        // 2. Save new log record in Supabase fund_usage table
        const { data: newLog, error: dbError } = await supabase
          .from('fund_usage')
          .insert({
            campaign_id: selectedCampaignForLogs.id,
            description: spendDescription,
            amount: parseFloat(spendAmount),
            proof_url: finalProofUrl
          })
          .select()
          .single();

        if (dbError) throw dbError;

        toast.success("Fund spend recorded successfully!", { id: toastId });
        
        // Refresh logs list locally
        setLogs([newLog, ...logs]);
        
        // Reset form inputs
        setSpendDescription('');
        setSpendAmount('');
        setSpendProofFile(null);
        
        const fileInput = document.getElementById('spendProofFileInput');
        if (fileInput) fileInput.value = '';

      } catch (err) {
        console.error("Error saving spending log:", err);
        toast.error(`Failed to save spend: ${err.message}`, { id: toastId });
      } finally {
        setIsAddingLog(false);
      }
    };

    const { isConnected, getSigner, isDevWalletEnabled, connectDevWallet } = useNexusWallet();
    const [isCreatingOnChain, setIsCreatingOnChain] = useState(false);
    
    useEffect(() => {
      const fetchNgoData = async () => {
        if (!user) return;
        try {
          // Fetch NGO record to get status and internal ID
          const { data, error } = await supabase
            .from('ngos')
            .select('id, verification_status')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (data) {
            setStatus(data.verification_status);
            setNgoId(data.id);
            
            // If verified, fetch campaigns
            if (data.verification_status === 'verified') {
              const { data: campaignData } = await supabase
                .from('campaigns')
                .select('*, donation_logs(amount)')
                .eq('ngo_id', data.id)
                .order('created_at', { ascending: false });
                
              if (campaignData) setCampaigns(campaignData);
            }
          }
        } catch (error) {
          console.error("Error fetching NGO data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchNgoData();
    }, [user]);
    
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm({
      resolver: zodResolver(campaignSchema),
    });
  
    const onSubmit = async (data) => {
      if (!ngoId) {
        toast.error('NGO profile not found');
        return;
      }

      setIsCreatingOnChain(true);
      const toastId = toast.loading('Submitting campaign request...');

      try {
        // Save to Supabase with status 'pending'
        const { data: newCampaign, error: dbError } = await supabase
          .from('campaigns')
          .insert({
            ...data,
            ngo_id: ngoId,
            raised_amount: 0,
            status: 'pending'
          })
          .select()
          .single();

        if (dbError) throw dbError;

        toast.success('Campaign request submitted successfully! Pending admin approval.', { id: toastId });
        setCampaigns([newCampaign, ...campaigns]);
        setShowCreateModal(false);
        reset();
      } catch (error) {
        console.error('Error creating campaign:', error);
        toast.error(`Failed to submit campaign request: ${error.message}`, { id: toastId });
      } finally {
        setIsCreatingOnChain(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <div className="max-w-3xl mx-auto space-y-16 py-16 px-4">
          <div className="text-center space-y-6 py-16 bg-red-50/50 rounded-[3rem] border border-red-200 shadow-sm">
            <div className="mx-auto w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-4 max-w-xl mx-auto px-6">
              <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">Application Rejected</h1>
              <p className="text-base md:text-lg text-red-900 leading-relaxed opacity-90">
                Your NGO account application has been rejected by the administrator. You do not have access to dashboard features.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (status !== 'verified') {
      return (
        <div className="max-w-3xl mx-auto space-y-16 py-16 px-4">
          <div className="text-center space-y-6 py-16 bg-amber-50/50 rounded-[3rem] border border-amber-200 shadow-sm">
            <div className="mx-auto w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-4 max-w-xl mx-auto px-6">
              <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">Verification Pending</h1>
              <p className="text-base md:text-lg text-amber-900 leading-relaxed opacity-90">
                Your NGO account is currently under review. You do not have access to dashboard features until an administrator approves your request.
              </p>
            </div>
          </div>
        </div>
      );
    }
  
    return (
      <div className="max-w-3xl mx-auto space-y-16 py-8">
        {/* Minimalist Header */}
        <div className="text-center space-y-8 pb-12 border-b border-zinc-100">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight">Fundraising Hub</h1>
            <p className="text-lg text-zinc-500 max-w-xl mx-auto">Launch, manage, and track your disaster relief campaigns with complete blockchain transparency.</p>
          </div>
          <div className="flex justify-center flex-col items-center gap-3">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-full px-8"
              size="lg"
              variant="primary"
            >
              <Plus size={20} />
              Launch New Campaign
            </Button>
          </div>
        </div>

      {/* Campaigns List */}
      <div className="space-y-8">
        <h3 className="text-2xl font-black text-black flex items-center gap-3">
          <Megaphone className="text-zinc-400" />
          Active Campaigns
        </h3>

        <div className="space-y-6">
          {campaigns.length > 0 ? campaigns.map((campaign) => {
             const raisedAmount = campaign.donation_logs 
               ? campaign.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0) 
               : parseFloat(campaign.raised_amount || 0);
             const progress = Math.min((raisedAmount / campaign.goal_amount) * 100, 100);
             return (
               <div key={campaign.id} className="flex flex-col sm:flex-row gap-6 p-6 rounded-[2rem] border border-zinc-100 hover:border-zinc-200 transition-all bg-white group">
                  <div className="h-48 sm:h-auto sm:w-48 rounded-2xl overflow-hidden shrink-0 relative">
                    <img src={getDirectImageUrl(campaign.image_url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className={`absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-widest rounded-full ${campaign.status === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {campaign.status || 'Active'}
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col justify-between space-y-6 py-2">
                    <div>
                      <h4 className="text-2xl font-bold text-black mb-2">{campaign.title}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          <span>${raisedAmount.toLocaleString()} Raised</span>
                          <span>Goal: ${campaign.goal_amount.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
                      <button 
                        onClick={() => handleOpenLogs(campaign)}
                        className="flex-grow py-2.5 bg-zinc-50 text-black rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText size={16} />
                        Usage Logs
                      </button>
                      <button className="p-3 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-xl transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
               </div>
             );
          }) : (
            <div className="text-center py-20 bg-zinc-50 rounded-[2rem]">
              <p className="text-lg font-bold text-zinc-500">No active campaigns.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-black mb-8 text-center">Launch Campaign</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input 
                label="Campaign Title" 
                placeholder="e.g. Hurricane Relief Florida" 
                {...register('title')}
                error={errors.title?.message}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Description</label>
                <textarea 
                  className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all min-h-[120px] ${errors.description ? 'border-black ring-1 ring-black' : ''}`}
                  placeholder="Detailed explanation of how funds will be used..."
                  {...register('description')}
                />
                {errors.description && <p className="text-xs font-bold text-black ml-1">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Goal Amount ($)" 
                  type="number" 
                  placeholder="5000" 
                  {...register('goal_amount')}
                  error={errors.goal_amount?.message}
                />
                <Input 
                  label="Image URL" 
                  placeholder="https://..." 
                  {...register('image_url')}
                  error={errors.image_url?.message}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="NGO Darpan ID" 
                  placeholder="e.g. AA/2026/012345" 
                  {...register('darpan_id')}
                  error={errors.darpan_id?.message}
                />
                <Input 
                  label="Base Sepolia Wallet Address" 
                  placeholder="0x..." 
                  {...register('ngo_wallet_address')}
                  error={errors.ngo_wallet_address?.message}
                />
              </div>
              
              <div className="flex gap-4 w-full pt-6">
                <Button variant="secondary" className="flex-grow rounded-full h-14" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-grow rounded-full h-14" type="submit" disabled={isCreatingOnChain}>
                  {isCreatingOnChain ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spending Logs Modal */}
      {showLogsModal && selectedCampaignForLogs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogsModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Campaign Spending Proofs</span>
                <h3 className="text-2xl font-black text-black">{selectedCampaignForLogs.title}</h3>
              </div>
              <button 
                onClick={() => setShowLogsModal(false)}
                className="h-10 w-10 bg-zinc-50 hover:bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:text-black transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Scrollable container */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              
              {/* Record Spend Form */}
              <div className="p-6 rounded-[2rem] border border-zinc-100 bg-zinc-50 space-y-4">
                <h4 className="text-lg font-black text-black">
                  Record Fund Expenditure
                </h4>
                <p className="text-xs text-zinc-500 font-medium">
                  Every spend recorded here must include a receipt or invoice file which is immutably stored on the decentralized Pinata (IPFS) network for public donor auditing.
                </p>
                
                <form onSubmit={handleAddSpendingLog} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Amount Spent ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 1500.00" 
                        value={spendAmount}
                        onChange={(e) => setSpendAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black transition-all font-bold text-black"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                        Receipt / Invoice File
                      </label>
                      <input 
                        type="file" 
                        id="spendProofFileInput"
                        accept="image/*,application/pdf"
                        onChange={(e) => setSpendProofFile(e.target.files[0])}
                        className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black text-sm text-zinc-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white file:cursor-pointer hover:file:bg-zinc-800 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Spending Description & Purpose</label>
                    <textarea 
                      placeholder="Explain exactly how these funds were deployed (e.g., purchased 50 medical emergency kits from supplier X)..." 
                      value={spendDescription}
                      onChange={(e) => setSpendDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black transition-all min-h-[80px] text-sm text-black"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full rounded-xl py-3 h-12 text-sm font-bold text-white transition-colors bg-black hover:bg-zinc-800"
                    loading={isAddingLog}
                  >
                    {isAddingLog ? 'Uploading Receipt & Saving...' : 'Upload Receipt & Save Spend'}
                  </Button>
                </form>
              </div>

              {/* Past Spends Ledger */}
              <div className="space-y-4">
                <h4 className="text-lg font-black text-black font-sans">Past Expenditures Ledger</h4>
                
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-zinc-400" />
                  </div>
                ) : logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="p-5 border border-zinc-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-zinc-200 transition-colors">
                        <div className="space-y-1 flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-black">${parseFloat(log.amount).toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">• {new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-zinc-600 font-medium leading-relaxed">{log.description}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {log.proof_url ? (
                            <a 
                              href={log.proof_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-lime-400 hover:bg-lime-500 text-black text-xs font-black rounded-full shadow-sm transition-all"
                            >
                              View IPFS Proof ↗
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400 italic font-medium">No proof URL</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-zinc-50 border border-zinc-100/50 rounded-2xl">
                    <p className="text-zinc-500 font-medium text-sm">No expenditures recorded for this campaign yet.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoDashboard;
