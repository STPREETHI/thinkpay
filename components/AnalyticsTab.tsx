
import React, { useMemo, useEffect, useState } from 'react';
import { Transaction, RevenueRecord, Vault } from '../types';
import { getMonthlyInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Award, Zap, Download } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  revenue: RevenueRecord[];
  vaults: Vault[];
  onGenerateStatement: () => void;
}

const AnalyticsTab: React.FC<Props> = ({ transactions, revenue, vaults, onGenerateStatement }) => {
  const [insights, setInsights] = useState<{tips: string[], summary: string, savingsPotential: string} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const res = await getMonthlyInsights(transactions, vaults);
      setInsights(res);
      setLoadingInsights(false);
    };
    if (transactions.length > 0) fetchInsights();
  }, [transactions.length]);

  const barData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStart = new Date(d.setHours(0,0,0,0)).getTime();
      const dayEnd = new Date(d.setHours(23,59,59,999)).getTime();

      const spent = transactions
        .filter(t => t.timestamp >= dayStart && t.timestamp <= dayEnd)
        .reduce((acc, t) => acc + t.amount, 0);
      
      const rev = revenue
        .filter(r => r.timestamp >= dayStart && r.timestamp <= dayEnd)
        .reduce((acc, r) => acc + r.amount, 0);

      return { name: dayStr, spent, rev };
    }).reverse();
    return last7Days;
  }, [transactions, revenue]);

  const pieData = useMemo(() => {
    return vaults.map(v => ({
      name: v.name || v.type,
      value: v.spent
    })).filter(v => v.value > 0);
  }, [vaults]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Financial Pulse</h2>
        <button 
          onClick={onGenerateStatement}
          className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
        >
          <Download size={14} /> Statement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Added explicit height and min-width to fix Recharts warnings */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[300px] min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cash Flow (Last 7 Days)</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="spent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Spent" />
                <Bar dataKey="rev" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center min-w-0 min-h-[200px]">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Vault Distribution</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '10px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white flex flex-col justify-between">
            <div>
              <Award className="text-indigo-200 mb-2" size={24} />
              <p className="text-[10px] font-black text-indigo-200 uppercase">Saving Score</p>
              <h4 className="text-3xl font-black">84%</h4>
            </div>
            <p className="text-[10px] text-indigo-100 italic leading-tight">Excellent progress on Bills vault this month!</p>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100}/></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="text-indigo-400" size={20} />
              <h3 className="text-xl font-black">AI Smart Insights</h3>
            </div>
            {loadingInsights ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {insights?.summary || "Analyzing your spending patterns to optimize your budget..."}
                </p>
                <div className="space-y-2">
                  {insights?.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl">
                      <TrendingUp className="text-emerald-400 shrink-0 mt-1" size={16} />
                      <p className="text-xs font-bold text-slate-200">{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Potential Savings</p>
                  <p className="text-2xl font-black text-indigo-400">{insights?.savingsPotential}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
