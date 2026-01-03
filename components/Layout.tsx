
import React from 'react';
import { Home, PieChart, Calendar, Bell, User, BarChart2, History } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifCount?: number;
}

const Layout: React.FC<Props> = ({ children, activeTab, onTabChange, notifCount = 0 }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 shadow-2xl border-x border-slate-200">
      {/* Top Header */}
      <header className="p-6 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-md z-40">
        <div>
          <h1 className="text-2xl font-black text-indigo-600 tracking-tight">ThinkPay</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intelligent Isolation</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onTabChange('notifs')}
            className={`relative p-3 rounded-2xl bg-white shadow-sm border border-slate-100 transition-all active:scale-90 ${activeTab === 'notifs' ? 'text-indigo-600 ring-2 ring-indigo-100' : 'text-slate-600'}`}
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[6px] text-white font-bold">{notifCount}</span>
            )}
          </button>
          <button onClick={() => onTabChange('profile')} className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-600">
            <User size={20} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 px-6 pb-28 overflow-y-auto custom-scrollbar">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/95 backdrop-blur-lg border-t border-slate-100 px-4 pt-4 pb-6 flex justify-between items-center z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton icon={<Home />} label="Home" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
        <NavButton icon={<BarChart2 />} label="Pulse" active={activeTab === 'analytics'} onClick={() => onTabChange('analytics')} />
        <div className="relative -top-8">
          <button 
            onClick={() => onTabChange('pay')}
            className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200 flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all rotate-45 border-4 border-white"
          >
            <div className="-rotate-45 font-black text-3xl">+</div>
          </button>
        </div>
        <NavButton icon={<PieChart />} label="Vaults" active={activeTab === 'vaults'} onClick={() => onTabChange('vaults')} />
        <NavButton icon={<History />} label="Logs" active={activeTab === 'history'} onClick={() => onTabChange('history')} />
      </nav>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all flex-1 ${active ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
    <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

export default Layout;
