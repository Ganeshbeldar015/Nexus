import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building2,
  Copy,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import { toast } from 'sonner';

const AdminNgoManagement = () => {
  const [ngos, setNgos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, verified, pending, rejected
  const [showAddModal, setShowAddModal] = useState(false);

  // New NGO Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWallet, setNewWallet] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchNgos = async () => {
    try {
      setLoading(true);
      const { data: users, error } = await supabase
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
        .eq('role', 'ngo');

      if (error) throw error;

      const formattedNgos = users.map(user => {
        const ngoProfile = Array.isArray(user.ngos) ? user.ngos[0] : user.ngos;
        return {
          id: user.id,
          name: ngoProfile?.organization_name || user.full_name,
          email: user.email,
          wallet_address: user.wallet_address,
          status: ngoProfile?.verification_status || 'pending',
          joined: new Date(user.created_at).toLocaleDateString(),
        };
      });

      setNgos(formattedNgos);
    } catch (error) {
      console.error('Error fetching NGOs:', error);
      toast.error('Failed to load NGOs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, []);

  const handleApprove = async (id, name) => {
    try {
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        const { error } = await supabase.from('ngos').update({ verification_status: 'verified' }).eq('user_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ngos').insert({
          user_id: id,
          organization_name: name,
          verification_status: 'verified'
        });
        if (error) throw error;
      }
      toast.success('NGO verification approved.');
      fetchNgos();
    } catch (error) {
      toast.error('Failed to approve NGO');
      console.error(error);
    }
  };

  const handleReject = async (id, name) => {
    try {
      const { data: existingNgo } = await supabase.from('ngos').select('id').eq('user_id', id).maybeSingle();
      if (existingNgo) {
        const { error } = await supabase.from('ngos').update({ verification_status: 'rejected' }).eq('user_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ngos').insert({
          user_id: id,
          organization_name: name,
          verification_status: 'rejected'
        });
        if (error) throw error;
      }
      toast.error('NGO status set to Rejected.');
      fetchNgos();
    } catch (error) {
      toast.error('Failed to reject NGO');
      console.error(error);
    }
  };

  const handleAddNgo = async (e) => {
    e.preventDefault();
    toast.error('Manual registration requires Admin API. Please have the NGO sign up normally.');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied!');
  };

  // Filter Logic
  const filteredNgos = ngos.filter(ngo => {
    const matchesSearch = 
      ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ngo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ngo.wallet_address && ngo.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && ngo.status === activeTab;
  });

  const verifiedCount = ngos.filter(n => n.status === 'verified').length;
  const pendingCount = ngos.filter(n => n.status === 'pending').length;
  const rejectedCount = ngos.filter(n => n.status === 'rejected').length;

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-100">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">NGO Directory</h1>
          <p className="text-zinc-500 font-medium max-w-lg">
            Manage partner organizations, verify credentials, and onboard new NGOs to the decentralized disaster relief network.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="rounded-full px-6 shrink-0 shadow-md hover:shadow-lg">
          <Plus size={18} />
          Manual Registration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Partners', value: ngos.length, icon: Building2, color: 'text-zinc-500' },
          { label: 'Verified', value: verifiedCount, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Pending Review', value: pendingCount, icon: AlertCircle, color: 'text-amber-500' },
          { label: 'Suspended', value: rejectedCount, icon: XCircle, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex flex-col hover:border-zinc-200 transition-colors">
            <stat.icon size={22} className={`${stat.color} mb-3`} />
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between lg:items-center bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <Filter size={16} className="text-zinc-400 ml-2 mr-1 shrink-0" />
          {[
            { id: 'all', label: 'All Organizations' },
            { id: 'verified', label: 'Verified Only' },
            { id: 'pending', label: 'Pending Queue' },
            { id: 'rejected', label: 'Rejected / Suspended' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-black text-white shadow-md' 
                  : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, email, or wallet..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-transparent rounded-full text-sm font-medium focus:outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all" 
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Wallet Address</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredNgos.length > 0 ? filteredNgos.map((ngo) => (
                <tr key={ngo.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div>
                      <Link to={`/manage-ngo/${ngo.id}`} className="text-base font-bold text-black hover:text-primary-600 transition-colors">
                        {ngo.name}
                      </Link>
                      <p className="text-sm text-zinc-500 font-medium mt-0.5">{ngo.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      ngo.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      ngo.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {ngo.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-500">
                        {ngo.wallet_address ? `${ngo.wallet_address.slice(0, 10)}...${ngo.wallet_address.slice(-4)}` : 'Not connected'}
                      </span>
                      {ngo.wallet_address && (
                        <button 
                          onClick={() => copyToClipboard(ngo.wallet_address)}
                          className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Copy Address"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-zinc-500">{ngo.joined}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex gap-2 transition-opacity">
                        {ngo.status !== 'verified' && (
                          <button 
                            onClick={() => handleApprove(ngo.id, ngo.name)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100"
                            title="Verify NGO"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        {ngo.status !== 'rejected' && (
                          <button 
                            onClick={() => handleReject(ngo.id, ngo.name)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                            title="Reject/Suspend NGO"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                      <Link 
                        to={`/manage-ngo/${ngo.id}`}
                        className="ml-2 flex items-center justify-center p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                        title="Manage NGO Details"
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Building2 className="mx-auto text-zinc-300 mb-3" size={40} />
                    <p className="text-base font-bold text-zinc-500">No organizations found matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-black mb-2 text-center">Register NGO</h3>
            <p className="text-center text-sm text-zinc-500 font-medium mb-8">Manually onboard a partner organization to the network.</p>
            
            <form onSubmit={handleAddNgo} className="space-y-6">
              <Input 
                label="Organization Name *" 
                placeholder="e.g. Red Cross International" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <Input 
                label="Contact Email *" 
                type="email"
                placeholder="contact@example.org" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <Input 
                label="Multi-Sig Wallet Address" 
                placeholder="0x..." 
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Mission Description</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all min-h-[100px]"
                  placeholder="Describe the organization's core operations..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              
              <div className="flex gap-4 pt-6">
                <Button variant="secondary" className="flex-grow rounded-full h-14" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-grow rounded-full h-14" type="submit" loading={isSubmitting}>
                  Register NGO
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminNgoManagement;
