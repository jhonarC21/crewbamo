/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParkingSession, TariffSettings, CashSession, PaymentMethod, InventoryItem, AccessorySale, AppUser, UserRole, ServiceBooking, ServiceQuote, NightSubscription, VehicleRecord } from './types';
import { getSeedSessions, getDefaultTariffSettings, getSeedCashSessions, getSeedInventoryItems, getSeedAccessorySales, getSeedBookings, getSeedQuotes, getSeedNightSubscriptions, getSeedVehicleRecords, normalizePlate, formatPlate } from './utils/parkingUtils';
import Dashboard from './components/Dashboard';
import ActiveParking from './components/ActiveParking';
import HistoryLog from './components/HistoryLog';
import TariffsConfig from './components/TariffsConfig';
import CashRegister from './components/CashRegister';
import InventoryShop from './components/InventoryShop';
import VehicleServicesHistory from './components/VehicleServicesHistory';
import CarWashManagement from './components/CarWashManagement';
import ClientPortal from './components/ClientPortal';
import LockScreen from './components/LockScreen';
import ServiceBookingManagement from './components/ServiceBookingManagement';
import AuthScreen from './components/AuthScreen';
import { ServiceQuotes } from './components/ServiceQuotes';
import { NightParkingManagement } from './components/NightParkingManagement';
import VehicleDatabase from './components/VehicleDatabase';
import { authService, dbService, isFirebaseConfigured } from './lib/firebase';
import { 
  Car, 
  Clock, 
  History, 
  Settings, 
  LayoutDashboard, 
  Info,
  ChevronRight,
  Database,
  Wallet,
  ShoppingBag,
  Wrench,
  Waves,
  Users,
  ShieldAlert,
  Key,
  LogIn,
  Lock,
  UserCheck,
  QrCode,
  Smartphone,
  Calendar,
  LogOut,
  FileText,
  Moon
} from 'lucide-react';

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin-1',
    name: 'Administrador Principal',
    role: 'admin',
    pin: '1234',
    createdAt: new Date('2026-07-01').toISOString()
  },
  {
    id: 'user-op-1',
    name: 'Operador Turno Mañana',
    role: 'operador',
    pin: '0000',
    createdAt: new Date('2026-07-01').toISOString()
  }
];

