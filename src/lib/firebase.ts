import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  collectionGroup,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';
import { supabaseDbService, isSupabaseConfigured } from './supabase';

// Obtener las variables de entorno de Firebase o usar la configuración del applet
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || env.VITE_FIREBASE_API_KEY || "AIzaSyDeCmPcVGUpKgtj485VGN3J6ScGbV61F6s",
  authDomain: firebaseAppletConfig.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "admpark.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || env.VITE_FIREBASE_PROJECT_ID || "admpark",
  storageBucket: firebaseAppletConfig.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "admpark.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "249094035940",
  appId: firebaseAppletConfig.appId || env.VITE_FIREBASE_APP_ID || "1:249094035940:web:00251c3f113877cf938ff1",
  measurementId: firebaseAppletConfig.measurementId || "G-3CPX61CW70",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || env.VITE_FIREBASE_DATABASE_ID || "",
};

// Determinar si Firebase está configurado correctamente
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

// Inicializar la aplicación de Firebase o retornar null si no está configurada
let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
}

export { auth, db };

// Interface para respuestas de Auth genéricas (tanto para Firebase como para Local fallback)
export interface AuthResult {
  success: boolean;
  user?: {
    uid: string;
    email: string | null;
    displayName?: string;
  };
  error?: string;
}

/**
 * Servicio de Autenticación de Firebase con Fallback Local si no está configurado
 */
export const authService = {
  // Suscribirse a cambios en el estado de autenticación
  onAuthChange: (callback: (user: any | null) => void) => {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            isFirebase: true
          });
        } else {
          callback(null);
        }
      });
    } else {
      // Fallback local con localStorage
      const checkLocalUser = () => {
        const storedUserStr = localStorage.getItem('fb_fallback_user');
        if (storedUserStr) {
          try {
            callback(JSON.parse(storedUserStr));
          } catch (e) {
            callback(null);
          }
        } else {
          callback(null);
        }
      };

      // Revisar inmediatamente
      checkLocalUser();

      // Devolver una función de limpieza mock
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'fb_fallback_user') {
          checkLocalUser();
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  },

  // Iniciar sesión únicamente con Google (Google Auth)
  loginWithGoogle: async (): Promise<AuthResult> => {
    if (isFirebaseConfigured && auth) {
      try {
        const provider = new GoogleAuthProvider();
        // Forzar selección de cuenta si es necesario
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        return {
          success: true,
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario Google',
          }
        };
      } catch (err: any) {
        console.error("Error al iniciar sesión con Google en Firebase:", err);
        return {
          success: false,
          error: translateAuthError(err.code || err.message)
        };
      }
    } else {
      return {
        success: false,
        error: "Firebase Auth no se ha inicializado correctamente. Verifica las credenciales de tu proyecto."
      };
    }
  },

  // Obtener usuario actualmente autenticado (o desde almacenamiento local)
  getCurrentUser: () => {
    if (isFirebaseConfigured && auth?.currentUser) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
        isFirebase: true
      };
    }
    const stored = localStorage.getItem('fb_fallback_user');
    return stored ? JSON.parse(stored) : null;
  },

  // Cerrar sesión
  signOut: async (): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    } else {
      localStorage.removeItem('fb_fallback_user');
      window.dispatchEvent(new Event('storage'));
    }
  }
};

/**
 * Servicio de base de datos en la nube (Supabase / Firestore) con Fallback en localStorage por usuario
 */
