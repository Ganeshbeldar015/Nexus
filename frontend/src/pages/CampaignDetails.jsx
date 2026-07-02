import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useParams, useNavigate } from 'react-router-dom';
import { mockDb } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, Share2, ShieldCheck, History, ArrowLeft, Wallet, ArrowUpRight } from 'lucide-react';
import Button from '../components/Button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';
import { useNexusWallet } from '../lib/useNexusWallet';
import { donateWithUGF, handleUGFError, safeParseCampaignId } from '../lib/ugf';
import { CONTRACT_ADDRESSES } from '../lib/contracts';
import DonationABI from '../lib/abi/Donation.json';
import { getFallbackProvider } from '../lib/providers';
import { getDirectImageUrl } from '../lib/imageHelper';

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
  const [spendingLogs, setSpendingLogs] = useState([]);
  const [selectedToken, setSelectedToken] = useState('USDC');

  // Gnosis Safe multisig tracking states
  const [safeAddress, setSafeAddress] = useState(null);
  const [darpanId, setDarpanId] = useState('');
  const [safeBalance, setSafeBalance] = useState(0);
  const [safeRaised, setSafeRaised] = useState(0);
  const [safeWithdrawn, setSafeWithdrawn] = useState(0);
  const [isVerifyingOnChain, setIsVerifyingOnChain] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resolvedCampaignId, setResolvedCampaignId] = useState('');

  // User balance states
  const [userBalances, setUserBalances] = useState({
    USDC: 0,
    EURC: 0,
    ETH: 0,
    TYI_MOCK_USD: 0
  });
  const [loadingBalances, setLoadingBalances] = useState(false);

  const fetchUserBalances = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoadingBalances(true);
    try {
      const provider = await getFallbackProvider();
      
      // 1. Fetch ETH balance
      const ethBalWei = await provider.getBalance(address);
      const ethBal = parseFloat(ethers.formatEther(ethBalWei));
      
      // 2. Fetch USDC balance
      const usdcAddress = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
      const usdcContract = new ethers.Contract(usdcAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const usdcBalWei = await usdcContract.balanceOf(address);
      const usdcBal = parseFloat(ethers.formatUnits(usdcBalWei, 6));

      // 3. Fetch EURC balance
      const eurcAddress = '0x808456652fdb597867f38412077A9182bf77359F';
      const eurcContract = new ethers.Contract(eurcAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const eurcBalWei = await eurcContract.balanceOf(address);
      const eurcBal = parseFloat(ethers.formatUnits(eurcBalWei, 6));

      // 4. Fetch TYI_MOCK_USD balance
      const tyiAddress = '0x27DC1C167AeF232bb1e21073304B526726a8727e';
      const tyiContract = new ethers.Contract(tyiAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const tyiBalWei = await tyiContract.balanceOf(address);
      const tyiBal = parseFloat(ethers.formatUnits(tyiBalWei, 6));

      setUserBalances({
        USDC: usdcBal,
        EURC: eurcBal,
        ETH: ethBal,
        TYI_MOCK_USD: tyiBal
      });
    } catch (err) {
      console.error("Error fetching user balances:", err);
    } finally {
      setLoadingBalances(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    fetchUserBalances();
  }, [fetchUserBalances]);

  const fetchSafeBalances = useCallback(async () => {
    try {
      const provider = await getFallbackProvider();
      const contractAddress = CONTRACT_ADDRESSES.baseSepolia.donation;
      const donationContract = new ethers.Contract(contractAddress, DonationABI, provider);

      // Fetch campaign db data to get uint_id and database-tracked donation logs
      const { data: campaignDb } = await supabase
        .from('campaigns')
        .select('*, donation_logs(amount)')
        .eq('id', id)
        .single();

      if (!campaignDb) {
        console.log("Campaign not found in database.");
        return;
      }

      const numericId = campaignDb.uint_id || safeParseCampaignId(id);
      let registry = await donationContract.campaignRegistry(numericId);
      let finalId = numericId;

      // Fallback: If not found under sequential/uint_id, check the UUID-based parsed ID
      if ((!registry.safeAddress || registry.safeAddress === ethers.ZeroAddress) && campaignDb.uint_id) {
        const fallbackId = safeParseCampaignId(id);
        if (fallbackId !== BigInt(campaignDb.uint_id)) {
          const fallbackRegistry = await donationContract.campaignRegistry(fallbackId);
          if (fallbackRegistry.safeAddress && fallbackRegistry.safeAddress !== ethers.ZeroAddress) {
            registry = fallbackRegistry;
            finalId = fallbackId;
          }
        }
      }
      
      if (!registry.safeAddress || registry.safeAddress === ethers.ZeroAddress) {
        console.log("Safe address is not registered yet on-chain.");
        return;
      }
      
      const currentSafeAddress = registry.safeAddress;
      setSafeAddress(currentSafeAddress);
      setDarpanId(registry.darpanId);
      setResolvedCampaignId(finalId.toString());

      let dbRaised = campaignDb.donation_logs
        ? campaignDb.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0)
        : parseFloat(campaignDb.raised_amount || 0);

      // Query balances for all supported tokens to get the total Safe balance in USD
      // 1. Fetch ETH balance
      const ethBalWei = await provider.getBalance(currentSafeAddress);
      const ethBal = parseFloat(ethers.formatEther(ethBalWei));
      const ethVal = ethBal * 3000; // ETH mock price: $3000

      // 2. Fetch USDC balance
      const usdcAddress = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
      const usdcContract = new ethers.Contract(usdcAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const usdcBalWei = await usdcContract.balanceOf(currentSafeAddress);
      const usdcBal = parseFloat(ethers.formatUnits(usdcBalWei, 6));

      // 3. Fetch EURC balance
      const eurcAddress = '0x808456652fdb597867f38412077A9182bf77359F';
      const eurcContract = new ethers.Contract(eurcAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const eurcBalWei = await eurcContract.balanceOf(currentSafeAddress);
      const eurcBal = parseFloat(ethers.formatUnits(eurcBalWei, 6));
      const eurcVal = eurcBal * 1.08; // EURC to USD rate

      // 4. Fetch TYI_MOCK_USD balance
      const tyiAddress = '0x27DC1C167AeF232bb1e21073304B526726a8727e';
      const tyiContract = new ethers.Contract(tyiAddress, ['function balanceOf(address) view returns (uint256)'], provider);
      const tyiBalWei = await tyiContract.balanceOf(currentSafeAddress);
      const tyiBal = parseFloat(ethers.formatUnits(tyiBalWei, 6));

      const totalSafeBalanceUsd = ethVal + usdcBal + eurcVal + tyiBal;

      setSafeBalance(totalSafeBalanceUsd);
      setSafeRaised(dbRaised);
      setSafeWithdrawn(Math.max(dbRaised - totalSafeBalanceUsd, 0));
    } catch (err) {
      console.error("Error fetching Safe balances:", err);
    }
  }, [id]);

  const handleVerifyOnChain = async () => {
    setIsVerifyingOnChain(true);
    try {
      const provider = await getFallbackProvider();
      const contractAddress = CONTRACT_ADDRESSES.baseSepolia.donation;
      const donationContract = new ethers.Contract(contractAddress, DonationABI, provider);
      const numericId = campaign?.uint_id || safeParseCampaignId(id);
      
      let registry = await donationContract.campaignRegistry(numericId);
      let finalId = numericId;

      // Fallback: If not found under sequential/uint_id, check the UUID-based parsed ID
      if ((!registry.safeAddress || registry.safeAddress === ethers.ZeroAddress) && campaign?.uint_id) {
        const fallbackId = safeParseCampaignId(id);
        if (fallbackId !== BigInt(campaign.uint_id)) {
          const fallbackRegistry = await donationContract.campaignRegistry(fallbackId);
          if (fallbackRegistry.safeAddress && fallbackRegistry.safeAddress !== ethers.ZeroAddress) {
            registry = fallbackRegistry;
            finalId = fallbackId;
          }
        }
      }

      if (registry.safeAddress && registry.safeAddress !== ethers.ZeroAddress) {
        setSafeAddress(registry.safeAddress);
        setDarpanId(registry.darpanId);
        setResolvedCampaignId(finalId.toString());
        setShowVerificationModal(true);
      } else {
        toast.error("Campaign is not registered on-chain yet.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify on-chain registry: " + err.message);
    } finally {
      setIsVerifyingOnChain(false);
    }
  };

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        // Fetch campaign details
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*, donation_logs(amount)')
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

        // Fetch spending logs (transparency / audit ledger)
        const { data: usageData } = await supabase
          .from('fund_usage')
          .select('*')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false });

        if (usageData) {
          // Filter to only display records stored on the Pinata (IPFS) network
          const validLogs = usageData.filter(log => log.proof_url && log.proof_url.includes('pinata.cloud'));
          setSpendingLogs(validLogs);
        }
      } catch (error) {
        console.error("Error fetching campaign details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
    fetchSafeBalances();
  }, [id, fetchSafeBalances]);

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

  const raisedAmount = safeAddress ? safeRaised : (campaign.donation_logs 
    ? campaign.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0) 
    : parseFloat(campaign.raised_amount || 0));

  const progress = Math.min((raisedAmount / parseFloat(campaign.goal_amount)) * 100, 100);
  const totalSpent = safeAddress ? safeWithdrawn : spendingLogs.reduce((acc, log) => acc + parseFloat(log.amount), 0);
  const remainingBalance = safeAddress ? safeBalance : Math.max(raisedAmount - totalSpent, 0);

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
      const rawAmount = parseFloat(donationAmount);
      let amount = rawAmount;
      if (selectedToken === 'ETH') {
        amount = rawAmount * 3000; // Mock ETH Price: $3,000
      } else if (selectedToken === 'EURC') {
        amount = rawAmount * 1.08; // EURC to USD rate
      } else if (selectedToken === 'TYI_MOCK_USD') {
        amount = rawAmount; // Mock USD is 1:1 with USD
      }
      amount = Math.round(amount * 100) / 100; // Round to 2 decimal places

      // Pre-check ERC20 balance to avoid gas estimation fails
      if (selectedToken !== 'ETH') {
        const checkSigner = await getSigner();
        const checkProvider = checkSigner.provider;
        const checkPayer = await checkSigner.getAddress();
        
        let checkAddress = '';
        if (selectedToken === 'USDC') {
          checkAddress = ethers.getAddress('0x036cbd53842c5426634e7929541ec2318f3dcf7e');
        } else if (selectedToken === 'EURC') {
          checkAddress = ethers.getAddress('0x808456652fdb597867f38412077A9182bf77359F');
        } else if (selectedToken === 'TYI_MOCK_USD') {
          checkAddress = ethers.getAddress('0x27DC1C167AeF232bb1e21073304B526726a8727e');
        }

        const erc20 = new ethers.Contract(checkAddress, [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ], checkProvider);

        const checkBalance = await erc20.balanceOf(checkPayer);
        const checkDecimals = await erc20.decimals();
        const checkRequired = ethers.parseUnits(donationAmount, checkDecimals);

        if (checkBalance < checkRequired) {
          const friendlyName = selectedToken;
          const currentBalFormatted = ethers.formatUnits(checkBalance, checkDecimals);
          toast.error(`Insufficient ${friendlyName} balance! You have ${currentBalFormatted} ${friendlyName}, but are trying to donate ${donationAmount}. Please claim tokens or use another asset.`);
          setIsDonating(false);
          setUgfStep(null);
          return;
        }
      }
      let txHash;

      // ─── UGF BLOCKCHAIN FLOW ──────────────────────────────────────────────
      const signer = await getSigner();
      const provider = signer.provider;

      const toastId = toast.loading('Initializing UGF donation...');

      try {
        const result = await donateWithUGF({
          signer,
          provider,
          campaignId: campaign.uint_id || campaign.id,
          amount: donationAmount,
          message: `Donation for ${campaign.title}`,
          tokenType: selectedToken,
          receivingAddress: safeAddress,
          onProgress: (step, data) => {
            setUgfStep(step);
            toast.loading(data.status, { id: toastId });
          },
        });

        txHash = result.userTxHash;
        
        // Wait for transaction to be mined to verify it did not revert!
        toast.loading('Verifying transaction on-chain...', { id: toastId });
        const receipt = await provider.waitForTransaction(txHash);
        if (receipt.status !== 1) {
          throw new Error('On-chain transaction execution reverted! Please check your token balance.');
        }

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

      // Donation receipt generation has been disabled per user request


      // Update local campaign state dynamically
      const newDonationLogItem = { amount: amount };
      const updatedDonationLogs = campaign.donation_logs 
        ? [...campaign.donation_logs, newDonationLogItem] 
        : [newDonationLogItem];

      setCampaign({
        ...campaign,
        donation_logs: updatedDonationLogs,
        raised_amount: (parseFloat(campaign.raised_amount) || 0) + amount
      });
      setDonations([newDonation, ...donations.slice(0, 4)]);
      const displayUSD = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      toast.success(`Thank you! Your donation of ${donationAmount} ${selectedToken} (approx. $${displayUSD} USD) was successful.`);
      setDonationAmount('');
      fetchUserBalances();
      fetchSafeBalances();
    } catch (err) {
      console.error("Donation failed:", err);
      toast.error(`Donation failed: ${err.message || err}`);
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
          src={getDirectImageUrl(campaign.image_url)} 
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
             <span className="text-5xl font-black text-black">${raisedAmount.toLocaleString()}</span>
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
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 p-3 bg-lime-50 border border-lime-200 rounded-2xl">
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-lime-700">Wallet Connected</span>
                  <span className="text-xs font-mono text-zinc-500">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
                
                {/* User Balances Box */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-600">
                    <span className="font-bold">Your {selectedToken} Balance:</span>
                    <span className="font-mono font-bold text-zinc-800">
                      {loadingBalances ? 'Loading...' : `${userBalances[selectedToken]?.toFixed(4)} ${selectedToken}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span className="font-bold">UGF Gas Fee Balance (TYI_MOCK_USD):</span>
                    <span className="font-mono font-bold text-zinc-800">
                      {loadingBalances ? 'Loading...' : `${userBalances.TYI_MOCK_USD?.toFixed(2)} TYI_MOCK_USD`}
                    </span>
                  </div>
                  {userBalances.TYI_MOCK_USD < 1.0 && !loadingBalances && (
                    <div className="text-amber-600 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200 text-[10px] text-center">
                      ⚠️ Low Gas Fee Balance! Get free TYI_MOCK_USD from the{' '}
                      <a href="https://faucet.tychilabs.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">
                        UGF Faucet
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

           <form onSubmit={handleDonate} className="space-y-6">
             {/* Premium Token Selection Grid */}
             <div className="space-y-2">
               <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">
                 Select Donation Token
               </label>
               <div className="grid grid-cols-3 gap-3">
                  {[
                    { symbol: 'USDC', network: 'Base Sepolia', icon: '💵', desc: 'USDC (Base)' },
                    { symbol: 'EURC', network: 'Base Sepolia', icon: '💶', desc: 'EURC (Base)' },
                    { symbol: 'ETH', network: 'Base Sepolia', icon: '🔷', desc: 'ETH (Base)' },
                  ].map((t) => (
                   <button
                     key={t.symbol}
                     type="button"
                     onClick={() => setSelectedToken(t.symbol)}
                     className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all duration-300 ${
                       selectedToken === t.symbol
                         ? 'bg-black text-white border-black scale-102 shadow-md font-bold'
                         : 'bg-zinc-50 text-zinc-700 border-zinc-100 hover:border-zinc-300'
                     }`}
                     disabled={!isConnected}
                   >
                     <span className="text-xl">{t.icon}</span>
                     <span className="font-extrabold text-sm">{t.symbol}</span>
                     <span className={`text-[9px] font-bold uppercase tracking-wider ${
                       selectedToken === t.symbol ? 'text-zinc-400' : 'text-zinc-500'
                     }`}>{t.network}</span>
                   </button>
                 ))}
               </div>
             </div>

             {/* NGO Receiving Address Details */}
             <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-center space-y-1.5">
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                 NGO Safe Multisig Wallet (2/2)
               </span>
               <div className="flex items-center justify-center gap-1.5">
                 <p className="text-xs font-mono font-bold text-zinc-700 select-all">
                   {safeAddress || 'Not approved / registered on-chain'}
                 </p>
                 {safeAddress && (
                   <button
                     type="button"
                     onClick={() => {
                       navigator.clipboard.writeText(safeAddress);
                       toast.success('Address copied!');
                     }}
                     className="p-1 text-zinc-400 hover:text-black rounded transition-colors"
                     title="Copy Address"
                   >
                     📋
                   </button>
                 )}
               </div>
               
               {/* On-chain Verification Button */}
               <div className="pt-2">
                 <button
                   type="button"
                   onClick={handleVerifyOnChain}
                   disabled={isVerifyingOnChain || !safeAddress}
                   className="w-full py-2 bg-zinc-800 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                 >
                   🔍 Verify Registry on Blockchain
                 </button>
               </div>
             </div>
             
             <div className="relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-400">{selectedToken === 'ETH' ? 'Ξ' : '$'}</span>
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
               {isConnected ? `Donate ${selectedToken === 'TYI_MOCK_USD' ? 'Mock USD' : selectedToken}` : 'Connect Wallet to Donate'}
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

        {/* NGO Spending Proof of Impact Ledger */}
        <div className="space-y-6 pt-12 border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-black flex items-center justify-center sm:justify-start gap-2">
              <ShieldCheck className="text-black stroke-[2.5]" />
              Fund Spends & Proof of Impact
            </h2>
            <span className="px-3.5 py-1.5 bg-lime-400 text-black text-xs font-black uppercase tracking-wider rounded-full shadow-sm mx-auto sm:mx-0 flex items-center gap-1.5 animate-pulse font-mono">
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
              IPFS Audited Logs
            </span>
          </div>

          <p className="text-sm text-zinc-500 text-center sm:text-left leading-relaxed font-medium">
            All expenditures recorded below include invoices, purchase logs, and receipts locked cryptographically on the decentralized IPFS network. Every donor can verify exactly how funds were deployed.
          </p>

          {/* Spend Statistics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Raised</span>
              <p className="text-2xl font-black text-black">${raisedAmount.toLocaleString()}</p>
            </div>
            <div className="text-center space-y-1 border-t sm:border-t-0 sm:border-x border-zinc-200 py-3 sm:py-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Spent</span>
              <p className="text-2xl font-black text-black">${totalSpent.toLocaleString()}</p>
            </div>
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Balance</span>
              <p className="text-2xl font-black text-black">${remainingBalance.toLocaleString()}</p>
            </div>
          </div>

          {/* Expenditures List */}
          <div className="space-y-4 pt-2">
            {spendingLogs.length > 0 ? (
              spendingLogs.map((log) => (
                <div key={log.id} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100/50 hover:border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:bg-zinc-100 group">
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-black">${parseFloat(log.amount).toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">• {new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-600 font-medium leading-relaxed">{log.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center justify-end sm:justify-start">
                    {log.proof_url ? (
                      <a 
                        href={log.proof_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-lime-400 border border-zinc-200 hover:border-lime-400 text-zinc-700 hover:text-black text-xs font-black rounded-full shadow-sm transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        View IPFS Proof
                        <ArrowUpRight size={13} className="stroke-[3]" />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400 italic font-medium font-sans">No proof available</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-zinc-50 rounded-3xl border border-zinc-100/50">
                <p className="text-zinc-500 font-medium text-sm">No funds have been spent yet. All spending logs will appear here once registered by the NGO.</p>
              </div>
            )}
          </div>
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
      {/* On-Chain Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full border-2 border-black space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-black font-bold text-lg"
            >
              ✕
            </button>
            <div className="text-center space-y-2">
              <span className="text-3xl">🔗</span>
              <h3 className="text-2xl font-black text-black">Blockchain Verified</h3>
              <p className="text-xs text-zinc-500 font-medium text-center">Decentralized registry details queried directly from Base Sepolia smart contract</p>
            </div>
            
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4 font-mono text-xs text-zinc-700">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Registry Contract</span>
                <p className="break-all font-bold text-black">{CONTRACT_ADDRESSES.baseSepolia.donation}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Campaign ID (uint256)</span>
                <p className="font-bold text-black">{resolvedCampaignId || (campaign?.uint_id || safeParseCampaignId(id)).toString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Registered Safe Address</span>
                <p className="break-all font-bold text-black">{safeAddress}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">NGO Darpan ID</span>
                <p className="font-bold text-black">{darpanId || 'N/A'}</p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowVerificationModal(false)}
              className="w-full rounded-full py-4 font-bold"
            >
              Close Verification
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CampaignDetails;
