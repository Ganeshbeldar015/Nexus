import React, { useState, useEffect } from 'react';
import { mockDb } from '../services/mockDb';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Users, BarChart3, AlertCircle, Check, X, Search } from 'lucide-react';
import Button from '../components/Button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [ngos, setNgos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch Campaigns for stats
      const { data: campaignData } = await supabase.from('campaigns').select('raised_amount');
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

  const filteredNgos = ngos.filter(ngo => 
    (ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    ngo.status === 'pending'
  );

  const totalRaised = campaigns.reduce((acc, c) => acc + parseFloat(c.raised_amount), 0);

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
