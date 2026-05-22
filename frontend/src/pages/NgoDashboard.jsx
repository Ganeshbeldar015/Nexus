import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Megaphone, Plus, FileText, Trash2, AlertCircle } from 'lucide-react';
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
import { safeParseCampaignId } from '../lib/ugf';
import { ethers } from 'ethers';

const campaignSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  goal_amount: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(1, 'Goal must be at least $1')),
  image_url: z.string().url('Invalid image URL'),
});

  const NgoDashboard = () => {
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [ngoId, setNgoId] = useState(null);
    const [campaigns, setCampaigns] = useState([]);

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
                .select('*')
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

      if (!isConnected) {
        toast.error('Please connect your wallet to launch a campaign on-chain');
        return;
      }

      setIsCreatingOnChain(true);
      const toastId = toast.loading('Initializing campaign launch...');
      let tempCampaign = null;

      try {
        // 1. Save to Supabase to generate the UUID
        toast.loading('Saving campaign details to database...', { id: toastId });
        const { data: newCampaign, error: dbError } = await supabase
          .from('campaigns')
          .insert({
            ...data,
            ngo_id: ngoId,
            raised_amount: 0
          })
          .select()
          .single();

        if (dbError) throw dbError;
        tempCampaign = newCampaign;

        // 2. Parse UUID to a uint256 BigInt
        const parsedCampaignId = safeParseCampaignId(newCampaign.id);

        // 3. Submit transaction to the blockchain
        toast.loading('Please sign the transaction in your wallet...', { id: toastId });
        const goalAmountWei = BigInt(Math.floor(data.goal_amount)) * BigInt(10 ** 18);

        const signer = await getSigner();
        const donationContract = new ethers.Contract(
          CONTRACT_ADDRESSES.baseSepolia.donation,
          DonationABI,
          signer
        );
        const tx = await donationContract.createCampaign(
          parsedCampaignId,
          data.title,
          data.description,
          goalAmountWei
        );
        await tx.wait();

        toast.success('Campaign launched on-chain successfully!', { id: toastId });
        setCampaigns([newCampaign, ...campaigns]);
        setShowCreateModal(false);
        reset();
      } catch (error) {
        console.error('Error creating campaign:', error);
        
        // Extract a friendly revert reason if available
        let errorMsg = error.shortMessage || error.message || String(error);
        if (errorMsg.includes('Only verified NGOs')) {
          errorMsg = 'Only verified NGOs can create campaigns. Please make sure the admin has approved your wallet address on-chain.';
        }
        
        toast.error(`Failed to launch campaign: ${errorMsg}`, { id: toastId });

        // Database Rollback
        if (tempCampaign) {
          try {
            await supabase.from('campaigns').delete().eq('id', tempCampaign.id);
          } catch (deleteError) {
            console.error('Failed to rollback database campaign record:', deleteError);
          }
        }
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
             const progress = (campaign.raised_amount / campaign.goal_amount) * 100;
             return (
               <div key={campaign.id} className="flex flex-col sm:flex-row gap-6 p-6 rounded-[2rem] border border-zinc-100 hover:border-zinc-200 transition-all bg-white group">
                  <div className="h-48 sm:h-auto sm:w-48 rounded-2xl overflow-hidden shrink-0 relative">
                    <img src={campaign.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-widest rounded-full">
                      Active
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col justify-between space-y-6 py-2">
                    <div>
                      <h4 className="text-2xl font-bold text-black mb-2">{campaign.title}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          <span>${campaign.raised_amount.toLocaleString()} Raised</span>
                          <span>Goal: ${campaign.goal_amount.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
                      <button className="flex-grow py-2.5 bg-zinc-50 text-black rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2">
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
              
              <div className="flex flex-col gap-4 pt-6">
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <p className="text-sm font-semibold text-zinc-500">Please connect your wallet to launch a campaign on-chain</p>
                    <ConnectButton />
                    {isDevWalletEnabled && (
                      <button
                        type="button"
                        onClick={connectDevWallet}
                        className="w-full py-3 px-4 text-sm bg-zinc-800 hover:bg-lime-400 hover:text-black text-white font-bold rounded-full transition-all flex items-center justify-center gap-1.5 border border-zinc-700/50 hover:border-lime-400"
                      >
                        ⚡ Use Shared Test Wallet
                      </button>
                    )}
                    <Button variant="secondary" className="w-full rounded-full h-14 mt-2" type="button" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-4 w-full">
                    <Button variant="secondary" className="flex-grow rounded-full h-14" type="button" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-grow rounded-full h-14" type="submit" disabled={isCreatingOnChain}>
                      {isCreatingOnChain ? 'Launching...' : 'Launch'}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoDashboard;
