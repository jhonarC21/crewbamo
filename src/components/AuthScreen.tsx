import React, { useState } from 'react';
import { authService, isFirebaseConfigured } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, WifiOff, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.loginWithGoogle();
      if (result.success && result.user) {
        setSuccess('¡Sesión iniciada correctamente con Google!');
        setTimeout(() => {
          onAuthSuccess(result.user);
        }, 600);
      } else {
        setError(result.error || 'No se pudo completar el inicio de sesión con Google.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Background gradients for ambient effect */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-950/10 blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Sistema Inteligente de Estacionamientos</span>
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-2">
            <span>PARK</span>
            <span className="text-indigo-500 font-medium">FLOW</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Gestión inteligente de estacionamientos y lavado en la nube
          </p>
        </div>

        {/* Database Status Alert */}
        <div className="mb-6">
          {isFirebaseConfigured ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 text-xs text-indigo-300">
              <Cloud className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold text-indigo-200 block">Nube de Firebase Activa (admpark)</span>
                Autenticación en tiempo real mediante Google Sign-In.
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-200 block">Modo Local Activo</span>
                No se detectaron API Keys de Firebase. La app correrá en modo demostración local.
              </div>
            </div>
          )}
        </div>

        {/* Main Google Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Acceso Seguro al Panel</h2>
            <p className="text-xs text-slate-400 mt-1">
              Inicia sesión con tu cuenta oficial de Google para ingresar
            </p>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-3.5 bg-red-950/40 border border-red-900/50 text-red-300 text-xs rounded-xl font-medium flex items-start gap-2"
              >
                <span className="shrink-0">⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2"
              >
                <span className="shrink-0">🎉</span>
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-60 text-slate-800 font-bold text-xs uppercase tracking-wider transition-all shadow-xl hover:shadow-2xl cursor-pointer flex items-center justify-center gap-3 border border-slate-200 group"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-700">Autenticando con Google...</span>
              </>
            ) : (
              <>
                {/* Official Google Color Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-slate-900 font-extrabold tracking-wide">Iniciar Sesión con Google</span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-slate-700 transition-colors" />
              </>
            )}
          </button>

          {/* Footer details */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 text-center text-[11px] text-slate-500 font-medium space-y-1">
            <p>🔒 Autenticación rápida y segura respaldada por Google Provider.</p>
            <p className="text-[10px] text-slate-600">
              Tus datos de estacionamiento y servicios se sincronizan automáticamente en tu cuenta.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