export const dbService = {
  // Guardar un documento asociado a un usuario
  saveDocument: async (collectionName: string, docId: string, data: any, userId: string): Promise<void> => {
    // 1. Guardar en Supabase si está configurado
    if (isSupabaseConfigured()) {
      await supabaseDbService.saveDocument(collectionName, docId, data, userId);
    }

    // 2. Guardar en Firestore si está configurado
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, `users/${userId}/${collectionName}`, docId);
        await setDoc(docRef, {
          ...data,
          userId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error(`Error guardando documento en ${collectionName}:`, err);
        saveLocalUserDocument(collectionName, docId, data, userId);
      }
    } else {
      saveLocalUserDocument(collectionName, docId, data, userId);
    }
  },

  // Eliminar un documento asociado a un usuario
  deleteDocument: async (collectionName: string, docId: string, userId: string): Promise<void> => {
    if (isSupabaseConfigured()) {
      await supabaseDbService.deleteDocument(collectionName, docId, userId);
    }

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, `users/${userId}/${collectionName}`, docId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error(`Error eliminando documento de ${collectionName}:`, err);
        deleteLocalUserDocument(collectionName, docId, userId);
      }
    } else {
      deleteLocalUserDocument(collectionName, docId, userId);
    }
  },

  // Obtener toda la colección de un usuario
  getCollection: async (collectionName: string, userId: string): Promise<any[]> => {
    // Intentar primero desde Supabase si está configurado
    if (isSupabaseConfigured()) {
      const supaDocs = await supabaseDbService.getCollection(collectionName, userId);
      if (supaDocs && supaDocs.length > 0) {
        localStorage.setItem(`fb_cache_${userId}_${collectionName}`, JSON.stringify(supaDocs));
        return supaDocs;
      }
    }

    // Intentar con Firestore si no
    if (isFirebaseConfigured && db) {
      try {
        const colRef = collection(db, `users/${userId}/${collectionName}`);
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        localStorage.setItem(`fb_cache_${userId}_${collectionName}`, JSON.stringify(docs));
        return docs;
      } catch (err) {
        console.error(`Error obteniendo colección de ${collectionName}:`, err);
        return getLocalUserCollection(collectionName, userId);
      }
    } else {
      return getLocalUserCollection(collectionName, userId);
    }
  },

  // Buscar sesión de vehículo por patente en toda la base de datos (público / clientes sin login)
  searchSessionByPlate: async (plateText: string): Promise<{ parking: any | null; wash: any | null }> => {
    const cleanPlate = plateText.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) return { parking: null, wash: null };

    // Búsqueda prioritaria en Supabase en tiempo real
    if (isSupabaseConfigured()) {
      const supaRes = await supabaseDbService.searchSessionByPlate(cleanPlate);
      if (supaRes.parking || supaRes.wash) {
        return supaRes;
      }
    }

    let foundParking: any = null;
    let foundWash: any = null;

    if (isFirebaseConfigured && db) {
      try {
        const sessionsGroup = collectionGroup(db, 'sessions');
        const sessionSnap = await getDocs(query(sessionsGroup));
        
        for (const docSnap of sessionSnap.docs) {
          const data = docSnap.data();
          if (data && data.plate) {
            const norm = data.plate.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (norm === cleanPlate) {
              if (!foundParking || data.status === 'active') {
                foundParking = { ...data, id: docSnap.id };
              }
            }
          }
        }

        const washGroup = collectionGroup(db, 'washSessions');
        const washSnap = await getDocs(query(washGroup));

        for (const docSnap of washSnap.docs) {
          const data = docSnap.data();
          if (data && data.plate) {
            const norm = data.plate.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (norm === cleanPlate) {
              if (!foundWash || data.status !== 'entregado') {
                foundWash = { ...data, id: docSnap.id };
              }
            }
          }
        }
      } catch (err) {
        console.error("Error buscando sesión por patente en Firestore:", err);
      }
    }

    // Fallback: búsqueda en localStorage local (por si la app está offline o datos locales)
    if (!foundParking || !foundWash) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('sessions') || key.includes('washes') || key.includes('fb_cache') || key.includes('estacionamiento'))) {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) continue;
            try {
              const parsed = JSON.parse(itemStr);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item && item.plate) {
                    const norm = item.plate.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (norm === cleanPlate) {
                      if (item.entryTime && (!foundParking || item.status === 'active')) {
                        foundParking = item;
                      }
                      if ((item.packageId || item.washPackageId) && (!foundWash || item.status !== 'entregado')) {
                        foundWash = item;
                      }
                    }
                  }
                }
              }
            } catch (e) {
              // ignora objetos no JSON
            }
          }
        }
      } catch (e) {
        console.error("Error buscando sesión en localStorage:", e);
      }
    }

    return { parking: foundParking, wash: foundWash };
  },

  // Suscribirse a cambios en tiempo real en la colección
  subscribeToCollection: (collectionName: string, userId: string, onUpdate: (docs: any[]) => void) => {
    if (isSupabaseConfigured()) {
      return supabaseDbService.subscribeToCollection(collectionName, userId, onUpdate);
    }
    return () => {};
  }
};