export default function App() {
  // Estado de Firebase Auth y Carga de datos
  const [fbUser, setFbUser] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Estados principales de persistencia
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [settings, setSettings] = useState<TariffSettings>(getDefaultTariffSettings());
  const [capacity, setCapacity] = useState<number>(20);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [accessorySales, setAccessorySales] = useState<AccessorySale[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [quotes, setQuotes] = useState<ServiceQuote[]>([]);
  const [nightSubscriptions, setNightSubscriptions] = useState<NightSubscription[]>([]);
  const [vehicleRecords, setVehicleRecords] = useState<VehicleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'active' | 'history' | 'settings' | 'caja' | 'tienda' | 'tickets' | 'servicios' | 'lavado' | 'portal' | 'agenda' | 'grabado' | 'cotizaciones' | 'nocturno' | 'vehiculos'>('dashboard');
  const [storeSubTab, setStoreSubTab] = useState<'tienda' | 'cotizaciones' | 'nocturno'>('tienda');

  // Estados de consulta de clientes (QR o URL directa)
  const [isClientMode, setIsClientMode] = useState(false);
  const [clientPlateParam, setClientPlateParam] = useState('');

  // Estados de usuarios gestionados
  const [users, setUsers] = useState<AppUser[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false);
  const [selectedUserToSwitch, setSelectedUserToSwitch] = useState<AppUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Estado de bloqueo de pantalla
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);

  // Logo y branding corporativo
  const [companyLogo, setCompanyLogo] = useState<string>(() => localStorage.getItem('company_logo') || '');
  const [showLogoInHeader, setShowLogoInHeader] = useState<boolean>(() => localStorage.getItem('show_logo_in_header') !== 'false');
  const [showLogoInTicket, setShowLogoInTicket] = useState<boolean>(() => localStorage.getItem('show_logo_in_ticket') !== 'false');

  const handleUpdateLogoSettings = (logo: string, showHeader: boolean, showTicket: boolean) => {
    setCompanyLogo(logo);
    setShowLogoInHeader(showHeader);
    setShowLogoInTicket(showTicket);
    if (logo) {
      localStorage.setItem('company_logo', logo);
    } else {
      localStorage.removeItem('company_logo');
    }
    localStorage.setItem('show_logo_in_header', showHeader ? 'true' : 'false');
    localStorage.setItem('show_logo_in_ticket', showTicket ? 'true' : 'false');
  };

  // Reloj del sistema en tiempo real
  const [systemTime, setSystemTime] = useState(new Date());

  // Auto-bloqueo por inactividad (10 minutos)
  useEffect(() => {
    if (isAppLocked || isClientMode) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Auto-bloqueo tras 10 minutos (600,000 ms) de inactividad
      timeoutId = setTimeout(() => {
        setIsAppLocked(true);
      }, 10 * 60 * 1000);
    };

    // Escuchar eventos de interacción
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Inicializar

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAppLocked, isClientMode]);

  // Detectar consulta de cliente en la URL (?plate=XXXX)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plate = urlParams.get('plate');
    if (plate) {
      setIsClientMode(true);
      setClientPlateParam(plate);
    }
  }, []);

  // Suscribirse al estado de Autenticación de Firebase/Local
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((user) => {
      setFbUser(user);
      if (user) {
        loadUserData(user.uid);
      } else {
        setSessions([]);
        setSettings(getDefaultTariffSettings());
        setCapacity(20);
        setCashSessions([]);
        setInventory([]);
        setAccessorySales([]);
        setBookings([]);
        setQuotes([]);
        setNightSubscriptions([]);
        const cachedVR = localStorage.getItem('estacionamiento_vehicle_records');
        setVehicleRecords(cachedVR ? JSON.parse(cachedVR) : getSeedVehicleRecords());
        setUsers(DEFAULT_USERS);
        setCurrentUser(DEFAULT_USERS[0]);
        setLoadingData(false);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const loadUserData = async (uid: string) => {
    setLoadingData(true);
    try {
      // 1. Sessions
      let s = await dbService.getCollection('sessions', uid);
      if (s.length === 0) {
        const seeds = getSeedSessions();
        for (const session of seeds) {
          await dbService.saveDocument('sessions', session.id, session, uid);
        }
        s = seeds;
      }
      setSessions(s);

      // 2. Settings
      const settingsCol = await dbService.getCollection('settings', uid);
      let sSettings = settingsCol.find(d => d.id === 'config');
      if (!sSettings) {
        const defaults = getDefaultTariffSettings();
        await dbService.saveDocument('settings', 'config', defaults, uid);
        sSettings = { ...defaults, id: 'config' };
      } else {
        // Asegurarnos de remover la propiedad id que Firestore agrega al mapear
        const { id, userId, updatedAt, ...cleanSet } = sSettings as any;
        sSettings = cleanSet;
      }
      setSettings(sSettings as any);

      // 3. Capacity
      const capacityCol = await dbService.getCollection('capacity', uid);
      let sCapacity = capacityCol.find(d => d.id === 'config');
      if (!sCapacity) {
        await dbService.saveDocument('capacity', 'config', { value: 20 }, uid);
        sCapacity = { value: 20, id: 'config' };
      }
      setCapacity((sCapacity as any).value || 20);

      // 4. Cash Sessions
      let cs = await dbService.getCollection('cashSessions', uid);
      if (cs.length === 0) {
        const seedCash = getSeedCashSessions();
        for (const session of seedCash) {
          await dbService.saveDocument('cashSessions', session.id, session, uid);
        }
        cs = seedCash;
      }
      setCashSessions(cs);

      // 5. Inventory
      let inv = await dbService.getCollection('inventory', uid);
      if (inv.length === 0) {
        const seedInv = getSeedInventoryItems();
        for (const item of seedInv) {
          await dbService.saveDocument('inventory', item.id, item, uid);
        }
        inv = seedInv;
      }
      setInventory(inv);

      // 6. Accessory Sales
      let sales = await dbService.getCollection('accessorySales', uid);
      if (sales.length === 0) {
        const seedSales = getSeedAccessorySales();
        for (const sale of seedSales) {
          await dbService.saveDocument('accessorySales', sale.id, sale, uid);
        }
        sales = seedSales;
      }
      setAccessorySales(sales);

      // 7. Bookings
      let bk = await dbService.getCollection('bookings', uid);
      if (bk.length === 0) {
        const seedBookings = getSeedBookings();
        for (const booking of seedBookings) {
          await dbService.saveDocument('bookings', booking.id, booking, uid);
        }
        bk = seedBookings;
      }
      setBookings(bk);

      // 8. Quotes
      let qCol = await dbService.getCollection('quotes', uid);
      if (qCol.length === 0) {
        const seedQ = getSeedQuotes();
        for (const q of seedQ) {
          await dbService.saveDocument('quotes', q.id, q, uid);
        }
        qCol = seedQ;
      }
      setQuotes(qCol as ServiceQuote[]);

      // 9. Night Subscriptions
      let nsCol = await dbService.getCollection('nightSubscriptions', uid);
      if (nsCol.length === 0) {
        const seedNS = getSeedNightSubscriptions();
        for (const ns of seedNS) {
          await dbService.saveDocument('nightSubscriptions', ns.id, ns, uid);
        }
        nsCol = seedNS;
      }
      setNightSubscriptions(nsCol as NightSubscription[]);

      // 10. Vehicle Records (Base de Datos de Patentes)
      let vrCol = await dbService.getCollection('vehicleRecords', uid);
      if (vrCol.length === 0) {
        const seedVR = getSeedVehicleRecords();
        for (const vr of seedVR) {
          await dbService.saveDocument('vehicleRecords', vr.id, vr, uid);
        }
        vrCol = seedVR;
      }
      setVehicleRecords(vrCol as VehicleRecord[]);

      // 11. Users list (managed sub-users for local locking)
      const usersCol = await dbService.getCollection('users', uid);
      let sUsers = usersCol.find(d => d.id === 'list');
      if (!sUsers) {
        await dbService.saveDocument('users', 'list', { list: DEFAULT_USERS }, uid);
        sUsers = { list: DEFAULT_USERS, id: 'list' };
      }
      setUsers((sUsers as any).list || DEFAULT_USERS);
      setCurrentUser(((sUsers as any).list || DEFAULT_USERS)[0] || DEFAULT_USERS[0]);

    } catch (err) {
      console.error("Error al cargar datos desde Firebase/Cache:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Actualizar reloj en vivo
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Guardar sesiones cuando cambien
  const saveSessionsToStorage = (newSessions: ParkingSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('estacionamiento_sessions', JSON.stringify(newSessions));
  };

  // Callback: Agregar ingreso de vehículo
  const handleRegisterEntry = (newSession: Omit<ParkingSession, 'id' | 'status'>) => {
    const session: ParkingSession = {
      ...newSession,
      id: `session-${Date.now()}`,
      status: 'active'
    };
    const updated = [session, ...sessions];
    saveSessionsToStorage(updated);
    if (fbUser) {
      dbService.saveDocument('sessions', session.id, session, fbUser.uid);
    }
  };

  // Callback: Registrar salida y cobro de vehículo
  const handleCheckout = (id: string, exitTime: string, finalAmount: number, paymentMethod: PaymentMethod, notes?: string) => {
    let updatedSession: ParkingSession | null = null;
    const updated = sessions.map(s => {
      if (s.id === id) {
        // Calcular minutos de estadía para guardar registro exacto
        const entryDate = new Date(s.entryTime);
        const exitDate = new Date(exitTime);
        const diffMs = exitDate.getTime() - entryDate.getTime();
        const durationMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)));

        updatedSession = {
          ...s,
          status: 'completed' as const,
          exitTime,
          chargedAmount: finalAmount,
          durationMinutes,
          paymentMethod,
          notes: notes || s.notes
        };
        return updatedSession;
      }
      return s;
    });
    saveSessionsToStorage(updated);
    if (fbUser && updatedSession) {
      dbService.saveDocument('sessions', id, updatedSession, fbUser.uid);
    }
  };

  // Callback: Eliminar o retirar forzadamente un vehículo estacionado
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    saveSessionsToStorage(updated);
    if (fbUser) {
      dbService.deleteDocument('sessions', id, fbUser.uid);
    }
  };

  // Callback: Actualizar o modificar una sesión de estacionamiento (Administrador)
  const handleUpdateSession = (updatedSession: ParkingSession) => {
    const updated = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    saveSessionsToStorage(updated);
    if (fbUser) {
      dbService.saveDocument('sessions', updatedSession.id, updatedSession, fbUser.uid);
    }
  };

  // Callback: Abrir caja
  const handleOpenCash = (openingBalance: number, notes?: string) => {
    const newSession: CashSession = {
      id: `cash-session-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openingBalance,
      status: 'open',
      notes,
      movements: [],
      cashSales: 0,
      debitoSales: 0,
      transferenciaSales: 0
    };
    const updated = [...cashSessions, newSession];
    setCashSessions(updated);
    localStorage.setItem('estacionamiento_cash_sessions', JSON.stringify(updated));
    if (fbUser) {
      dbService.saveDocument('cashSessions', newSession.id, newSession, fbUser.uid);
    }
  };

  // Callback: Cerrar caja
  const handleCloseCash = (closingBalance: number, notes?: string) => {
    let closedSession: CashSession | null = null;
    const updated = cashSessions.map(s => {
      if (s.status === 'open') {
        // Calcular las ventas realizadas durante esta sesión de caja
        let cashSales = 0;
        let debitoSales = 0;
        let transferenciaSales = 0;

        const completedInSession = sessions.filter(ps => 
          ps.status === 'completed' && 
          ps.exitTime && 
          new Date(ps.exitTime).getTime() >= new Date(s.openedAt).getTime()
        );

        completedInSession.forEach(ps => {
          const amount = ps.chargedAmount || 0;
          if (ps.paymentMethod === 'efectivo' || !ps.paymentMethod) {
            cashSales += amount;
          } else if (ps.paymentMethod === 'debito') {
            debitoSales += amount;
          } else if (ps.paymentMethod === 'transferencia') {
            transferenciaSales += amount;
          }
        });

        // Sumar también ventas de accesorios que ocurrieron durante la sesión de caja
        const accessorySalesInSession = accessorySales.filter(as => 
          new Date(as.timestamp).getTime() >= new Date(s.openedAt).getTime()
        );

        accessorySalesInSession.forEach(as => {
          const amount = as.totalPrice;
          if (as.paymentMethod === 'efectivo') {
            cashSales += amount;
          } else if (as.paymentMethod === 'debito') {
            debitoSales += amount;
          } else if (as.paymentMethod === 'transferencia') {
            transferenciaSales += amount;
          }
        });

        const manualInputs = s.movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0);
        const manualOutputs = s.movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0);

        const expectedBalance = s.openingBalance + cashSales + manualInputs - manualOutputs;

        closedSession = {
          ...s,
          closedAt: new Date().toISOString(),
          closingBalance,
          expectedBalance,
          status: 'closed' as const,
          notes: notes || s.notes,
          cashSales,
          debitoSales,
          transferenciaSales
        };
        return closedSession;
      }
      return s;
    });
    setCashSessions(updated);
    localStorage.setItem('estacionamiento_cash_sessions', JSON.stringify(updated));
    if (fbUser && closedSession) {
      dbService.saveDocument('cashSessions', (closedSession as CashSession).id, closedSession, fbUser.uid);
    }
  };

  // Callback: Agregar producto al inventario
  const handleAddProduct = (productData: Omit<InventoryItem, 'id'>) => {
    const newProduct: InventoryItem = {
      ...productData,
      id: `inv-item-${Date.now()}`
    };
    const updated = [...inventory, newProduct];
    setInventory(updated);
    localStorage.setItem('estacionamiento_inventory', JSON.stringify(updated));
    if (fbUser) {
      dbService.saveDocument('inventory', newProduct.id, newProduct, fbUser.uid);
    }
  };

  // Callback: Editar producto del inventario
  const handleEditProduct = (id: string, productData: Partial<InventoryItem>) => {
    let updatedProduct: InventoryItem | null = null;
    const updated = inventory.map(item => {
      if (item.id === id) {
        updatedProduct = { ...item, ...productData };
        return updatedProduct;
      }
      return item;
    });
    setInventory(updated);
    localStorage.setItem('estacionamiento_inventory', JSON.stringify(updated));
    if (fbUser && updatedProduct) {
      dbService.saveDocument('inventory', id, updatedProduct, fbUser.uid);
    }
  };

  // Callback: Eliminar producto del inventario
  const handleDeleteProduct = (id: string) => {
    const updated = inventory.filter(item => item.id !== id);
    setInventory(updated);
    localStorage.setItem('estacionamiento_inventory', JSON.stringify(updated));
    if (fbUser) {
      dbService.deleteDocument('inventory', id, fbUser.uid);
    }
  };

  // Callback: Vender accesorio y descontar stock
  const handleSellAccessory = (saleData: Omit<AccessorySale, 'id' | 'timestamp'>) => {
    // 1. Agregar venta al historial
    const newSale: AccessorySale = {
      ...saleData,
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    const updatedSales = [...accessorySales, newSale];
    setAccessorySales(updatedSales);
    localStorage.setItem('estacionamiento_accessory_sales', JSON.stringify(updatedSales));
    if (fbUser) {
      dbService.saveDocument('accessorySales', newSale.id, newSale, fbUser.uid);
    }

    // 2. Descontar stock del producto vendido
    let updatedItem: InventoryItem | null = null;
    const updatedInventory = inventory.map(item => {
      if (item.id === saleData.itemId) {
        updatedItem = {
          ...item,
          stock: Math.max(0, item.stock - saleData.quantity)
        };
        return updatedItem;
      }
      return item;
    });
    setInventory(updatedInventory);
    localStorage.setItem('estacionamiento_inventory', JSON.stringify(updatedInventory));
    if (fbUser && updatedItem) {
      dbService.saveDocument('inventory', (updatedItem as InventoryItem).id, updatedItem, fbUser.uid);
    }
  };

  // Callback: Agregar movimiento manual
  const handleAddMovement = (type: 'ingreso' | 'egreso', amount: number, description: string) => {
    let activeSession: CashSession | null = null;
    const updated = cashSessions.map(s => {
      if (s.status === 'open') {
        const newMovement = {
          id: `mov-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type,
          amount,
          description
        };
        activeSession = {
          ...s,
          movements: [...s.movements, newMovement]
        };
        return activeSession;
      }
      return s;
    });
    setCashSessions(updated);
    localStorage.setItem('estacionamiento_cash_sessions', JSON.stringify(updated));
    if (fbUser && activeSession) {
      dbService.saveDocument('cashSessions', (activeSession as CashSession).id, activeSession, fbUser.uid);
    }
  };

  // Callbacks para la Base de Datos de Vehículos
  const handleSaveVehicleRecord = (record: VehicleRecord) => {
    const norm = normalizePlate(record.plate) || record.id;
    const cleanRecord = { ...record, id: norm };
    const existingIdx = vehicleRecords.findIndex(v => v.id === norm || normalizePlate(v.plate) === norm);
    let updated: VehicleRecord[];
    if (existingIdx >= 0) {
      updated = [...vehicleRecords];
      updated[existingIdx] = cleanRecord;
    } else {
      updated = [cleanRecord, ...vehicleRecords];
    }
    setVehicleRecords(updated);
    localStorage.setItem('estacionamiento_vehicle_records', JSON.stringify(updated));
    if (fbUser) {
      dbService.saveDocument('vehicleRecords', norm, cleanRecord, fbUser.uid);
    }
  };

  const handleDeleteVehicleRecord = (id: string) => {
    const updated = vehicleRecords.filter(v => v.id !== id && normalizePlate(v.plate) !== id);
    setVehicleRecords(updated);
    localStorage.setItem('estacionamiento_vehicle_records', JSON.stringify(updated));
    if (fbUser) {
      dbService.deleteDocument('vehicleRecords', id, fbUser.uid);
    }
  };

  const handleSyncFromHistory = () => {
    const recordMap = new Map<string, VehicleRecord>();
    const now = new Date().toISOString();

    // Cargar existentes
    vehicleRecords.forEach(r => recordMap.set(r.id, r));

    // 1. Sesiones de estacionamiento
    sessions.forEach(s => {
      const norm = normalizePlate(s.plate);
      if (!norm) return;
      if (!recordMap.has(norm)) {
        recordMap.set(norm, {
          id: norm,
          plate: formatPlate(norm),
          vehicleType: s.vehicleType || 'auto',
          brand: s.brand || '',
          model: s.model || '',
          color: s.color || '',
          year: s.year || '',
          clientName: s.clientName || '',
          clientPhone: s.clientPhone || '',
          internalNotes: s.notes || '',
          vipStatus: false,
          alertFlag: false,
          createdAt: s.entryTime || now,
          updatedAt: now
        });
      } else {
        const existing = recordMap.get(norm)!;
        if (!existing.brand && s.brand) existing.brand = s.brand;
        if (!existing.model && s.model) existing.model = s.model;
        if (!existing.color && s.color) existing.color = s.color;
        if (!existing.clientName && s.clientName) existing.clientName = s.clientName;
        if (!existing.clientPhone && s.clientPhone) existing.clientPhone = s.clientPhone;
        existing.updatedAt = now;
      }
    });

    // 2. Cotizaciones
    quotes.forEach(q => {
      if (!q.plate) return;
      const norm = normalizePlate(q.plate);
      if (!norm) return;
      if (!recordMap.has(norm)) {
        recordMap.set(norm, {
          id: norm,
          plate: formatPlate(norm),
          vehicleType: q.vehicleType || 'auto',
          brand: q.brand || '',
          model: q.model || '',
          clientName: q.clientName || '',
          clientRut: q.clientRut || '',
          clientPhone: q.clientPhone || '',
          clientEmail: q.clientEmail || '',
          internalNotes: q.notes || '',
          vipStatus: false,
          alertFlag: false,
          createdAt: q.createdAt || now,
          updatedAt: now
        });
      }
    });

    // 3. Suscripciones nocturnas
    nightSubscriptions.forEach(ns => {
      const norm = normalizePlate(ns.plate);
      if (!norm) return;
      if (!recordMap.has(norm)) {
        recordMap.set(norm, {
          id: norm,
          plate: formatPlate(norm),
          vehicleType: ns.vehicleType || 'auto',
          brand: ns.brand || '',
          model: ns.model || '',
          color: ns.color || '',
          clientName: ns.clientName || '',
          clientRut: ns.clientRut || '',
          clientPhone: ns.clientPhone || '',
          clientEmail: ns.clientEmail || '',
          internalNotes: ns.notes || 'Suscriptor Mensual Nocturno',
          vipStatus: true,
          alertFlag: false,
          createdAt: ns.startDate || now,
          updatedAt: now
        });
      }
    });

    const mergedList = Array.from(recordMap.values());
    setVehicleRecords(mergedList);
    localStorage.setItem('estacionamiento_vehicle_records', JSON.stringify(mergedList));
    if (fbUser) {
      mergedList.forEach(rec => {
        dbService.saveDocument('vehicleRecords', rec.id, rec, fbUser.uid);
      });
    }
  };

  // Callback: Guardar lista de usuarios administrados
  const handleSaveUsers = (newUsers: AppUser[]) => {
    setUsers(newUsers);
    localStorage.setItem('estacionamiento_users', JSON.stringify(newUsers));
    if (fbUser) {
      dbService.saveDocument('users', 'list', { list: newUsers }, fbUser.uid);
    }
    
    // Si el usuario activo fue eliminado (teóricamente bloqueado por UI, pero por seguridad)
    if (currentUser && !newUsers.some(u => u.id === currentUser.id)) {
      const firstAdmin = newUsers.find(u => u.role === 'admin') || newUsers[0];
      setCurrentUser(firstAdmin);
      localStorage.setItem('estacionamiento_current_user', JSON.stringify(firstAdmin));
    }
  };

  // Callback: Guardar ajustes de tarifas
  const handleSaveSettings = (newSettings: TariffSettings) => {
    setSettings(newSettings);
    localStorage.setItem('estacionamiento_settings', JSON.stringify(newSettings));
    if (fbUser) {
      dbService.saveDocument('settings', 'config', newSettings, fbUser.uid);
    }
  };

  // Callback: Guardar capacidad
  const handleSaveCapacity = (newCapacity: number) => {
    setCapacity(newCapacity);
    localStorage.setItem('estacionamiento_capacity', String(newCapacity));
    if (fbUser) {
      dbService.saveDocument('capacity', 'config', { value: newCapacity }, fbUser.uid);
    }
  };

  // Callback: Restaurar base de datos a los datos demostrativos iniciales
  const handleResetData = async () => {
    const seeds = getSeedSessions();
    const defaults = getDefaultTariffSettings();
    const seedCash = getSeedCashSessions();
    const seedInv = getSeedInventoryItems();
    const seedSales = getSeedAccessorySales();
    const seedBookings = getSeedBookings();
    
    setSessions(seeds);
    setSettings(defaults);
    setCapacity(20);
    setCashSessions(seedCash);
    setInventory(seedInv);
    setAccessorySales(seedSales);
    setBookings(seedBookings);

    localStorage.setItem('estacionamiento_sessions', JSON.stringify(seeds));
    localStorage.setItem('estacionamiento_settings', JSON.stringify(defaults));
    localStorage.setItem('estacionamiento_capacity', '20');
    localStorage.setItem('estacionamiento_cash_sessions', JSON.stringify(seedCash));
    localStorage.setItem('estacionamiento_inventory', JSON.stringify(seedInv));
    localStorage.setItem('estacionamiento_accessory_sales', JSON.stringify(seedSales));
    localStorage.setItem('estacionamiento_bookings', JSON.stringify(seedBookings));

    if (fbUser) {
      for (const s of seeds) await dbService.saveDocument('sessions', s.id, s, fbUser.uid);
      await dbService.saveDocument('settings', 'config', defaults, fbUser.uid);
      await dbService.saveDocument('capacity', 'config', { value: 20 }, fbUser.uid);
      for (const c of seedCash) await dbService.saveDocument('cashSessions', c.id, c, fbUser.uid);
      for (const i of seedInv) await dbService.saveDocument('inventory', i.id, i, fbUser.uid);
      for (const sa of seedSales) await dbService.saveDocument('accessorySales', sa.id, sa, fbUser.uid);
      for (const b of seedBookings) await dbService.saveDocument('bookings', b.id, b, fbUser.uid);
    }
  };

  // Callback: Importar datos JSON
  const handleImportData = async (importedData: { 
    sessions: ParkingSession[]; 
    settings: TariffSettings; 
    capacity: number; 
    cashSessions?: CashSession[];
    inventory?: InventoryItem[];
    accessorySales?: AccessorySale[];
  }) => {
    if (importedData.sessions) {
      setSessions(importedData.sessions);
      localStorage.setItem('estacionamiento_sessions', JSON.stringify(importedData.sessions));
      if (fbUser) {
        for (const s of importedData.sessions) await dbService.saveDocument('sessions', s.id, s, fbUser.uid);
      }
    }
    if (importedData.settings) {
      setSettings(importedData.settings);
      localStorage.setItem('estacionamiento_settings', JSON.stringify(importedData.settings));
      if (fbUser) {
        await dbService.saveDocument('settings', 'config', importedData.settings, fbUser.uid);
      }
    }
    if (importedData.capacity) {
      setCapacity(importedData.capacity);
      localStorage.setItem('estacionamiento_capacity', String(importedData.capacity));
      if (fbUser) {
        await dbService.saveDocument('capacity', 'config', { value: importedData.capacity }, fbUser.uid);
      }
    }
    if (importedData.cashSessions) {
      setCashSessions(importedData.cashSessions);
      localStorage.setItem('estacionamiento_cash_sessions', JSON.stringify(importedData.cashSessions));
      if (fbUser) {
        for (const c of importedData.cashSessions) await dbService.saveDocument('cashSessions', c.id, c, fbUser.uid);
      }
    }
    if (importedData.inventory) {
      setInventory(importedData.inventory);
      localStorage.setItem('estacionamiento_inventory', JSON.stringify(importedData.inventory));
      if (fbUser) {
        for (const i of importedData.inventory) await dbService.saveDocument('inventory', i.id, i, fbUser.uid);
      }
    }
    if (importedData.accessorySales) {
      setAccessorySales(importedData.accessorySales);
      localStorage.setItem('estacionamiento_accessory_sales', JSON.stringify(importedData.accessorySales));
      if (fbUser) {
        for (const sa of importedData.accessorySales) await dbService.saveDocument('accessorySales', sa.id, sa, fbUser.uid);
      }
    }
  };

  // Callback: Exportar datos JSON para descarga
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ sessions, settings, capacity, cashSessions, inventory, accessorySales }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `respaldo_estacionamiento_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Callbacks para el sistema de Agenda / Reservas
  const saveBookingsToStorage = (newBookings: ServiceBooking[]) => {
    setBookings(newBookings);
    localStorage.setItem('estacionamiento_bookings', JSON.stringify(newBookings));
  };

  const handleAddBooking = (booking: ServiceBooking) => {
    const updated = [booking, ...bookings];
    saveBookingsToStorage(updated);
    if (fbUser) {
      dbService.saveDocument('bookings', booking.id, booking, fbUser.uid);
    }
  };

  const handleUpdateBookingStatus = (id: string, status: 'approved' | 'rejected' | 'completed', rejectionReason?: string) => {
    let updatedBooking: ServiceBooking | null = null;
    const updated = bookings.map(b => {
      if (b.id === id) {
        updatedBooking = { ...b, status, rejectionReason };
        return updatedBooking;
      }
      return b;
    });
    saveBookingsToStorage(updated);
    if (fbUser && updatedBooking) {
      dbService.saveDocument('bookings', id, updatedBooking, fbUser.uid);
    }
  };

  const handleDeleteBooking = (id: string) => {
    const updated = bookings.filter(b => b.id !== id);
    saveBookingsToStorage(updated);
    if (fbUser) {
      dbService.deleteDocument('bookings', id, fbUser.uid);
    }
  };

  const handleActivateSessionFromBooking = (booking: ServiceBooking) => {
    // Verificar si el vehículo ya se encuentra activo
    const activeSessions = sessions.filter(s => s.status === 'active');
    const alreadyParked = activeSessions.find(s => s.plate.replace(/\W/g, '').toUpperCase() === booking.plate.replace(/\W/g, '').toUpperCase());
    if (alreadyParked) {
      alert(`El vehículo con patente ${booking.plate} ya se encuentra registrado con un ingreso activo.`);
      return;
    }

    // Registrar ingreso
    handleRegisterEntry({
      plate: booking.plate,
      vehicleType: booking.vehicleType,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      entryTime: new Date().toISOString(),
      notes: booking.notes ? `Reserva #${booking.id}: ${booking.notes}` : `Reserva #${booking.id}`
    });

    // Marcar la cita como completada
    handleUpdateBookingStatus(booking.id, 'completed');
  };

  // Handlers para Cotizaciones
  const handleSaveQuote = (quote: ServiceQuote) => {
    const exists = quotes.some(q => q.id === quote.id);
    const updated = exists ? quotes.map(q => q.id === quote.id ? quote : q) : [quote, ...quotes];
    setQuotes(updated);
    localStorage.setItem('estacionamiento_quotes', JSON.stringify(updated));
    if (fbUser) {
      dbService.saveDocument('quotes', quote.id, quote, fbUser.uid);
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    const updated = quotes.filter(q => q.id !== quoteId);
    setQuotes(updated);
    localStorage.setItem('estacionamiento_quotes', JSON.stringify(updated));
    if (fbUser) {
      dbService.deleteDocument('quotes', quoteId, fbUser.uid);
    }
  };

  // Handlers para Suscripciones Nocturnas
  const handleSaveNightSubscription = (sub: NightSubscription) => {
    const exists = nightSubscriptions.some(s => s.id === sub.id);
    const updated = exists ? nightSubscriptions.map(s => s.id === sub.id ? sub : s) : [sub, ...nightSubscriptions];
    setNightSubscriptions(updated);
    localStorage.setItem('estacionamiento_night_subs', JSON.stringify(updated));
    if (fbUser) {
      dbService.saveDocument('nightSubscriptions', sub.id, sub, fbUser.uid);
    }
  };

  const handleRegisterNightPayment = (subId: string, amount: number, paymentMethod: PaymentMethod, periodMonth: string) => {
    const today = new Date();
    let updatedSub: NightSubscription | null = null;
    const updated = nightSubscriptions.map(s => {
      if (s.id === subId) {
        const currentExpiry = new Date(s.expiryDate);
        const baseDate = currentExpiry > today ? currentExpiry : today;
        const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

        const newPayRecord = {
          id: `pay-${Date.now()}`,
          paymentDate: today.toISOString(),
          periodMonth,
          amount,
          paymentMethod
        };

        updatedSub = {
          ...s,
          status: 'al_dia' as const,
          expiryDate: newExpiry,
          lastPaymentDate: today.toISOString(),
          paymentHistory: [newPayRecord, ...s.paymentHistory]
        };
        return updatedSub;
      }
      return s;
    });
    setNightSubscriptions(updated);
    localStorage.setItem('estacionamiento_night_subs', JSON.stringify(updated));
    if (fbUser && updatedSub) {
      dbService.saveDocument('nightSubscriptions', subId, updatedSub, fbUser.uid);
    }
  };

  const handleDeleteNightSubscription = (subId: string) => {
    const updated = nightSubscriptions.filter(s => s.id !== subId);
    setNightSubscriptions(updated);
    localStorage.setItem('estacionamiento_night_subs', JSON.stringify(updated));
    if (fbUser) {
      dbService.deleteDocument('nightSubscriptions', subId, fbUser.uid);
    }
  };

  // Métricas rápidas del navbar
  const activeCount = sessions.filter(s => s.status === 'active').length;

  const isTabRestricted = currentUser?.role === 'operador' && ['dashboard', 'servicios', 'lavado', 'caja', 'tienda', 'settings'].includes(activeTab);

  if (isClientMode) {
    return (
      <ClientPortal 
        sessions={sessions} 
        settings={settings} 
        initialPlate={clientPlateParam}
        companyLogo={companyLogo}
        bookings={bookings}
        onAddBooking={handleAddBooking}
        onClose={() => {
          setIsClientMode(false);
          setClientPlateParam('');
          // Limpiar el query param de la URL sin recargar la página
          const url = new URL(window.location.href);
          url.searchParams.delete('plate');
          window.history.pushState({}, '', url.toString());
        }}
      />
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-500 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500 font-sans">
          Sincronizando con la nube...
        </p>
      </div>
    );
  }

  if (!fbUser) {
    return <AuthScreen onAuthSuccess={(user) => setFbUser(user)} />;
  }

  if (isAppLocked) {
    return (
      <LockScreen
        users={users}
        initialUser={currentUser}
        companyLogo={companyLogo}
        onUnlock={(user) => {
          setCurrentUser(user);
          localStorage.setItem('estacionamiento_current_user', JSON.stringify(user));
          if (user.role === 'operador') {
            setActiveTab('active');
          } else {
            setActiveTab('dashboard');
          }
          setIsAppLocked(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 flex flex-col font-sans antialiased selection:bg-blue-900 selection:text-white">
      
      {/* Encabezado Superior (Brand & Reloj) */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center gap-3">
            {companyLogo && showLogoInHeader ? (
              <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center p-1 shadow-lg overflow-hidden">
                <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-900/30">
                B
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">BAMO CONTROL</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Gestión de Estacionamiento v2.4</p>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            {/* Selector de Usuario / Sesión Activa */}
            {currentUser && (
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 rounded-xl px-3.5 py-1.5 transition-all cursor-pointer">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    currentUser.role === 'admin' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-[11px] font-bold text-white leading-tight flex items-center gap-1 font-sans">
                      {currentUser.name}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono font-bold leading-none mt-0.5">
                      {currentUser.role === 'admin' ? '👑 Admin' : '🛠️ Operador'}
                    </p>
                  </div>
                  <select
                    value={currentUser.id}
                    onChange={(e) => {
                      const user = users.find(u => u.id === e.target.value);
                      if (user) {
                        setSelectedUserToSwitch(user);
                        setPinInput('');
                        setPinError('');
                        setShowSwitchUserModal(true);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Cambiar de usuario"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === 'admin' ? 'Admin' : 'Operador'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Botón para bloquear terminal */}
            <button
              onClick={() => setIsAppLocked(true)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 p-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Bloquear Terminal"
            >
              <Lock className="w-4 h-4 text-blue-500" />
            </button>

            {/* Botón para cerrar sesión en la nube */}
            <button
              onClick={async () => {
                if (confirm('¿Está seguro que desea cerrar sesión en la nube de Firebase?')) {
                  await authService.signOut();
                }
              }}
              className="bg-slate-900 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-900/40 text-slate-400 hover:text-rose-400 p-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Cerrar Sesión en la Nube"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>

            {/* Estado */}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Sistema</p>
              <p className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                ● EN VIVO
              </p>
            </div>

            {/* Reloj del sistema */}
            <div className="text-right bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <div className="text-xs font-mono">
                <p className="font-bold text-slate-100">
                  {systemTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[9px] text-slate-400 uppercase">
                  {systemTime.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Ocupación Badge Rápido */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cupos Utilizados</span>
              <span className="text-xs font-bold text-blue-400 mt-0.5 font-mono">
                {activeCount} / {capacity} ({Math.round((activeCount / capacity) * 100)}%)
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Navegación de Pestañas */}
      <nav className="bg-slate-900/80 border-b border-slate-800/60 sticky top-[68px] z-30 px-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-2.5 scrollbar-none">
          
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Panel de Control
            </button>
          )}

          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Car className="w-4 h-4" />
            Ingresos Activos
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              activeTab === 'active' 
                ? 'bg-white text-blue-600' 
                : 'bg-slate-850 text-blue-400 border border-slate-800'
            }`}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lavado')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === 'lavado'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Waves className="w-4 h-4" />
            Lavado de Vehículos
          </button>

          <button
            onClick={() => setActiveTab('caja')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === 'caja'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Caja y Turnos
            {cashSessions.some(s => s.status === 'open') && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tienda')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === 'tienda' || activeTab === 'cotizaciones' || activeTab === 'nocturno'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-blue-300" />
            Accesorios y Tienda
            {inventory.some(item => item.stock <= item.minStock) && (
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('vehiculos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === 'vehiculos'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            Base de Vehículos
            {vehicleRecords.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-slate-850 text-emerald-300 border border-emerald-800/60">
                {vehicleRecords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 border border-dashed cursor-pointer ${
              activeTab === 'portal'
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                : 'text-blue-400 border-blue-950/40 hover:text-white hover:bg-blue-950/20'
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            Portal Clientes (QR)
            <span className="bg-blue-950 text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold text-blue-300 uppercase">Nuevo</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Tarifas y Ajustes
            </button>
          )}

        </div>
      </nav>

      {/* Contenido Principal de la Aplicación */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8">
        
        {isTabRestricted ? (
          <div className="bg-slate-950/40 p-12 rounded-2xl border border-slate-800/80 shadow-2xl max-w-lg mx-auto text-center backdrop-blur-md space-y-6 animate-fade-in my-12">
            <div className="w-16 h-16 rounded-full bg-rose-950/35 border border-rose-900/60 flex items-center justify-center mx-auto text-rose-500 shadow-xl shadow-rose-950/20">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Acceso Restringido</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                El usuario actual <strong>{currentUser?.name}</strong> tiene el rol de <strong>Operador (Prestador de Servicios)</strong>. Su acceso está limitado exclusivamente a registrar ingresos de estacionamiento.
              </p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850/80 text-[11px] text-slate-500 font-medium leading-relaxed">
              Para desbloquear estas funciones de administración, caja, lavado o inventario, inicie sesión con una cuenta de Administrador desde el menú superior derecho.
            </div>
            <button
              onClick={() => {
                const adminUser = users.find(u => u.role === 'admin');
                if (adminUser) {
                  setSelectedUserToSwitch(adminUser);
                  setPinInput('');
                  setPinError('');
                  setShowSwitchUserModal(true);
                }
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-900/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Cambiar a Administrador
            </button>
          </div>
        ) : (
          <>
            {/* Render Tab Seleccionado */}
            {activeTab === 'dashboard' && (
              <Dashboard 
                sessions={sessions} 
                settings={settings} 
                capacity={capacity} 
                currentUser={currentUser}
                onDeleteSession={handleDeleteSession}
                onUpdateSession={handleUpdateSession}
                accessorySales={accessorySales}
                isCashOpen={cashSessions.some(s => s.status === 'open')}
                onSellAccessory={handleSellAccessory}
                bookings={bookings}
                onAddBooking={handleAddBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
                onActivateSessionFromBooking={handleActivateSessionFromBooking}
              />
            )}

            {activeTab === 'active' && (
              <ActiveParking 
                sessions={sessions} 
                settings={settings} 
                capacity={capacity} 
                onRegisterEntry={handleRegisterEntry}
                onCheckout={handleCheckout}
                currentUser={currentUser}
                users={users}
                onDeleteSession={handleDeleteSession}
                onUpdateSession={handleUpdateSession}
                companyLogo={companyLogo}
                showLogoInTicket={showLogoInTicket}
                vehicleRecords={vehicleRecords}
                onSaveVehicleRecord={handleSaveVehicleRecord}
              />
            )}

            {activeTab === 'lavado' && (
              <CarWashManagement 
                sessions={sessions}
                accessorySales={accessorySales}
                settings={settings}
                isCashOpen={cashSessions.some(s => s.status === 'open')}
                onSellAccessory={handleSellAccessory}
              />
            )}

            {activeTab === 'caja' && (
              <CashRegister 
                sessions={sessions}
                settings={settings}
                cashSessions={cashSessions}
                accessorySales={accessorySales}
                onOpenCash={handleOpenCash}
                onCloseCash={handleCloseCash}
                onAddMovement={handleAddMovement}
              />
            )}

            {(activeTab === 'tienda' || activeTab === 'cotizaciones' || activeTab === 'nocturno') && (
              <div className="space-y-6">
                {/* Selector de Subcategorías de Tienda y Servicios */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl w-full sm:w-auto shadow-xl backdrop-blur-md">
                  <button
                    onClick={() => {
                      setActiveTab('tienda');
                      setStoreSubTab('tienda');
                    }}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      (activeTab === 'tienda' && storeSubTab === 'tienda')
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-blue-300" />
                    <span>Catálogo y Tienda</span>
                    {inventory.some(item => item.stock <= item.minStock) && (
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tienda');
                      setStoreSubTab('cotizaciones');
                    }}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      (activeTab === 'cotizaciones' || (activeTab === 'tienda' && storeSubTab === 'cotizaciones'))
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Cotizaciones</span>
                    {quotes.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-900/90 text-blue-300 border border-blue-800/50">
                        {quotes.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('tienda');
                      setStoreSubTab('nocturno');
                    }}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      (activeTab === 'nocturno' || (activeTab === 'tienda' && storeSubTab === 'nocturno'))
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 border border-indigo-500/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Mensual Nocturno</span>
                    {nightSubscriptions.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-900/90 text-indigo-300 border border-indigo-800/50">
                        {nightSubscriptions.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Subcategoría 1: Tienda e Inventario */}
                {(activeTab === 'tienda' && storeSubTab === 'tienda') && (
                  <InventoryShop 
                    settings={settings}
                    inventory={inventory}
                    accessorySales={accessorySales}
                    activeVehicles={sessions.filter(s => s.status === 'active').map(s => s.plate)}
                    isCashOpen={cashSessions.some(s => s.status === 'open')}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onSellAccessory={handleSellAccessory}
                  />
                )}

                {/* Subcategoría 2: Cotizaciones */}
                {(activeTab === 'cotizaciones' || (activeTab === 'tienda' && storeSubTab === 'cotizaciones')) && (
                  <ServiceQuotes
                    quotes={quotes}
                    inventory={inventory}
                    settings={settings}
                    onSaveQuote={handleSaveQuote}
                    onDeleteQuote={handleDeleteQuote}
                  />
                )}

                {/* Subcategoría 3: Abono Nocturno */}
                {(activeTab === 'nocturno' || (activeTab === 'tienda' && storeSubTab === 'nocturno')) && (
                  <NightParkingManagement
                    subscriptions={nightSubscriptions}
                    onSaveSubscription={handleSaveNightSubscription}
                    onRegisterPayment={handleRegisterNightPayment}
                    onDeleteSubscription={handleDeleteNightSubscription}
                    settings={settings}
                  />
                )}
              </div>
            )}

            {activeTab === 'vehiculos' && (
              <VehicleDatabase
                vehicleRecords={vehicleRecords}
                sessions={sessions}
                quotes={quotes}
                nightSubscriptions={nightSubscriptions}
                onSaveVehicleRecord={handleSaveVehicleRecord}
                onDeleteVehicleRecord={handleDeleteVehicleRecord}
                onSyncFromHistory={handleSyncFromHistory}
                onNavigateToService={(tab) => {
                  if (tab === 'cotizaciones') {
                    setActiveTab('tienda');
                    setStoreSubTab('cotizaciones');
                  } else if (tab === 'nocturno') {
                    setActiveTab('tienda');
                    setStoreSubTab('nocturno');
                  } else {
                    setActiveTab(tab as any);
                  }
                }}
              />
            )}

            {activeTab === 'portal' && (
              <ClientPortal 
                sessions={sessions} 
                settings={settings} 
                companyLogo={companyLogo}
                bookings={bookings}
                onAddBooking={handleAddBooking}
              />
            )}

            {activeTab === 'settings' && (
              <TariffsConfig 
                settings={settings} 
                capacity={capacity} 
                onSaveSettings={handleSaveSettings}
                onSaveCapacity={handleSaveCapacity}
                onResetData={handleResetData}
                onImportData={handleImportData}
                onExportData={handleExportData}
                users={users}
                onSaveUsers={handleSaveUsers}
                currentUser={currentUser}
                companyLogo={companyLogo}
                showLogoInHeader={showLogoInHeader}
                showLogoInTicket={showLogoInTicket}
                onUpdateLogoSettings={handleUpdateLogoSettings}
              />
            )}
          </>
        )}

      </main>

      {/* Footer Informacional */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 px-6 text-center text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="flex items-center gap-2 justify-center">
            <Database className="w-4 h-4 text-blue-500 animate-pulse" />
            <span>
              {isFirebaseConfigured 
                ? "Datos persistidos de manera segura en la nube (Firebase Firestore)." 
                : "Datos persistidos en almacenamiento local de navegador (Modo Local/Offline)."}
            </span>
          </p>
          <div className="flex gap-4">
            <span>SOPORTE TÉCNICO: +56 9 1234 5678</span>
            <span className="text-slate-600 italic">v2.4.0 Cloud-Sync</span>
          </div>
        </div>
      </footer>

      {/* MODAL DE CAMBIO DE USUARIO (Verificación de PIN) */}
      {showSwitchUserModal && selectedUserToSwitch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 font-sans">Verificación de PIN</span>
              <button 
                onClick={() => {
                  setShowSwitchUserModal(false);
                  setSelectedUserToSwitch(null);
                  setPinInput('');
                  setPinError('');
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-950 text-blue-400 border border-blue-900/40 flex items-center justify-center mx-auto">
                <Key className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <p className="text-white font-bold text-sm">Confirmar Identidad</p>
                <p className="text-slate-400 text-xs">
                  Por favor, ingrese el PIN de 4 dígitos para ingresar como <strong>{selectedUserToSwitch.name}</strong>:
                </p>
              </div>

              {pinError && (
                <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-2.5 rounded-lg text-xs font-sans">
                  {pinError}
                </div>
              )}

              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPinInput(val);
                  setPinError('');
                  
                  // Auto-submit on 4 digits
                  if (val.length === 4) {
                    if (val === selectedUserToSwitch.pin) {
                      setCurrentUser(selectedUserToSwitch);
                      localStorage.setItem('estacionamiento_current_user', JSON.stringify(selectedUserToSwitch));
                      if (selectedUserToSwitch.role === 'operador') {
                        setActiveTab('active');
                      } else {
                        setActiveTab('dashboard');
                      }
                      setShowSwitchUserModal(false);
                      setSelectedUserToSwitch(null);
                      setPinInput('');
                    } else {
                      setPinError('PIN incorrecto. Intente de nuevo.');
                      setPinInput('');
                    }
                  }
                }}
                className="w-32 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-lg font-mono font-black text-center text-white tracking-widest focus:outline-hidden focus:border-blue-500"
              />

              <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                Prueba PINs: Admin: <strong>1234</strong> | Operador: <strong>0000</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
