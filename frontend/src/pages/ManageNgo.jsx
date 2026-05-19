import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { mockDb } from '../services/mockDb';
import { 
  Building2, 
  Mail, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Wallet, 
  Calendar, 
  ArrowLeft, 
  Edit3, 
  Save, 
  Plus, 
  Megaphone, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  History
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { toast } from 'sonner';

const ManageNgo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [ngo, setNgo] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWallet, setEditWallet] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            wallet_address,
            created_at,
            ngos (
              verification_status,
              organization_name
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        const ngoRow = Array.isArray(userProfile.ngos) ? userProfile.ngos[0] : userProfile.ngos;
        
        const formattedNgo = {
          id: userProfile.id,
          name: ngoRow?.organization_name || userProfile.full_name,
          email: userProfile.email,
          wallet_address: userProfile.wallet_address,
          description: '', 
          status: ngoRow?.verification_status || 'pending',
          joined: new Date(userProfile.created_at).toLocaleDateString()
        };

        setNgo(formattedNgo);
        setEditName(formattedNgo.name);
        setEditEmail(formattedNgo.email || '');
        setEditWallet(formattedNgo.wallet_address || '');
        setEditDescription('');

      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Load campaigns for this NGO
    const allCampaigns = mockDb.getCampaigns().filter(c => c.ngo_id === id);
    setCampaigns(allCampaigns);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 space-y-6">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold text-slate-900">Loading Profile...</h2>
      </div>
    );
  }

  if (!ngo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 space-y-6">
        <h2 className="text-3xl font-bold text-slate-900">NGO Profile Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Permissions Check
  const isAdmin = user?.role === 'admin';
  const isOwnNgo = user?.role === 'ngo' && user?.id === ngo.id;
  const canEdit = isAdmin || isOwnNgo;

  const handleStatusChange = async (newStatus) => {
    try {
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        await supabase.from('ngos').update({ verification_status: newStatus }).eq('user_id', id);
      } else {
        await supabase.from('ngos').insert({ user_id: id, organization_name: ngo.name, verification_status: newStatus });
      }
      setNgo(prev => ({ ...prev, status: newStatus }));
      
      if (newStatus === 'verified') {
        toast.success('NGO verification approved!');
      } else if (newStatus === 'rejected') {
        toast.error('NGO status set to Rejected.');
      } else {
        toast.info('NGO status set to Pending.');
      }
    } catch (error) {
      toast.error('Failed to change status');
      console.error(error);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Organization Name is required');
      return;
    }

    setSaveLoading(true);

    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({ wallet_address: editWallet, email: editEmail, full_name: editName })
        .eq('id', id);
      if (userError) throw userError;

      // Update ngos table
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        await supabase.from('ngos').update({ organization_name: editName }).eq('user_id', id);
      } else {
        await supabase.from('ngos').insert({ user_id: id, organization_name: editName, verification_status: 'pending' });
      }

      setNgo(prev => ({
        ...prev,
        name: editName,
        email: editEmail,
        wallet_address: editWallet,
        description: editDescription
      }));
      setIsEditing(false);
      toast.success('NGO Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update details');
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  const totalRaised = campaigns.reduce((acc, c) => acc + c.raised_amount, 0);
  const totalGoal = campaigns.reduce((acc, c) => acc + c.goal_amount, 0);

  // Simulated blockchain transaction logs
  const donations = mockDb.getDonations();
  const ngoDonations = donations.filter(d => 
    campaigns.some(c => c.id === d.campaign_id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-black font-semibold transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      {/* Main Header / Status Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2rem] border border-zinc-100 bg-white shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight leading-none">
              {ngo.name}
            </h1>
            <span className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
              ngo.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              ngo.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              {ngo.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Mail size={14} />
              {ngo.email}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Joined {ngo.joined}
            </span>
          </div>
        </div>

        {/* Edit Button */}
        {canEdit && !isEditing && (
          <Button 
            onClick={() => setIsEditing(true)}
            variant="secondary"
            className="rounded-full px-6 shrink-0 self-start md:self-center"
          >
            <Edit3 size={16} />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Admin Verification Controls */}
      {isAdmin && (
        <div className="p-8 rounded-[2rem] border-2 border-dashed border-zinc-200 bg-zinc-50/50 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-black flex items-center gap-2">
              <ShieldCheck className="text-zinc-600" />
              Administrative Verification Status
            </h3>
            <p className="text-sm text-zinc-500 mt-1">Select the status below to instantly update this NGO's system credibility badge.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {[
              { status: 'verified', label: 'Approve & Verify', color: 'bg-emerald-500 text-white hover:bg-emerald-600', icon: CheckCircle2 },
              { status: 'pending', label: 'Set as Pending', color: 'bg-amber-500 text-white hover:bg-amber-600', icon: AlertCircle },
              { status: 'rejected', label: 'Reject / Suspend', color: 'bg-red-600 text-white hover:bg-red-700', icon: XCircle }
            ].map((btn) => {
              const isActive = ngo.status === btn.status;
              return (
                <button
                  key={btn.status}
                  onClick={() => handleStatusChange(btn.status)}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                    isActive 
                      ? `${btn.color} ring-4 ring-offset-2 ring-zinc-300 scale-105`
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-black'
                  }`}
                >
                  <btn.icon size={16} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-Admin User Info Alert */}
      {!isAdmin && ngo.status === 'pending' && (
        <div className="flex gap-4 p-6 rounded-[2rem] border border-amber-200 bg-amber-50/30 text-amber-900">
          <AlertCircle className="shrink-0 text-amber-700" size={24} />
          <div>
            <h4 className="font-bold text-base leading-tight">Verification Pending</h4>
            <p className="text-sm mt-1 opacity-90 leading-relaxed">
              Your profile is currently awaiting administrator verification. While in pending status, your organization details are visible, but public fundraising will remain disabled until credentials are fully approved.
            </p>
          </div>
        </div>
      )}

      {/* Core Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Raised', value: `$${totalRaised.toLocaleString()}`, icon: Megaphone },
          { label: 'Fundraising Goal', value: `$${totalGoal.toLocaleString()}`, icon: FileText },
          { label: 'Active Campaigns', value: campaigns.length.toString(), icon: Building2 },
          { label: 'Verifications', value: ngo.status === 'verified' ? '100% Secure' : 'In Review', icon: ShieldCheck }
        ].map((metric, i) => (
          <div key={i} className="flex flex-col items-start p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 hover:border-zinc-200 transition-all">
            <metric.icon size={20} className="text-zinc-400 mb-4" />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{metric.label}</p>
            <p className="text-2xl font-black text-black">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Split details column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile details */}
        <div className="md:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="p-8 rounded-[2rem] border border-zinc-100 bg-white space-y-6">
              <h3 className="text-xl font-bold text-black border-b border-zinc-100 pb-3">Edit Organization Details</h3>
              
              <Input 
                label="Organization Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Hope Relief"
              />

              <Input 
                label="Contact Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="e.g. contact@hope.org"
              />

              <Input 
                label="Wallet / Multi-Sig Smart Contract Address"
                value={editWallet}
                onChange={(e) => setEditWallet(e.target.value)}
                placeholder="0x..."
              />

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 ml-1">About Organization</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all min-h-[140px]"
                  placeholder="Describe your organization's mission..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-100">
                <Button 
                  type="button" 
                  variant="secondary"
                  className="flex-grow rounded-full h-12"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-grow rounded-full h-12"
                  loading={saveLoading}
                >
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-8 rounded-[2rem] border border-zinc-100 bg-white space-y-6">
              <h3 className="text-xl font-bold text-black border-b border-zinc-100 pb-3">About Organization</h3>
              <p className="text-sm font-medium leading-relaxed text-zinc-500">
                {ngo.description || 'No description provided yet.'}
              </p>

              {/* Wallet Integration Card */}
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Wallet size={14} className="text-black" />
                    Multi-Sig Wallet
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Mainnet
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold font-mono tracking-wider text-zinc-500 select-all leading-normal flex items-center gap-2 break-all bg-white p-3.5 border border-zinc-200 rounded-xl">
                    {ngo.wallet_address || '0x0000000000000000000000000000000000000000'}
                    {ngo.wallet_address && (
                      <button 
                        onClick={() => copyToClipboard(ngo.wallet_address)}
                        className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-black rounded-lg transition-all"
                        title="Copy to Clipboard"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blockchain / Transactions audit */}
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] border border-zinc-100 bg-white space-y-6">
            <h3 className="text-lg font-bold text-black border-b border-zinc-100 pb-3 flex items-center gap-2">
              <History size={16} />
              Blockchain Audit Trail
            </h3>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {ngoDonations.length > 0 ? ngoDonations.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 hover:bg-zinc-100 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-black">Donation Received</span>
                    <span className="font-mono text-zinc-400">{log.tx_hash.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(log.created_at).toLocaleDateString()}</span>
                    <span className="font-black text-sm text-emerald-600">+${log.amount.toLocaleString()}</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center bg-zinc-50 rounded-2xl">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">No transaction logs</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Campaigns Listing */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-black text-black flex items-center gap-3">
            <Megaphone className="text-zinc-400" />
            Active Campaigns ({campaigns.length})
          </h3>
          {isOwnNgo && (
            <Button 
              onClick={() => {
                if (ngo.status === 'verified') {
                  navigate('/ngo-dashboard');
                } else {
                  toast.error('Your NGO must be verified by an admin before you can launch campaigns.');
                }
              }}
              className="rounded-full"
              size="sm"
              variant={ngo.status === 'verified' ? 'primary' : 'secondary'}
            >
              <Plus size={16} />
              New Campaign
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {campaigns.length > 0 ? campaigns.map((campaign) => {
            const progress = Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100);
            return (
              <div 
                key={campaign.id} 
                className="flex flex-col border border-zinc-100 hover:border-zinc-200 transition-all rounded-[2rem] bg-white overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] duration-300 group cursor-pointer"
                onClick={() => navigate(`/campaign/${campaign.id}`)}
              >
                <div className="h-44 bg-zinc-100 overflow-hidden relative">
                  <img src={campaign.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Active
                  </div>
                </div>
                <div className="p-6 space-y-6 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-black leading-tight group-hover:text-primary-600 transition-colors">{campaign.title}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{campaign.description}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>${campaign.raised_amount.toLocaleString()} Raised</span>
                      <span>Goal: ${campaign.goal_amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-16 text-center bg-zinc-50 rounded-[2rem] border border-zinc-100">
              <Building2 className="mx-auto text-zinc-300 mb-3" size={40} />
              <p className="text-base font-bold text-zinc-500">No campaigns launched yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ManageNgo;