// Helpers locales para el fallback / caché por usuario
function saveLocalUserDocument(collectionName: string, docId: string, data: any, userId: string) {
  const collection = getLocalUserCollection(collectionName, userId);
  const index = collection.findIndex((item: any) => item.id === docId);
  
  const newItem = { ...data, id: docId, userId };
  if (index >= 0) {
    collection[index] = newItem;
  } else {
    collection.push(newItem);
  }
  
  localStorage.setItem(`fb_cache_${userId}_${collectionName}`, JSON.stringify(collection));
}

function deleteLocalUserDocument(collectionName: string, docId: string, userId: string) {
  const collection = getLocalUserCollection(collectionName, userId);
  const updated = collection.filter((item: any) => item.id !== docId);
  localStorage.setItem(`fb_cache_${userId}_${collectionName}`, JSON.stringify(updated));
}

function getLocalUserCollection(collectionName: string, userId: string): any[] {
  const dataStr = localStorage.getItem(`fb_cache_${userId}_${collectionName}`);
  if (dataStr) {
    try {
      return JSON.parse(dataStr);
    } catch (e) {
      return [];
    }
  }
  
  // Si no hay caché para este usuario, pero hay datos antiguos del "localStorage global" original del estacionamiento,
  // podemos migrar los datos iniciales de este usuario para que no empiece vacío. Esto da una experiencia de actualización espectacular!
  const legacyKey = getLegacyKey(collectionName);
  if (legacyKey) {
    const legacyDataStr = localStorage.getItem(legacyKey);
    if (legacyDataStr) {
      try {
        const parsed = JSON.parse(legacyDataStr);
        if (Array.isArray(parsed)) {
          // Guardar como caché del usuario para que conserve sus datos anteriores
          localStorage.setItem(`fb_cache_${userId}_${collectionName}`, legacyDataStr);
          return parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Es un objeto único, lo envolvemos en un array o lo guardamos directamente
          const wrapped = [ { ...parsed, id: 'config' } ];
          localStorage.setItem(`fb_cache_${userId}_${collectionName}`, JSON.stringify(wrapped));
          return wrapped;
        }
      } catch (e) {
        // Ignorar error de parsing
      }
    }
  }
  
  return [];
}

// Relación entre colecciones de Firestore y las llaves legacy del localStorage
function getLegacyKey(collectionName: string): string | null {
  switch (collectionName) {
    case 'sessions': return 'estacionamiento_sessions';
    case 'settings': return 'estacionamiento_settings';
    case 'capacity': return 'estacionamiento_capacity';
    case 'cashSessions': return 'estacionamiento_cash_sessions';
    case 'inventory': return 'estacionamiento_inventory';
    case 'accessorySales': return 'estacionamiento_accessory_sales';
    case 'bookings': return 'estacionamiento_bookings';
    case 'washSessions': return 'estacionamiento_wash_sessions';
    case 'users': return 'estacionamiento_users';
    default: return null;
  }
}

// Traducir códigos de error comunes de Firebase Auth al español
function translateAuthError(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana emergente antes de completar el inicio de sesión con Google.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de Google. Por favor, permita las ventanas emergentes.';
    case 'auth/cancelled-popup-request':
      return 'Se canceló la solicitud previa de autenticación.';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta vinculada a este correo con un método de acceso distinto.';
    case 'auth/operation-not-allowed':
      return 'El proveedor de inicio de sesión de Google no está habilitado en Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'El dominio actual no está autorizado en la consola de Firebase Authentication.';
    default:
      return 'Ha ocurrido un error al intentar iniciar sesión con Google. Intente nuevamente.';
  }
}
