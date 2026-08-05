import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  Globe, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Zap,
  Radio
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  updateSupabaseConfig, 
  resetSupabaseConfig, 
  SUPABASE_SQL_SCHEMA, 
  supabase, 
  isSupabaseConfigured 
} from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SupabaseConfigModal({ isOpen, onClose, onSuccess }: SupabaseConfigModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.supabaseUrl);
      setAnonKey(cfg.supabaseAnonKey);
      setStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatus('error');
      setStatusMessage('Ingresa tanto la URL como la Anon Key de Supabase.');
      return;
    }

    setStatus('testing');
    setStatusMessage('Probando conexión en tiempo real con Supabase...');

    try {
      const configured = updateSupabaseConfig(url, anonKey);
      if (!configured || !supabase) {
        setStatus('error');
        setStatusMessage('Error al inicializar el cliente de Supabase. Verifica el formato de la URL.');
        return;
      }

      // Probar lectura simple
      const { error } = await supabase.from('app_data').select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          // Tabla no existe
          setStatus('success');
          setStatusMessage('¡Conectado exitosamente con Supabase! Recuerda ejecutar el script SQL abajo para crear la tabla app_data.');
        } else {
          setStatus('error');
          setStatusMessage(`Respuesta de Supabase: ${error.message}`);
        }
      } else {
        setStatus('success');
        setStatusMessage('¡Conexión y tabla app_data verificadas con éxito! Los datos ahora se sincronizan en tiempo real.');
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setStatusMessage(err?.message || 'Error inesperado al conectar con Supabase.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleReset = () => {
    resetSupabaseConfig();
    const cfg = getSupabaseConfig();
    setUrl(cfg.supabaseUrl);
    setAnonKey(cfg.supabaseAnonKey);
    setStatus('idle');
    setStatusMessage('Configuración restablecida a valores iniciales.');
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Conectar con Supabase
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Realtime DB
                </span>
              </h2>
              <p className="text-xs text-slate-400">Sincronización instantánea de datos entre múltiples dispositivos</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Status Indicator Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
            isConnected 
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
          }`}>
            {isConnected ? (
              <Radio className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {isConnected ? 'Supabase Conectado y Activo' : 'Espacio Listo para Credenciales de Supabase'}
              </div>
              <p className="opacity-90">
                {isConnected 
                  ? 'La aplicación lee y guarda los datos directamente en Supabase en tiempo real. Cualquier cambio realizado se reflejará al instante en otros teléfonos o navegadores.'
                  : 'Ingresa la URL y Anon Key de tu proyecto de Supabase. Una vez guardadas, la aplicación se sincronizará automáticamente entre todos tus dispositivos.'
                }
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                URL del Proyecto (Project URL)
              </label>
              <input 
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tu-proyecto.supabase.co"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                Anon API Key (Clave Pública)
              </label>
              <textarea 
                rows={3}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors resize-none"
                required
              />
            </div>

            {/* Test Status Message */}
            {statusMessage && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                status === 'success' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' :
                status === 'error' ? 'bg-rose-950/60 border-rose-800 text-rose-300' :
                'bg-blue-950/60 border-blue-800 text-blue-300'
              }`}>
                {status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-400" />}
                {status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                {status === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Limpiar / Restablecer
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={status === 'testing'}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {status === 'testing' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Guardar y Probar Conexión
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* SQL Setup Helper Section */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Script SQL de Inicialización (Supabase SQL Editor)
                </h3>
              </div>
              <button 
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-lg transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Asegúrate de ejecutar esta consulta SQL dentro de la pestaña <strong>SQL Editor</strong> en tu panel de Supabase para habilitar la tabla <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">app_data</code> y la sincronización en tiempo real (Realtime).
            </p>

            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3.5 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 custom-scrollbar select-all">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>

          {/* Help Links */}
          <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>¿No tienes cuenta de Supabase aún?</span>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
            >
              Crear proyecto gratis en Supabase
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
