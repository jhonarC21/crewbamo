import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, RefreshCw, User, Database, MessageSquare, CheckCircle2 } from 'lucide-react';
import { supabaseDbService, ChatMessageRecord, isSupabaseConfigured } from '../lib/supabase';
import { generateAIResponse, ChatContext } from '../lib/gemini';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  contextData?: ChatContext;
}

export default function AIChatModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  contextData
}: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial de chats desde la tabla 'historial_chats' de Supabase al abrir/iniciar sesión
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchHistory = async () => {
      setSyncing(true);
      try {
        const history = await supabaseDbService.getChatHistory(userId);
        if (isMounted) {
          setMessages(history);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.warn("Error descargando historial de chats:", err);
      } finally {
        if (isMounted) setSyncing(false);
      }
    };

    fetchHistory();

    // Suscripción en tiempo real entre múltiples dispositivos
    const unsubscribe = supabaseDbService.subscribeToChatHistory(userId, (updatedChats) => {
      if (isMounted && updatedChats) {
        setMessages(updatedChats);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isOpen, userId]);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    // 1. Crear registro provisional en pantalla
    const tempUserMessage: ChatMessageRecord = {
      usuario_id: userId,
      mensaje_usuario: text,
      respuesta_ia: 'Generando respuesta con la IA...',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // 2. Generar respuesta con la IA
      const aiResponseText = await generateAIResponse(text, contextData);

      // 3. Guardar automáticamente en Supabase en la tabla 'historial_chats' usando usuario_id
      const savedSuccess = await supabaseDbService.saveChatMessage(userId, text, aiResponseText);

      if (savedSuccess) {
        setLastSyncTime(new Date().toLocaleTimeString());
      }

      // 4. Actualizar estado local inmediatamente
      setMessages(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].mensaje_usuario === text) {
          copy[lastIdx] = {
            usuario_id: userId,
            mensaje_usuario: text,
            respuesta_ia: aiResponseText,
            created_at: new Date().toISOString()
          };
        }
        return copy;
      });
    } catch (err) {
      console.error("Error al procesar mensaje con la IA:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "¿Cuántos autos hay en el estacionamiento?",
    "Resumen general de ocupación",
    "¿Está abierta la caja de turno?",
    "Recomendaciones para aumentar ventas"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* HEADER DE CHAT IA */}
        <div className="p-4 md:p-5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Asistente Virtual IA
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/60 font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Gemini
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Database className={`w-3 h-3 ${isSupabaseConfigured() ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>Tabla <code className="font-mono text-emerald-300 font-bold">historial_chats</code></span>
                {syncing && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin ml-1" />}
                {lastSyncTime && !syncing && (
                  <span className="text-[10px] text-slate-500 font-mono ml-1">
                    (Sync: {lastSyncTime})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CINTA INFO DE USUARIO FIREBASE & CORDÓN NUBE */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-500">usuario_id:</span>
            <span className="text-slate-200 font-bold truncate max-w-[220px]" title={userId}>
              {userId}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Nube Activa</span>
          </div>
        </div>

        {/* ÁREA DE MENSAJES DE CHAT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-white font-bold text-sm">Historial de conversaciones sincronizado</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Los mensajes que envíes y las respuestas de la IA se resguardarán en tu tabla <code className="text-emerald-300 font-mono font-bold">historial_chats</code> de Supabase para que no pierdas ningún dato en otros dispositivos.
                </p>
              </div>

              {/* Sugerencias Rápidas */}
              <div className="pt-2 w-full max-w-md space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold text-left">Preguntas sugeridas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp)}
                      className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-300 p-2.5 rounded-xl transition-all text-left cursor-pointer flex items-center justify-between group"
                    >
                      <span className="line-clamp-2">{qp}</span>
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((item, index) => (
              <div key={index} className="space-y-3">
                
                {/* 1. Mensaje enviado por el usuario */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-none shadow-lg shadow-blue-950/50 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-blue-200 font-mono border-b border-blue-500/30 pb-1 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <User className="w-3 h-3" /> Tú (Operador)
                      </span>
                      {item.created_at && (
                        <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{item.mensaje_usuario}</p>
                  </div>
                </div>

                {/* 2. Respuesta generada por la IA */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-slate-950 border border-slate-800 text-slate-200 p-3.5 rounded-2xl rounded-tl-none shadow-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-blue-400 font-mono border-b border-slate-800/80 pb-1 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-blue-400" /> Asistente IA
                      </span>
                      <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 rounded font-mono">
                        historial_chats
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200">{item.respuesta_ia}</p>
                  </div>
                </div>

              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-950 border border-slate-800 text-slate-400 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-3 text-xs">
                <Bot className="w-4 h-4 text-blue-400 animate-bounce" />
                <span>Procesando consulta y resguardando en Supabase...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT DE MENSAJES */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 shrink-0 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta para la IA (ej: estado de estacionamientos)..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 text-white placeholder-slate-500 text-xs rounded-xl px-4 py-3 outline-none transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/40 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Sincronización automática con columna <code className="text-slate-400">usuario_id</code></span>
            <span>Pulse Enter para enviar</span>
          </div>
        </div>

      </div>
    </div>
  );
}
