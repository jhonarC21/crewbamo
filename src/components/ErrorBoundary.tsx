import React, { ReactNode, ErrorInfo } from 'react';
import { ShieldAlert, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[ErrorBoundary] Se previno un cuelgue de pantalla por error no capturado:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearStorageAndReload = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fb_cache_') || key.startsWith('supabase_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("Error al limpiar cache:", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0C10] text-slate-200 flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-5">
            
            <div className="w-14 h-14 bg-amber-950/60 border border-amber-800/60 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Protección de Pantalla Activa
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                El sistema detectó un inconveniente con la conexión a la base de datos remota o el inicio de sesión, pero se ha protegido el estado para evitar que la pantalla quede en blanco.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-left font-mono text-[10px] text-amber-300 max-h-24 overflow-y-auto break-words">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Cargar Interfaz Base</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reiniciar datos en memoria</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              AdmPark Control v2.4 • Modo de Residencia Seguro
            </p>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
