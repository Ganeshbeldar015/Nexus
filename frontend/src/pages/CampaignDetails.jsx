import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockDb } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, Share2, ShieldCheck, History, ArrowLeft, Wallet, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { useNexusWallet } from '../lib/useNexusWallet';
import { donateWithUGF, handleUGFError } from '../lib/ugf';

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { address, isConnected, getSigner, isDevWallet, isDevWalletEnabled, connectDevWallet, disconnect } = useNexusWallet();
  
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [ugfStep, setUgfStep] = useState(null);

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        // Fetch campaign details
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .single();

        if (campaignError) throw campaignError;
        setCampaign(campaignData);

        // Fetch recent donations
        const { data: donationData } = await supabase
          .from('donation_logs')
          .select('*')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (donationData) setDonations(donationData);
      } catch (error) {
        console.error("Error fetching campaign details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">Campaign Not Found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const progress = Math.min((parseFloat(campaign.raised_amount) / parseFloat(campaign.goal_amount)) * 100, 100);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to donate');
      navigate('/login');
      return;
    }
    
    if (!donationAmount || isNaN(donationAmount) || parseFloat(donationAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet to donate on-chain');
      return;
    }

    setIsDonating(true);
    setUgfStep('initializing');
    
    try {
      const amount = parseFloat(donationAmount);
      let txHash;

      // ─── UGF BLOCKCHAIN FLOW ──────────────────────────────────────────────
      const signer = await getSigner();
      const provider = signer.provider;

      const toastId = toast.loading('Initializing UGF donation...');

      try {
        const result = await donateWithUGF({
          signer,
          provider,
          campaignId: campaign.id,
          amount: donationAmount,
          message: `Donation for ${campaign.title}`,
          onProgress: (step, data) => {
            setUgfStep(step);
            toast.loading(data.status, { id: toastId });
          },
        });

        txHash = result.userTxHash;
        toast.success('Blockchain transaction successful!', { id: toastId });
      } catch (ugfErr) {
        console.error("UGF Flow failed:", ugfErr);
        const friendlyError = handleUGFError(ugfErr);
        toast.error(friendlyError.message, { id: toastId });
        throw ugfErr; // Re-throw to halt database update
      }

      // ─── DATABASE UPDATE FLOW ──────────────────────────────────────────────
      // 1. Insert Donation Log
      const { data: newDonation, error: donationError } = await supabase
        .from('donation_logs')
        .insert({
          campaign_id: id,
          donor_id: user.id,
          amount: amount,
          tx_hash: txHash
        })
        .select()
        .single();

      if (donationError) throw donationError;

      // 2. Update Campaign raised_amount
      const newRaisedAmount = parseFloat(campaign.raised_amount) + amount;
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ raised_amount: newRaisedAmount })
        .eq('id', id);

      if (updateError) throw updateError;
      
      setCampaign({ ...campaign, raised_amount: newRaisedAmount });
      setDonations([newDonation, ...donations.slice(0, 4)]);
      toast.success(`Thank you! Your donation of $${donationAmount} was successful.`);
      setDonationAmount('');
    } catch (err) {
      console.error("Donation failed:", err);
      // Only show generic error if UGF has already failed/shown its error
      if (ugfStep === null || ugfStep === 'initializing') {
        toast.error('Donation failed. Please check your wallet connection and try again.');
      }
    } finally {
      setIsDonating(false);
      setUgfStep(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-black font-medium transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      {/* Hero Image */}
      <div className="aspect-[21/9] rounded-[2rem] overflow-hidden shadow-xl bg-zinc-100 relative">
        <img 
          src={campaign.image_url} 
          alt={campaign.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-black uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} />
          Verified NGO
        </div>
      </div>

      {/* Header Info */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-black text-black leading-tight">
          {campaign.title}
        </h1>
        
        <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 font-medium">
          <span>Created on {new Date(campaign.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-black font-bold">
            <Heart size={14} fill="currentColor" /> {donations.length} Supporters
          </span>
        </div>
      </div>

      {/* Progress & Donate Box */}
      <div className="bg-zinc-50 rounded-[2.5rem] p-8 sm:p-12 space-y-8 border border-zinc-100">
        <div className="space-y-4 text-center">
           <div className="flex flex-col items-center justify-center gap-2">
             <span className="text-5xl font-black text-black">${campaign.raised_amount.toLocaleString()}</span>
             <span className="text-zinc-500 font-medium text-lg">raised of ${campaign.goal_amount.toLocaleString()} goal</span>
           </div>
           
           <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden my-6">
             <div 
               className="h-full bg-black rounded-full transition-all duration-1000"
               style={{ width: `${progress}%` }}
             />
           </div>
        </div>

        <div className="max-w-md mx-auto space-y-4">
           {/* Wallet Connection Status Banner */}
           {!isConnected && (
             <div className="flex flex-col items-center gap-3 p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
               <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                 <Wallet size={18} />
                 Connect your wallet to donate on-chain
               </div>
               <div className="flex flex-col items-center gap-2 w-full">
                 <ConnectButton label="Connect Wallet" accountStatus="avatar" chainStatus="icon" showBalance={false} />
                 {isDevWalletEnabled && (
                   <button
                     type="button"
                     onClick={connectDevWallet}
                     className="py-2 px-4 text-xs bg-zinc-800 hover:bg-lime-400 hover:text-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-zinc-700/50 hover:border-lime-400 w-full max-w-[220px]"
                   >
                     ⚡ Use Shared Test Wallet
                   </button>
                 )}
               </div>
             </div>
           )}

           {/* Connected wallet indicator */}
           {isConnected && address && (
             <div className="flex items-center justify-center gap-2 p-3 bg-lime-50 border border-lime-200 rounded-2xl">
               <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></div>
               <span className="text-sm font-bold text-lime-700">Wallet Connected</span>
               <span className="text-xs font-mono text-zinc-500">{address.slice(0, 6)}...{address.slice(-4)}</span>
             </div>
           )}

           <form onSubmit={handleDonate} className="space-y-4">
             <div className="relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-400">$</span>
               <input 
                 type="number"
                 placeholder="0.00"
                 value={donationAmount}
                 onChange={(e) => setDonationAmount(e.target.value)}
                 className="w-full pl-12 pr-6 py-5 bg-white border-2 border-transparent focus:border-black rounded-[2rem] text-2xl font-black focus:outline-none transition-all text-center shadow-sm"
                 disabled={!isConnected}
               />
             </div>
             
             <Button 
               type="submit" 
               className={`w-full h-16 text-lg rounded-full ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`} 
               loading={isDonating}
               disabled={!isConnected}
             >
               {isConnected ? 'Donate Now' : 'Connect Wallet to Donate'}
             </Button>
           </form>

            <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-widest pt-2">
              <ShieldCheck size={14} className="text-black" />
              Secure On-Chain Transaction
            </div>
        </div>
      </div>

      {/* Description & History */}
      <div className="space-y-12 pt-8">
        <div className="prose prose-zinc prose-lg max-w-none text-center sm:text-left">
          <p className="text-zinc-600 leading-relaxed font-medium">
            {campaign.description}
          </p>
          <p className="text-zinc-600 leading-relaxed font-medium mt-4">
            This campaign is focused on providing immediate relief to the victims of the recent disaster. Your contributions will be used for essential supplies including food, clean water, medical aid, and temporary shelter. We guarantee 100% transparency with zero middleman fees.
          </p>
        </div>

        <div className="space-y-6 pt-12 border-t border-zinc-100">
          <h2 className="text-2xl font-black text-black flex items-center justify-center sm:justify-start gap-2">
            <History />
            Recent Donations
          </h2>
          <div className="space-y-4">
            {donations.length > 0 ? donations.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl group transition-all hover:bg-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center font-bold text-black shadow-sm">
                    {d.id.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-black">Anonymous Donor</p>
                    <p className="text-xs text-zinc-400 font-mono tracking-wider">{d.tx_hash.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="font-black text-xl text-black">+${d.amount.toLocaleString()}</span>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Confirmed</p>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center bg-zinc-50 rounded-3xl">
                <p className="text-zinc-500 font-medium">No donations yet. Be the first to help!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
