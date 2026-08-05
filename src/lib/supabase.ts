import { createClient, SupabaseClient } from '@supabase/supabase-js';
import supabaseConfigRaw from '../../supabase-config.json';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const env = (import.meta as any).env || {};

// Read initial config from supabase-config.json, env vars, or localStorage override
const getActiveConfig = (): SupabaseConfig => {
  const localSaved = localStorage.getItem('supabase_custom_config');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    } catch (e) {
      console.warn("Could not parse saved Supabase config from localStorage", e);
    }
  }

  const url = supabaseConfigRaw.supabaseUrl || env.VITE_SUPABASE_URL || "";
  const key = supabaseConfigRaw.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || "";

  return {
    supabaseUrl: url.trim(),
    supabaseAnonKey: key.trim(),
  };
};

let currentConfig = getActiveConfig();

// Initialize Supabase client
const initSupabaseClient = (cfg: SupabaseConfig): SupabaseClient | null => {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return null;
  }
  // Standard placeholder check
  if (
    cfg.supabaseUrl.includes('YOUR_SUPABASE') ||
    cfg.supabaseAnonKey.includes('YOUR_SUPABASE') ||
    cfg.supabaseUrl.includes('your-supabase-project')
  ) {
    return null;
  }

  try {
    // Check if CDN loaded global supabase or use imported createClient
    if (typeof window !== 'undefined' && (window as any).supabase && (window as any).supabase.createClient) {
      return (window as any).supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true }
      });
    }
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true }
    });
  } catch (err) {
    console.error("Error al inicializar cliente de Supabase:", err);
    return null;
  }
};

export let supabase: SupabaseClient | null = initSupabaseClient(currentConfig);

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null && !!currentConfig.supabaseUrl && !!currentConfig.supabaseAnonKey;
};

export const getSupabaseConfig = () => {
  return {
    ...currentConfig,
    isConfigured: isSupabaseConfigured(),
  };
};

export const updateSupabaseConfig = (newUrl: string, newKey: string) => {
  const updated = {
    supabaseUrl: newUrl.trim(),
    supabaseAnonKey: newKey.trim()
  };
  localStorage.setItem('supabase_custom_config', JSON.stringify(updated));
  currentConfig = updated;
  supabase = initSupabaseClient(currentConfig);
  window.dispatchEvent(new Event('supabase_config_changed'));
  return isSupabaseConfigured();
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem('supabase_custom_config');
  currentConfig = getActiveConfig();
  supabase = initSupabaseClient(currentConfig);
  window.dispatchEvent(new Event('supabase_config_changed'));
};

/**
 * SQL Schema recomendado para ejecutar en la consola SQL de Supabase
 */
export const SUPABASE_SQL_SCHEMA = `-- Copia y pega este script en el SQL Editor de tu proyecto en Supabase:

CREATE TABLE IF NOT EXISTS public.app_data (
  id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar tiempo real (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_data;

-- Índice para búsquedas veloces por colección y usuario
CREATE INDEX IF NOT EXISTS idx_app_data_lookup ON public.app_data(collection_name, user_id);
CREATE INDEX IF NOT EXISTS idx_app_data_collection ON public.app_data(collection_name);

-- Políticas RLS permisivas para la app (o ajusta según tus necesidades de seguridad)
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso público lectura/escritura app_data" ON public.app_data
  FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Servicio centralizado para almacenamiento y sincronización en tiempo real con Supabase
 */
export const supabaseDbService = {
  // Guardar/Actualizar documento en Supabase
  saveDocument: async (collectionName: string, docId: string, data: any, userId: string = 'global'): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const compositeId = `${userId}_${collectionName}_${docId}`;
      const payload = {
        id: compositeId,
        collection_name: collectionName,
        doc_id: docId,
        user_id: userId,
        data: data,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('app_data')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Error guardando en Supabase [${collectionName}]:`, error);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`Excepción al guardar en Supabase [${collectionName}]:`, err);
      return false;
    }
  },

  // Obtener todos los documentos de una colección
  getCollection: async (collectionName: string, userId: string = 'global'): Promise<any[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('collection_name', collectionName)
        .or(`user_id.eq.${userId},user_id.eq.global`);

      if (error) {
        console.error(`Error consultando colección [${collectionName}] en Supabase:`, error);
        return [];
      }

      return data ? data.map(item => item.data) : [];
    } catch (err) {
      console.error(`Excepción al obtener colección [${collectionName}] en Supabase:`, err);
      return [];
    }
  },

  // Eliminar documento
  deleteDocument: async (collectionName: string, docId: string, userId: string = 'global'): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const compositeId = `${userId}_${collectionName}_${docId}`;
      const { error } = await supabase
        .from('app_data')
        .delete()
        .eq('id', compositeId);

      if (error) {
        console.error(`Error eliminando de Supabase [${collectionName}]:`, error);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`Excepción al eliminar en Supabase [${collectionName}]:`, err);
      return false;
    }
  },

  // Suscribirse a cambios en tiempo real entre múltiples dispositivos
  subscribeToCollection: (
    collectionName: string, 
    userId: string = 'global', 
    onUpdate: (docs: any[]) => void
  ) => {
    if (!supabase) return () => {};

    const channelName = `realtime:${collectionName}:${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_data',
          filter: `collection_name=eq.${collectionName}`
        },
        async () => {
          // Re-obtener los datos más recientes cuando hay cambios de cualquier otro dispositivo
          const updatedDocs = await supabaseDbService.getCollection(collectionName, userId);
          onUpdate(updatedDocs);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  },

  // Búsqueda pública por patente en tiempo real (para portal de clientes desde código QR)
  searchSessionByPlate: async (plateText: string): Promise<{ parking: any | null; wash: any | null }> => {
    if (!supabase) return { parking: null, wash: null };
    const cleanPlate = plateText.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) return { parking: null, wash: null };

    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data, collection_name')
        .in('collection_name', ['sessions', 'washSessions']);

      if (error || !data) return { parking: null, wash: null };

      let foundParking: any = null;
      let foundWash: any = null;

      for (const row of data) {
        const item = row.data;
        if (!item || !item.plate) continue;
        const norm = item.plate.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (norm === cleanPlate) {
          if (row.collection_name === 'sessions') {
            if (!foundParking || item.status === 'active') {
              foundParking = item;
            }
          } else if (row.collection_name === 'washSessions') {
            if (!foundWash || item.status !== 'entregado') {
              foundWash = item;
            }
          }
        }
      }

      return { parking: foundParking, wash: foundWash };
    } catch (err) {
      console.error("Error buscando por patente en Supabase:", err);
      return { parking: null, wash: null };
    }
  }
};
