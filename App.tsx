
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import VaultCard from './components/VaultCard';
import PaymentFlow from './components/PaymentFlow';
import AnalyticsTab from './components/AnalyticsTab';
import { db } from './services/db';
import { Vault, Transaction, Autopay, Notification, User, VaultType, RevenueRecord } from './types';
import { LogOut, User as UserIcon, Calendar, ArrowUpRight, Zap, Shield, Plus, X, Search, Filter, History, Landmark, DollarSign, Settings, TrendingUp, BellRing, CheckCircle2, Lock, Unlock, ShieldAlert, Fingerprint, Info, Smartphone, Wallet, AlertTriangle, AlertOctagon, MoreHorizontal, Globe, Mail, Clock, ShieldCheck, CreditCard, Eye, EyeOff, Settings2, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPaying, setIsPaying] = useState(false);
  const [isEmergencyPaying, setIsEmergencyPaying] = useState(false);
  
  // Auth State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigError, setIsConfigError] = useState(false);

  // Security UI State
  const [unlockingVaultId, setUnlockingVaultId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const unsubscribe = db.onAuthChange(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await db.getUserProfile(fbUser.uid);
          if (profile) {
            setUser(profile);
            await loadCloudData(fbUser.uid);
            setIsConfigError(false);
          } else {
            // Profile exists in Auth but not in Firestore - likely a permission/init issue
            setIsConfigError(true);
          }
        } catch (e: any) {
          console.error("Critical Data Error:", e);
          if (e.message?.includes('permission') || e.code === 'permission-denied') {
            setAuthError("Firestore Access Denied: Check Security Rules");
            setIsConfigError(true);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadCloudData = async (uid: string) => {
    try {
      const [v, tx, n] = await Promise.all([
        db.getVaults(uid),
        db.getTransactions(uid),
        db.getNotifications(uid)
      ]);
      setVaults(v);
      setTransactions(tx);
      setNotifications(n);
    } catch (e: any) {
      console.error("Cloud Sync Error:", e);
      if (e.message?.includes('permission')) setIsConfigError(true);
    }
  };

  const totalSpent = useMemo(() => vaults.reduce((acc, v) => acc + v.spent, 0), [vaults]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const reservedFunds = useMemo(() => 
    vaults.filter(v => v.isLocked).reduce((acc, v) => acc + Math.max(0, v.limit - v.spent), 0),
  [vaults]);

  const spendableBalance = useMemo(() => {
    if (!user) return 0;
    return Math.max(0, user.currentBalance - reservedFunds);
  }, [user, reservedFunds]);

  const pushLocalNotif = async (title: string, message: string, priority: 'high' | 'normal' = 'normal') => {
    const fbUser = db.getCurrentAuthUser();
    if (!fbUser) return;
    const newNotif = await db.pushNotification(fbUser.uid, { title, message, priority });
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsConfigError(false);
    
    const email = loginEmail.trim();
    const password = loginPassword;
    const username = loginUsername.trim();

    if (!email || !email.includes('@')) {
      setAuthError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be 6+ characters");
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        if (!username) throw new Error("Display Name is required");
        await db.registerUser(username, email, password);
      } else {
        await db.verifyUser(email, password);
      }
    } catch (e: any) {
      console.error("Detailed Auth Exception:", e);
      let msg = "Authentication failed";
      
      if (e.code === 'auth/invalid-credential') {
        msg = "Invalid credentials OR Email/Password provider is disabled in Firebase Console.";
        setIsConfigError(true);
      }
      else if (e.code === 'auth/user-not-found') msg = "User ID not found. Try Registering.";
      else if (e.code === 'auth/email-already-in-use') msg = "This email is already registered.";
      else if (e.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is disabled in Firebase Console.";
        setIsConfigError(true);
      }
      else if (e.message?.includes('permissions')) {
        msg = "Permission Denied: Check Firestore Security Rules.";
        setIsConfigError(true);
      }
      else msg = e.message;
      
      setAuthError(msg);
      setLoading(false);
    }
  };

  const handleToggleVaultLock = async (id: string) => {
    const vault = vaults.find(v => v.id === id);
    if (!vault) return;

    const fbUser = db.getCurrentAuthUser();
    if (!fbUser) return;

    if (!vault.isLocked) {
      const updatedVaults = vaults.map(v => v.id === id ? { ...v, isLocked: true } : v);
      setVaults(updatedVaults);
      await db.setVaults(fbUser.uid, updatedVaults);
      pushLocalNotif("Vault Secured", `${vault.name || vault.type} unit has been isolated and frozen.`);
    } else {
      if (vault.pin) {
        setUnlockingVaultId(id);
        setPinInput('');
        setPinError(false);
      } else {
        const updatedVaults = vaults.map(v => v.id === id ? { ...v, isLocked: false } : v);
        setVaults(updatedVaults);
        await db.setVaults(fbUser.uid, updatedVaults);
      }
    }
  };

  const verifyUnlock = async () => {
    const vault = vaults.find(v => v.id === unlockingVaultId);
    if (!vault) return;

    if (pinInput === vault.pin) {
      const fbUser = db.getCurrentAuthUser();
      if (!fbUser) return;

      const updatedVaults = vaults.map(v => v.id === unlockingVaultId ? { ...v, isLocked: false } : v);
      setVaults(updatedVaults);
      await db.setVaults(fbUser.uid, updatedVaults);
      
      setUnlockingVaultId(null);
      setPinInput('');
      setPinError(false);
      pushLocalNotif("Auth Verified", `${vault.name || vault.type} is now liquid.`);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handlePaymentComplete = async (amount: number, merchant: string, allocations: { vaultId: string; amount: number }[], category: string, gateway: 'Razorpay' | 'Stripe') => {
    const fbUser = db.getCurrentAuthUser();
    if (!fbUser || !user) return;

    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      merchant,
      category,
      vaultAllocations: allocations,
      timestamp: Date.now(),
      status: 'completed',
      gateway
    };

    const updatedVaults = vaults.map(v => {
      const alloc = allocations.find(a => a.vaultId === v.id);
      return alloc ? { ...v, spent: v.spent + alloc.amount } : v;
    });

    const newBalance = user.currentBalance - amount;
    const updatedUser = { ...user, currentBalance: newBalance };

    setVaults(updatedVaults);
    setTransactions(prev => [newTx, ...prev]);
    setUser(updatedUser);
    setIsPaying(false);
    setIsEmergencyPaying(false);

    try {
      await Promise.all([
        db.addTransaction(fbUser.uid, newTx),
        db.setVaults(fbUser.uid, updatedVaults),
        db.updateUserProfile(fbUser.uid, { currentBalance: newBalance })
      ]);
      
      pushLocalNotif(
        "Payment Authorized", 
        `Successfully transferred ₹${amount.toLocaleString()} to ${merchant}.`,
        amount > 10000 ? 'high' : 'normal'
      );
    } catch (e) {
      console.error("Payment persistence failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Synchronizing Cloud Link</p>
      </div>
    );
  }

  if (!user || isConfigError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-12"><Zap className="text-white" size={40} /></div>
            <h1 className="text-4xl font-black text-white tracking-tighter">ThinkPay</h1>
          </div>
          
          <div className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700/50 backdrop-blur-3xl space-y-8 shadow-2xl relative overflow-hidden">
            {isConfigError ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-amber-500">
                    <Settings2 size={24} />
                    <h2 className="font-black uppercase text-xs tracking-widest">Firebase Config Required</h2>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-[11px] text-slate-300 font-bold leading-tight">
                      <div className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</div>
                      <span>Enable <b>Email/Password</b> in Firebase Console &gt; Authentication &gt; Sign-in Method.</span>
                    </li>
                    <li className="flex gap-3 text-[11px] text-slate-300 font-bold leading-tight">
                      <div className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</div>
                      <span>Publish <b>Firestore Rules</b> to allow read/write on the 'users' collection.</span>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="w-full bg-slate-700 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-600 transition-all">
                    Open Firebase Console <ExternalLink size={14} />
                  </a>
                  <button onClick={() => { setIsConfigError(false); setAuthError(null); db.logout(); }} className="w-full text-indigo-400 font-black uppercase text-[10px] tracking-widest py-2">
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-6">
                {isRegistering && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Display Name</label>
                    <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="Username" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 pl-12 text-white font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="email@thinkpay.ai" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Security Pass</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 pl-12 pr-12 text-white font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                {authError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 animate-shake">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter leading-tight">{authError}</p>
                  </div>
                )}
                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">{isRegistering ? 'Initialize' : 'Secure Entry'}</button>
                <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(null); }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:text-indigo-400 transition-colors">
                  {isRegistering ? 'Already have an ID? Login' : 'New User? Initialize Vault'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const budgetProgress = (totalSpent / user.totalBudget) * 100;

  return (
    <Layout 
      activeTab={activeTab === 'analytics' ? 'analytics' : activeTab === 'pay' ? 'dashboard' : activeTab} 
      onTabChange={(t) => {
        if (t === 'pay') setIsPaying(true);
        else if (t === 'notifs') { 
            const fbUser = db.getCurrentAuthUser();
            if (fbUser) db.markNotificationsRead(fbUser.uid, notifications.map(n => n.id));
            setNotifications(prev => prev.map(n => ({...n, read: true}))); 
            setActiveTab(t); 
        }
        else setActiveTab(t);
      }} 
      notifCount={unreadCount}
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-10 py-6 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 text-white p-10 rounded-[4rem] shadow-3xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Smart Spendable Pool</p>
                <h2 className="text-6xl font-black tracking-tighter">₹{spendableBalance.toLocaleString()}</h2>
                <div className="flex items-center gap-3 pt-3">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
                    <Wallet size={12} className="text-indigo-300" />
                    <span className="text-[10px] font-bold">Total Cash: ₹{user.currentBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsPaying(true)} className="flex flex-col items-center justify-center gap-2 p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all">
                  <Zap size={24} className="text-indigo-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">Instant Pay</span>
                </button>
                <button onClick={() => setIsEmergencyPaying(true)} className="flex flex-col items-center justify-center gap-2 p-5 bg-red-600/20 border border-red-500/30 rounded-3xl hover:bg-red-600/40 transition-all">
                  <AlertOctagon size={24} className="text-red-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-100">SOS Pay</span>
                </button>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full transition-all duration-1000 ${budgetProgress > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Isolation Units</h3>
              <button onClick={() => setActiveTab('vaults')} className="text-indigo-600 text-xs font-black uppercase">View All</button>
            </div>
            <div className="grid grid-cols-1 gap-5">
              {vaults.slice(0, 3).map(v => (
                <VaultCard key={v.id} vault={v} onToggleLock={handleToggleVaultLock} onManageSecurity={() => {}} onBiometricUnlock={() => {}} onUpdateLimit={() => {}} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vaults' && (
        <div className="space-y-8 py-8 animate-in slide-in-from-right-10">
          <h2 className="text-4xl font-black text-slate-800 px-4 tracking-tighter">Vault Control</h2>
          <div className="grid grid-cols-1 gap-5">
            {vaults.map(v => (
              <VaultCard key={v.id} vault={v} onToggleLock={handleToggleVaultLock} onManageSecurity={() => {}} onBiometricUnlock={() => {}} onUpdateLimit={() => {}} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-8 py-8 animate-in slide-in-from-left-10">
          <h2 className="text-4xl font-black text-slate-800 px-4 tracking-tighter">Payment Logs</h2>
          <div className="space-y-4 px-2">
            {transactions.length === 0 ? (
               <div className="p-20 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center"><History size={32}/></div>
                 <p className="text-[10px] font-black uppercase tracking-widest">No transaction records found</p>
               </div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ArrowUpRight size={24}/></div>
                    <div><h4 className="font-black text-slate-800 text-lg">{tx.merchant}</h4><p className="text-[9px] font-black uppercase text-slate-400">{tx.category}</p></div>
                  </div>
                  <div className="text-right"><p className="text-xl font-black">₹{tx.amount.toLocaleString()}</p></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'notifs' && (
        <div className="space-y-6 py-8">
          <h2 className="text-4xl font-black text-slate-800 px-4 tracking-tighter">Security Center</h2>
          <div className="space-y-4 px-2">
            {notifications.map(n => (
              <div key={n.id} className={`p-6 rounded-[2.5rem] border flex items-start gap-5 ${n.priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${n.priority === 'high' ? 'bg-red-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Info size={20}/></div>
                <div><h4 className="font-black text-lg">{n.title}</h4><p className="text-xs font-medium text-slate-500 leading-relaxed">{n.message}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-10 py-10 animate-in slide-in-from-right-10">
          <div className="text-center space-y-4">
            <div className="w-32 h-32 bg-slate-900 rounded-[3rem] flex items-center justify-center text-white mx-auto shadow-2xl"><UserIcon size={64} /></div>
            <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter">{user.username}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.email}</p></div>
          </div>
          <div className="pt-6 px-4">
             <button onClick={() => { db.logout(); window.location.reload(); }} className="w-full bg-red-50 text-red-600 p-6 rounded-[2.5rem] font-black uppercase flex items-center justify-center gap-3 border border-red-100 transition-colors hover:bg-red-100">
               <LogOut size={20}/>
               Terminate Cloud Session
             </button>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && <AnalyticsTab transactions={transactions} revenue={[]} vaults={vaults} onGenerateStatement={() => {}} />}

      {unlockingVaultId && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-3xl z-[200] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 space-y-10 animate-in zoom-in">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Shield size={40} /></div>
              <h3 className="text-3xl font-black tracking-tighter">Authorization</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Identify to unlock funds</p>
            </div>
            <input type="password" maxLength={4} value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(false); }} className={`w-full text-center text-5xl tracking-[0.8em] font-black p-8 bg-slate-50 border-4 rounded-[2.5rem] transition-all focus:ring-8 focus:ring-indigo-100 outline-none ${pinError ? 'border-red-500 animate-shake text-red-600' : 'border-slate-100'}`} placeholder="****" autoFocus />
            <div className="flex gap-4">
              <button onClick={() => setUnlockingVaultId(null)} className="flex-1 p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={verifyUnlock} className="flex-[2] bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {(isPaying || isEmergencyPaying) && (
        <PaymentFlow vaults={vaults} currentBalance={spendableBalance} actualCashBalance={user.currentBalance} emergencyVaultId={isEmergencyPaying ? vaults.find(v => v.type === VaultType.EMERGENCY)?.id : undefined} onCancel={() => { setIsPaying(false); setIsEmergencyPaying(false); }} onComplete={handlePaymentComplete} />
      )}
    </Layout>
  );
};

export default App;
