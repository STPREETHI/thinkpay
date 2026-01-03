
import React, { useState, useMemo, useEffect } from 'react';
import { Vault, AICategorization, VaultType } from '../types';
import { detectCategory } from '../services/geminiService';
import { Search, Check, AlertTriangle, Smartphone, Globe, ChevronRight, Zap, Plus, X, Sparkles, Loader2, ShieldAlert, Lock, Info, Landmark, TrendingUp, AlertOctagon } from 'lucide-react';

interface Props {
  vaults: Vault[];
  currentBalance: number; // Spendable Balance (Planned pool)
  actualCashBalance: number; // Total physical account balance
  emergencyVaultId?: string; // Optional: If provided, bypass allocation steps
  onComplete: (amount: number, merchant: string, allocations: { vaultId: string; amount: number }[], category: string, gateway: 'Razorpay' | 'Stripe') => void;
  onCancel: () => void;
}

const PaymentFlow: React.FC<Props> = ({ vaults, currentBalance, actualCashBalance, emergencyVaultId: initialEmergencyVaultId, onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [loading, setLoading] = useState(false);
  const [instantLoadingMessage, setInstantLoadingMessage] = useState('');
  const [aiResult, setAiResult] = useState<AICategorization | null>(null);
  const [allocations, setAllocations] = useState<{ vaultId: string; amount: number }[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<'Razorpay' | 'Stripe' | null>(null);
  const [isSOSFlow, setIsSOSFlow] = useState(!!initialEmergencyVaultId);

  const amountNum = parseFloat(amount || '0');
  const emergencyVault = vaults.find(v => v.type === VaultType.EMERGENCY);

  // Auto-allocate if in SOS mode
  useEffect(() => {
    if ((isSOSFlow || initialEmergencyVaultId) && amountNum > 0 && emergencyVault) {
      setAllocations([{ vaultId: emergencyVault.id, amount: amountNum }]);
    }
  }, [isSOSFlow, initialEmergencyVaultId, amountNum, emergencyVault]);

  const totalAllocated = useMemo(() => allocations.reduce((acc, a) => acc + a.amount, 0), [allocations]);
  const remaining = amountNum - totalAllocated;
  const isFullyAllocated = Math.abs(remaining) < 0.01 && amountNum > 0;
  
  const exceedsSpendable = amountNum > currentBalance;
  const exceedsAbsoluteCash = amountNum > actualCashBalance;

  const handleStartAI = async () => {
    if (!amount || !merchant || exceedsAbsoluteCash) return;
    setLoading(true);
    const result = await detectCategory(merchant, amountNum);
    setAiResult(result);
    
    const recommended = vaults.find(v => v.type === result.suggestedVault && !v.isLocked);
    if (recommended) {
      setAllocations([{ vaultId: recommended.id, amount: amountNum }]);
    } else {
      const firstUnlocked = vaults.find(v => !v.isLocked);
      if (firstUnlocked) setAllocations([{ vaultId: firstUnlocked.id, amount: amountNum }]);
    }
    setLoading(false);
    setStep(2);
  }

  const handleNextStep = () => {
    if (isSOSFlow) {
      setStep(3); // Skip allocation for emergency
    } else {
      handleStartAI();
    }
  }

  const handleInstantPay = async (forceSOS = false) => {
    if (!amount || !merchant || exceedsAbsoluteCash) return;
    
    const useEmergency = forceSOS || isSOSFlow;
    
    setLoading(true);
    setInstantLoadingMessage(useEmergency ? 'Authorizing SOS Reserve Release...' : 'Analyzing Smart Isolation...');
    
    try {
      let finalAllocations: { vaultId: string; amount: number }[] = [];
      let category = 'General';

      if (useEmergency) {
        if (!emergencyVault) throw new Error("No Emergency Vault found");
        finalAllocations = [{ vaultId: emergencyVault.id, amount: amountNum }];
        category = 'Emergency';
      } else {
        const result = await detectCategory(merchant, amountNum);
        category = result.category;
        const targetVault = vaults.find(v => v.type === result.suggestedVault && !v.isLocked) || vaults.find(v => !v.isLocked);
        if (!targetVault) {
          alert("Action Denied: All funding partitions are locked.");
          setLoading(false);
          return;
        }
        finalAllocations = [{ vaultId: targetVault.id, amount: amountNum }];
      }

      await new Promise(r => setTimeout(r, 1000));
      onComplete(amountNum, merchant, finalAllocations, category, 'Razorpay');
    } catch (e) {
      setLoading(false);
      setStep(useEmergency ? 3 : 2);
    }
  };

  const updateAllocationAmount = (vaultId: string, value: string) => {
    const amt = parseFloat(value) || 0;
    setAllocations(prev => prev.map(a => a.vaultId === vaultId ? { ...a, amount: amt } : a));
  };

  const removeAllocation = (vaultId: string) => {
    setAllocations(prev => prev.filter(a => a.vaultId !== vaultId));
  };

  const addAllocation = (vaultId: string) => {
    if (allocations.find(a => a.vaultId === vaultId)) return;
    setAllocations(prev => [...prev, { vaultId, amount: 0 }]);
  };

  const handleProcessPayment = () => {
    if (!selectedGateway || !isFullyAllocated) return;
    setLoading(true);
    setTimeout(() => {
        onComplete(amountNum, merchant, allocations, isSOSFlow ? 'Emergency' : (aiResult?.category || 'General'), selectedGateway);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[100] flex items-end sm:items-center justify-center p-4">
      <div className={`bg-white w-full max-w-lg rounded-t-[3.5rem] sm:rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-8 ${isSOSFlow ? 'border-red-600' : 'border-indigo-600'}`}>
        
        {loading && (
          <div className="absolute inset-0 bg-white/95 z-[110] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className={`w-20 h-20 border-4 ${isSOSFlow ? 'border-red-600' : 'border-indigo-600'} border-t-transparent rounded-full animate-spin`} />
              {isSOSFlow ? <AlertOctagon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 animate-pulse" size={24} /> : <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />}
            </div>
            <p className="font-black text-slate-800 text-xl text-center px-10">{instantLoadingMessage || 'Authorizing Secure Payment...'}</p>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {isSOSFlow && <div className="p-2 bg-red-100 text-red-600 rounded-xl"><AlertOctagon size={20}/></div>}
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{isSOSFlow ? 'Emergency SOS Pay' : 'Transaction'}</h2>
                </div>
                <button onClick={onCancel} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-800"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${exceedsAbsoluteCash ? 'border-red-500 bg-red-50' : isSOSFlow ? 'border-red-600 bg-red-50/30' : exceedsSpendable ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-100' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay</label>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black ${isSOSFlow ? 'text-red-600' : 'text-indigo-600'} bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100`}>Liquidity: ₹{actualCashBalance.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-4xl font-black mr-2 ${exceedsAbsoluteCash ? 'text-red-400' : isSOSFlow ? 'text-red-400' : exceedsSpendable ? 'text-amber-400' : 'text-slate-300'}`}>₹</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full text-6xl font-black bg-transparent border-none focus:ring-0 ${exceedsAbsoluteCash ? 'text-red-600' : isSOSFlow ? 'text-red-600' : exceedsSpendable ? 'text-amber-600' : 'text-slate-900'}`}
                      placeholder="0"
                      autoFocus
                    />
                  </div>

                  {exceedsAbsoluteCash ? (
                    <div className="flex items-center gap-2 text-red-600 mt-6 animate-shake">
                      <ShieldAlert size={16} />
                      <p className="text-[10px] font-black uppercase">Insufficient Liquidity</p>
                    </div>
                  ) : isSOSFlow ? (
                    <div className="flex items-center gap-2 text-red-600 mt-6">
                      <TrendingUp size={16} />
                      <p className="text-[10px] font-black uppercase tracking-tight">Pulling from Emergency Fund</p>
                    </div>
                  ) : exceedsSpendable ? (
                    <div className="bg-white/60 p-4 rounded-2xl mt-6 space-y-2 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle size={16} />
                            <p className="text-[10px] font-black uppercase tracking-tight">Dipping into Reserves</p>
                        </div>
                    </div>
                  ) : amountNum > 0 && (
                    <div className="flex items-center gap-2 text-emerald-600 mt-6">
                      <Check size={16} />
                      <p className="text-[10px] font-black uppercase">Within Smart Pool</p>
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isSOSFlow ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`} size={20} />
                  <input 
                    type="text" 
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className={`w-full p-6 pl-14 rounded-3xl bg-slate-50 border-none focus:ring-2 font-bold text-lg ${isSOSFlow ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
                    placeholder="Merchant Name"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-3">
                    <button 
                      disabled={!amount || !merchant || loading || exceedsAbsoluteCash} 
                      onClick={() => handleInstantPay(false)} 
                      className={`w-full bg-indigo-600 text-white p-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50`}
                    >
                      <Zap size={24} />
                      SECURE INSTANT PAY
                    </button>
                    
                    {!isSOSFlow && (
                        <button 
                          disabled={!amount || !merchant || loading || exceedsAbsoluteCash} 
                          onClick={() => handleInstantPay(true)} 
                          className={`w-full bg-red-600 text-white p-5 rounded-[2.5rem] font-black text-[12px] flex items-center justify-center gap-3 shadow-2xl shadow-red-200 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest`}
                        >
                          <AlertOctagon size={18} />
                          SOS Emergency Fund Pay
                        </button>
                    )}
                </div>

                <button 
                  disabled={!amount || !merchant || loading || exceedsAbsoluteCash} 
                  onClick={handleNextStep} 
                  className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {isSOSFlow ? 'Confirm Gateway' : 'Detailed Split Allocation'} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && !isSOSFlow && (
            <div className="space-y-8 animate-in slide-in-from-right-10 duration-300">
               <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-800">Partition Selection</h3>
                  <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase ${remaining > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    To Assign: ₹{remaining.toLocaleString()}
                  </div>
               </div>

               <div className="space-y-4">
                  {allocations.map((alloc) => {
                    const v = vaults.find(vault => vault.id === alloc.vaultId);
                    const vRemaining = v ? (v.limit - v.spent) : 0;
                    const isOver = alloc.amount > vRemaining && v?.type !== VaultType.CUSTOM;

                    return (
                      <div key={alloc.vaultId} className={`p-5 rounded-3xl border-2 flex flex-col gap-4 ${isOver ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{v?.type}</p>
                            <p className="font-bold text-slate-800">{v?.name || v?.type}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-300">₹</span>
                            <input 
                              type="number"
                              value={alloc.amount}
                              onChange={(e) => updateAllocationAmount(alloc.vaultId, e.target.value)}
                              className="w-24 p-3 bg-white border border-slate-200 rounded-2xl font-black text-right focus:ring-2 focus:ring-indigo-500"
                            />
                            <button onClick={() => removeAllocation(alloc.vaultId)} className="text-slate-300 hover:text-red-500"><X size={20}/></button>
                          </div>
                        </div>
                        {isOver && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase">
                            <TrendingUp size={12}/>
                            <span>Exceeding monthly partition</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-6 border-t border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Unlocked Sources</p>
                     <div className="grid grid-cols-2 gap-3">
                        {vaults.filter(v => !v.isLocked && !allocations.find(a => a.vaultId === v.id)).map(v => (
                          <button key={v.id} onClick={() => addAllocation(v.id)} className="p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 font-black uppercase text-[9px]">
                            <Plus size={14}/> {v.name || v.type}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(1)} className="flex-1 p-5 rounded-2xl font-black text-slate-400 uppercase text-[10px] tracking-widest">Back</button>
                  <button 
                    disabled={!isFullyAllocated} 
                    onClick={() => setStep(3)}
                    className="flex-[2] bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl"
                  >
                    Confirm & Proceed
                  </button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 animate-in zoom-in duration-300">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Gateway Select</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select payment method</p>
              </div>

              {isSOSFlow && (
                  <div className="p-6 bg-red-100 border border-red-200 rounded-[2.5rem] flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><AlertOctagon size={24}/></div>
                      <div>
                          <p className="text-xs font-black text-red-900 uppercase">Emergency SOS Pay</p>
                          <p className="text-[10px] text-red-700 font-bold">Reserves will be depleted by ₹{amountNum.toLocaleString()}</p>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => setSelectedGateway('Razorpay')} className={`p-8 rounded-[3rem] border-2 transition-all flex items-center justify-between ${selectedGateway === 'Razorpay' ? 'border-blue-600 bg-blue-50 shadow-inner' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg"><Smartphone size={32}/></div>
                    <div><p className="font-black text-blue-900 text-xl">Razorpay</p><p className="text-[10px] font-black text-blue-400 uppercase">UPI & Cards</p></div>
                  </div>
                  {selectedGateway === 'Razorpay' && <div className="bg-blue-600 p-1 rounded-full"><Check size={18} className="text-white"/></div>}
                </button>
                <button onClick={() => setSelectedGateway('Stripe')} className={`p-8 rounded-[3rem] border-2 transition-all flex items-center justify-between ${selectedGateway === 'Stripe' ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-5 text-left">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg"><Globe size={32}/></div>
                    <div><p className="font-black text-indigo-900 text-xl">Stripe</p><p className="text-[10px] font-black text-indigo-400 uppercase">Global Payments</p></div>
                  </div>
                  {selectedGateway === 'Stripe' && <div className="bg-indigo-600 p-1 rounded-full"><Check size={18} className="text-white"/></div>}
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(isSOSFlow ? 1 : 2)} className="flex-1 p-6 rounded-3xl font-black text-slate-400 uppercase text-[10px] tracking-widest">Back</button>
                <button 
                  disabled={!selectedGateway} 
                  onClick={handleProcessPayment}
                  className={`flex-[2] ${isSOSFlow ? 'bg-red-600 shadow-red-200' : 'bg-slate-900'} text-white p-7 rounded-[2.5rem] font-black uppercase tracking-widest text-[12px] shadow-2xl active:scale-95 transition-all`}
                >
                  Confirm ₹{amountNum.toLocaleString()}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentFlow;
