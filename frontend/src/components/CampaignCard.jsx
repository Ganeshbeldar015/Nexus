import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import Button from './Button';
import { getDirectImageUrl } from '../lib/imageHelper';

const CampaignCard = ({ campaign }) => {
  const raisedAmount = campaign.donation_logs 
    ? campaign.donation_logs.reduce((sum, d) => sum + parseFloat(d.amount), 0) 
    : parseFloat(campaign.raised_amount || 0);
  const progress = Math.min((raisedAmount / campaign.goal_amount) * 100, 100);

  return (
    <div className="bg-zinc-950 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl hover:border-white/20 transition-all duration-300 group flex flex-col">
      <div className="relative h-56 overflow-hidden bg-black/50">
        <img 
          src={getDirectImageUrl(campaign.image_url)} 
          alt={campaign.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-white shadow-sm uppercase tracking-widest">
            Active
          </span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-zinc-300 transition-colors">
          {campaign.title}
        </h3>
        <p className="text-zinc-300 text-sm line-clamp-2 mb-6">
          {campaign.description}
        </p>
        
        <div className="mt-auto space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-zinc-500">Progress</span>
              <span className="text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-end pt-2">
              <div>
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Raised</span>
                <span className="text-lg font-black text-white">${raisedAmount.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Goal</span>
                <span className="text-sm font-bold text-zinc-300">${campaign.goal_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <Link to={`/campaign/${campaign.id}`} className="block pt-2">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 rounded-xl text-sm font-bold transition-all">
              View Details
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
