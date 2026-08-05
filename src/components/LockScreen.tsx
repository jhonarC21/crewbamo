import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { Lock, Unlock, Users, Clock, ShieldAlert, Key, UserCheck, Delete } from 'lucide-react';

interface LockScreenProps {
  users: AppUser[];
  onUnlock: (user: AppUser) => void;
  initialUser: AppUser | null;
  companyLogo?: string;
}

export default function LockScreen({ users, onUnlock, initialUser, companyLogo }: LockScreenProps) {
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(initialUser || users[0] || null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [time, setTime] = useState<Date>(new Date());
  const [shake, setShake] = useState<boolean>(false);

  // Sync initial user if it loads after mount
  useEffect(() => {
    if (initialUser) {
      setSelectedUser(initialUser);
    } else if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [initialUser, users]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle standard keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser]);

  const handleNumberPress = (num: string) => {
    setError('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto-validate once 4 digits are completed
      if (nextPin.length === 4) {
        // Debounce slightly to let the last dot fill in visually
        setTimeout(() => {
          validatePin(nextPin);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setError('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const validatePin = (pinToValidate: string) => {
    if (!selectedUser) return;
    
    if (pinToValidate === selectedUser.pin) {
      onUnlock(selectedUser);
    } else {
      setError('PIN incorrecto. Intente de nuevo.');
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError('Por favor, ingrese un PIN de 4 dígitos.');
      return;
    }
    validatePin(pin);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 flex flex-col justify-between p-6 select-none relative overflow-hidden">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-950/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Info */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          {companyLogo ? (
            <div className="w-10 h-10 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-1 shadow-md">
              <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-base text-white shadow-lg shadow-blue-900/30">
              B
            </div>
          )}
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-400">BAMO CONTROL</h2>
            <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Terminal Protegida</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-right bg-slate-950/60 border border-slate-900 px-4 py-1.5 rounded-xl backdrop-blur-md">
          <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
          <div className="text-xs font-mono">
            <p className="font-bold text-slate-100">
              {time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
              {time.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Lock Interface Container */}
      <div className="w-full max-w-md mx-auto my-auto z-10 flex flex-col items-center">
        
        {/* Lock Icon Badge */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-xl shadow-black/60 overflow-hidden p-1.5">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo Central" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Lock className="w-7 h-7 text-blue-500 animate-pulse" />
            )}
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold">
            SSL
          </span>
        </div>

        {/* Title / Status */}
        <div className="text-center mb-6 space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Terminal Bloqueada</h1>
          <p className="text-xs text-slate-400 font-medium">Seleccione su usuario e ingrese su PIN de acceso para continuar</p>
        </div>

        {/* Glassmorphic Lock Card */}
        <div className={`w-full bg-slate-950/50 border border-slate-800/85 backdrop-blur-xl rounded-2xl shadow-2xl p-6 space-y-6 transition-all duration-300 ${
          shake ? 'animate-bounce border-rose-500/50 shadow-rose-950/20' : ''
        }`}>
          
          {/* User selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Usuario Activo</label>
            <div className="grid grid-cols-2 gap-2">
              {users.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setError('');
                    }}
                    type="button"
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-950/50 border-blue-500 text-white shadow-lg shadow-blue-950/30' 
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      isSelected 
                        ? 'bg-blue-500 text-slate-950' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-bold leading-none truncate">{u.name}</p>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                        {u.role === 'admin' ? '👑 Admin' : '🛠️ Operador'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Dots display */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="flex items-center justify-center gap-4 h-12">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border transition-all duration-150 ${
                      isFilled
                        ? 'bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/50'
                        : 'bg-slate-950 border-slate-700 scale-100'
                    }`}
                  />
                );
              })}
            </div>

            {error ? (
              <p className="text-[11px] text-rose-400 font-semibold bg-rose-950/20 px-3 py-1 rounded-full border border-rose-900/30 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>{error}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                {selectedUser ? `Ingresando como ${selectedUser.name}` : 'Seleccione un usuario'}
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberPress(num)}
                type="button"
                className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center border border-slate-800/80 hover:border-slate-700 active:scale-90 transition-all cursor-pointer shadow-md select-none"
              >
                {num}
              </button>
            ))}
            
            {/* Clear Button */}
            <button
              onClick={handleClear}
              type="button"
              className="w-14 h-14 rounded-full bg-slate-950 hover:bg-slate-900/60 text-slate-500 hover:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-900/60 active:scale-95 transition-all cursor-pointer select-none"
            >
              C
            </button>
            
            {/* Zero Button */}
            <button
              onClick={() => handleNumberPress('0')}
              type="button"
              className="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg flex items-center justify-center border border-slate-800/80 hover:border-slate-700 active:scale-90 transition-all cursor-pointer shadow-md select-none"
            >
              0
            </button>
            
            {/* Delete / Backspace Button */}
            <button
              onClick={handleDelete}
              type="button"
              className="w-14 h-14 rounded-full bg-slate-950 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 font-bold text-xs flex items-center justify-center border border-slate-900/60 active:scale-95 transition-all cursor-pointer select-none"
              title="Borrar dígito"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Demo Credential Assistant */}
        <div className="mt-8 bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 text-center max-w-sm backdrop-blur-md">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
            <Key className="w-3 h-3" />
            <span>Credenciales Demo para Pruebas</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans">
            <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900/40">
              <span className="text-white font-semibold block">Administrador</span>
              PIN: <strong className="text-emerald-400 font-mono">1234</strong>
            </div>
            <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900/40">
              <span className="text-white font-semibold block">Operador</span>
              PIN: <strong className="text-emerald-400 font-mono">0000</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="w-full text-center z-10">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          Terminal Protegida por PIN • Bamo Control de Estacionamiento v2.4
        </p>
      </div>

    </div>
  );
}
