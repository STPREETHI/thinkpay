
import React, { useState, useEffect } from 'react';
import { Vault, VaultType } from '../types';
import { Lock, Unlock, AlertCircle, Edit2, Check, X, ShieldEllipsis, KeyRound, Fingerprint, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  vault: Vault;
  onToggleLock: (id: string) => void;
  onUpdateLimit: (id: string, newLimit: number) => void;
  onManageSecurity: (id: string) => void;
  onBiometricUnlock: (id: string) => void;
}

const VaultCard: React.FC<Props> = ({ vault, onToggleLock, onUpdateLimit, onManageSecurity, onBiometricUnlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLimit, setTempLimit] = useState(vault.limit.toString());
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  
  const percent = vault.limit > 0 ? (vault.spent / vault.limit) * 100 : 0;
  const isHigh = percent > 85 && percent <= 100;
  const isOverspent = percent > 100;

  useEffect(() => {
    if (window.PublicKeyCredential) {
      if (typeof (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable().then((available: boolean) => {
          setBiometricAvailable(available);
        });
      }
    }
  }, []);

  const handleSave = () => {
    const val = parseFloat(tempLimit);
    if (isNaN(val) || val <= 0) {
      setError("Must be > 0");
      return;
    }
    setError(null);
    onUpdateLimit(vault.id, val);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempLimit(vault.limit.toString());
    setError(null);
    setIsEditing(false);
  };

  const getIcon = (v: Vault) => {
    if (v.icon) return v.icon;
    switch (v.type) {
      case VaultType.LIFESTYLE: return '🎨';
      case VaultType.FOOD: return '🍔';
      case VaultType.EMERGENCY: return '🚨';
      case VaultType.BUSINESS: return '💼';
      case VaultType.BILLS: return '🧾';
      default: return '💰';
    }
  };

  const isEmergency = vault.type === VaultType.EMERGENCY;

  return (
    <div className={`relative p-5 rounded-3xl transition-all border ${vault.isLocked ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'} ${isOverspent ? 'ring-2 ring-red-500 bg-red-50/30' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-3xl ${vault.isLocked && isEmergency ? 'animate-pulse' : ''}`}>{getIcon(vault)}</span>
          <div>
            <h3 className="font-bold text-slate-800">{vault.name || vault.type}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{vault.type} Partition</p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
          {!vault.isLocked && (
            <>
              <button 
                onClick={() => onManageSecurity(vault.id)}
                className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                <ShieldEllipsis size={16} />
              </button>
              <button 
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)} 
                className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}
              >
                {isEditing ? <X size={16} /> : <Edit2 size={16} />}
              </button>
            </>
          )}
          <button 
            onClick={() => onToggleLock(vault.id)}
            className={`p-2 rounded-xl transition-all active:scale-90 ${vault.isLocked ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
          >
            {vault.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end text-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Utilized</p>
            <span className={`font-black ${isOverspent ? 'text-red-600' : 'text-slate-700'}`}>₹{vault.spent.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Monthly Target</p>
            {isEditing ? (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={tempLimit}
                    onChange={(e) => setTempLimit(e.target.value)}
                    className="w-20 p-1 border-b-2 text-right font-black focus:outline-none bg-transparent border-indigo-500 text-slate-900"
                    autoFocus
                  />
                  <button onClick={handleSave} className="text-emerald-500"><Check size={18}/></button>
                </div>
              </div>
            ) : (
              <span className="font-black text-slate-900">₹{vault.limit.toLocaleString()}</span>
            )}
          </div>
        </div>
        
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${isOverspent || isHigh ? 'bg-red-500' : 'bg-indigo-500'}`} 
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        {isOverspent ? (
          <div className="flex items-center gap-1 text-[10px] text-red-600 font-black uppercase bg-red-100 p-2 rounded-lg border border-red-200 animate-pulse">
            <TrendingUp size={12} strokeWidth={3} />
            <span>Quota Exceeded - Overdrawing Reserves</span>
          </div>
        ) : vault.isLocked ? (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-black uppercase italic">
            <Lock size={10} />
            <span>Capital Isolated & Frozen</span>
          </div>
        ) : isHigh && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-black uppercase">
            <AlertCircle size={12} strokeWidth={3} />
            <span>Near Monthly Target</span>
          </div>
        )}
      </div>

      {vault.isLocked && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center cursor-pointer group transition-all hover:bg-white/50">
          <div className="flex flex-col items-center gap-3">
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleLock(vault.id); }}
                className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 transform transition-all hover:scale-105 active:scale-95 ${isEmergency ? 'bg-red-600 text-white animate-bounce' : 'bg-slate-900 text-white'}`}
              >
                <KeyRound size={18} className={isEmergency ? 'text-white' : 'text-indigo-400'} />
                <span className="text-xs font-black uppercase tracking-[0.1em]">{isEmergency ? 'Emergency Release' : 'Unlock Fund'}</span>
              </button>
              
              {vault.biometricEnabled && biometricAvailable && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onBiometricUnlock(vault.id); }}
                  className="bg-indigo-600 text-white p-3 rounded-2xl shadow-2xl transform transition-transform hover:scale-110 active:scale-95"
                >
                  <Fingerprint size={24} />
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultCard;
