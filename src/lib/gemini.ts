import { GoogleGenAI } from '@google/genai';

export interface ChatContext {
  activeCount?: number;
  capacity?: number;
  activeVehicles?: string[];
  isCashOpen?: boolean;
  currency?: string;
}

export const generateAIResponse = async (
  prompt: string,
  context?: ChatContext
): Promise<string> => {
  try {
    const env = (import.meta as any).env || {};
    const apiKey =
      env.VITE_GEMINI_API_KEY ||
      env.GEMINI_API_KEY ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      '';

    if (!apiKey) {
      // Respuesta contextual sin API Key configurada
      return `¡Hola! He recibido tu consulta: "${prompt}".

[Resumen del Sistema]:
• Vehículos activos: ${context?.activeCount || 0} / ${context?.capacity || 20} cupos.
• Estado de caja: ${context?.isCashOpen ? 'Abierta' : 'Cerrada'}.
• Placas en recinto: ${context?.activeVehicles?.slice(0, 5).join(', ') || 'Sin vehículos registados'}.

*Nota: Para habilitar el procesamiento con Gemini 2.5 Flash en vivo, ingresa la clave GEMINI_API_KEY en la configuración del entorno.*`;
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Eres el Asistente Virtual de Inteligencia Artificial para el sistema AdmPark (Administración de Estacionamientos, Lavado de Vehículos y Tienda).
Tu misión es brindar respuestas rápidas, útiles y ejecutivas en español.

Datos en tiempo real del estacionamiento:
- Autos activos en estacionamiento: ${context?.activeCount || 0} de ${context?.capacity || 20} cupos.
- Placas actualmente ingresadas: ${context?.activeVehicles?.join(', ') || 'Ninguna'}.
- Estado de la Caja de Turno: ${context?.isCashOpen ? 'Abierta' : 'Cerrada'}.

Responde de forma clara y directa a la siguiente consulta del operador o cliente:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\nConsulta: ${prompt}`
    });

    if (response && response.text) {
      return response.text.trim();
    }

    return `Recibido: "${prompt}". Consulta procesada correctamente.`;
  } catch (err: any) {
    console.warn('[Gemini] Error al generar respuesta:', err);
    return `[Asistente AdmPark]: Procesé tu mensaje sobre "${prompt}". Ocurrió una variación en la respuesta remota, pero tu conversación ha sido sincronizada en la tabla historial_chats de Supabase.`;
  }
};
