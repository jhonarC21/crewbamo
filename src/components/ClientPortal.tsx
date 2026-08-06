/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ParkingSession, TariffSettings, WashSession, VehicleType, ServiceBooking, PortalClient } from '../types';
import { 
  formatCurrency, 
  formatPlate, 
  calculateMinutes, 
  calculateFee, 
  formatDuration,
  getVehicleTypeLabel,
  DEFAULT_WASH_PACKAGES
} from '../utils/parkingUtils';
import { 
  Car, 
  Clock, 
  Sparkles, 
  Waves, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  QrCode, 
  Share2, 
  ExternalLink,
  ChevronRight,
  Info,
  User,
  Phone,
  Mail,
  ClipboardList,
  CheckCircle,
  PlusCircle,
  LogOut,
  LogIn,
  UserPlus,
  Plus,
  Key,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/firebase';

interface ClientPortalProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  bookings: ServiceBooking[];
  onAddBooking: (booking: ServiceBooking) => void;
  onClose?: () => void; // Optional if we render it as an overlay or inside main app
  initialPlate?: string;
  companyLogo?: string;
}

export default function ClientPortal({ 
  sessions, 
  settings, 
  bookings, 
  onAddBooking, 
  onClose, 
  initialPlate = '', 
  companyLogo 
}: ClientPortalProps) {
  const [searchPlate, setSearchPlate] = useState(initialPlate);
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null);
  const [washSession, setWashSession] = useState<WashSession | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tab activa en el portal de clientes: 'consultar' | 'agendar' | 'mis-reservas'
  const [portalTab, setPortalTab] = useState<'consultar' | 'agendar' | 'mis-reservas'>('consultar');

  // Portal clients state (Registro con Correo)
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loggedClient, setLoggedClient] = useState<PortalClient | null>(null);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Formulario de Reserva de Turnos / Solicitud con Agenda
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formVehicleType, setFormVehicleType] = useState<VehicleType>('auto');
  const [formServiceType, setFormServiceType] = useState<'parking' | 'wash' | 'both'>('both');
  const [formWashPackageId, setFormWashPackageId] = useState('wp-simple');
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [formTime, setFormTime] = useState('12:00');
  const [formNotes, setFormNotes] = useState('');
  
  // Estado de éxito y error de reserva
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [lastCreatedBooking, setLastCreatedBooking] = useState<ServiceBooking | null>(null);

  // Patente para consultar reservas propias
  const [myReservationsPlate, setMyReservationsPlate] = useState('');
  const [myReservations, setMyReservations] = useState<ServiceBooking[]>([]);

  // Plate addition for logged client
  const [newPlateInput, setNewPlateInput] = useState('');
  const [showAddPlate, setShowAddPlate] = useState(false);

  // Load clients and check logged client from localStorage on mount
  useEffect(() => {
    const storedClients = localStorage.getItem('estacionamiento_portal_clients');
    if (storedClients) {
      try {
        setClients(JSON.parse(storedClients));
      } catch (e) {
        console.error('Error loading portal clients:', e);
      }
    }
    
    const savedLog = localStorage.getItem('estacionamiento_logged_client');
    if (savedLog) {
      try {
        const parsed = JSON.parse(savedLog);
        setLoggedClient(parsed);
        // Pre-fill fields
        setFormName(parsed.name);
        setFormPhone(parsed.phone);
        setFormEmail(parsed.email);
        if (parsed.plates && parsed.plates.length > 0) {
          setFormPlate(parsed.plates[0]);
        }
      } catch (e) {
        console.error('Error parsing logged client:', e);
      }
    }
  }, []);

  // Update client lists
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthError('Por favor, ingrese un correo válido.');
      return;
    }

    const existing = clients.find(c => c.email.toLowerCase() === email);
    if (existing) {
      // Log in
      setLoggedClient(existing);
      localStorage.setItem('estacionamiento_logged_client', JSON.stringify(existing));
      setAuthSuccess(`¡Bienvenido de vuelta, ${existing.name}!`);
      
      // Auto pre-fill booking form with client data
      setFormName(existing.name);
      setFormPhone(existing.phone);
      setFormEmail(existing.email);
      if (existing.plates.length > 0) {
        setFormPlate(existing.plates[0]);
      }
      setAuthEmail('');
    } else {
      // Prompt Registration
      setShowRegisterForm(true);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const email = authEmail.trim().toLowerCase();
    const name = regName.trim();
    const phone = regPhone.trim();
    const cleanPlate = regPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!email || !name || !phone || !cleanPlate) {
      setAuthError('Por favor, complete todos los campos de registro.');
      return;
    }

    if (clients.some(c => c.email.toLowerCase() === email)) {
      setAuthError('Este correo ya se encuentra registrado.');
      return;
    }

    const newClient: PortalClient = {
      id: `client-${Date.now()}`,
      email,
      name,
      phone,
      plates: [cleanPlate],
      createdAt: new Date().toISOString()
    };

    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    localStorage.setItem('estacionamiento_portal_clients', JSON.stringify(updatedClients));

    setLoggedClient(newClient);
    localStorage.setItem('estacionamiento_logged_client', JSON.stringify(newClient));
    setAuthSuccess(`¡Registro exitoso! Bienvenido, ${newClient.name}.`);

    // Pre-fill
    setFormName(newClient.name);
    setFormPhone(newClient.phone);
    setFormEmail(newClient.email);
    setFormPlate(cleanPlate);

    // Reset register fields
    setShowRegisterForm(false);
    setRegName('');
    setRegPhone('');
    setRegPlate('');
    setAuthEmail('');
  };

  const handleLogout = () => {
    setLoggedClient(null);
    localStorage.removeItem('estacionamiento_logged_client');
    setAuthSuccess('');
    setAuthError('');
    // Clear form
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPlate('');
  };

  const handleAddPlateToClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedClient) return;

    const plateToAdd = newPlateInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!plateToAdd) return;

    if (loggedClient.plates.includes(plateToAdd)) {
      alert('Esta patente ya está registrada en su cuenta.');
      return;
    }

    const updatedClient = {
      ...loggedClient,
      plates: [...loggedClient.plates, plateToAdd]
    };

    setLoggedClient(updatedClient);
    localStorage.setItem('estacionamiento_logged_client', JSON.stringify(updatedClient));

    const updatedClients = clients.map(c => c.id === loggedClient.id ? updatedClient : c);
    setClients(updatedClients);
    localStorage.setItem('estacionamiento_portal_clients', JSON.stringify(updatedClients));

    setNewPlateInput('');
    setShowAddPlate(false);
    
    // Select this plate for queries
    setSearchPlate(plateToAdd);
  };

  // Buscar reservas del cliente
  useEffect(() => {
    if (loggedClient) {
      // Filter bookings belonging to this logged client (either by email or registered plates)
      const clientBookings = bookings.filter(b => {
        const matchesEmail = b.clientEmail && b.clientEmail.toLowerCase() === loggedClient.email.toLowerCase();
        const cleanPlate = b.plate.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const matchesPlates = loggedClient.plates.some(p => p.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanPlate);
        return matchesEmail || matchesPlates;
      });
      setMyReservations(clientBookings);
    } else {
      if (!myReservationsPlate.trim()) {
        setMyReservations([]);
        return;
      }
      const cleanPlate = myReservationsPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const clientBookings = bookings.filter(b => b.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate);
      setMyReservations(clientBookings);
    }
  }, [myReservationsPlate, bookings, loggedClient]);

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess(false);

    if (!formName.trim()) {
      setBookingError('Por favor, ingrese su nombre completo.');
      return;
    }
    if (!formPhone.trim()) {
      setBookingError('Por favor, ingrese su teléfono de contacto.');
      return;
    }
    if (!formPlate.trim()) {
      setBookingError('Por favor, ingrese la patente del vehículo.');
      return;
    }
    if (!formDate) {
      setBookingError('Por favor, seleccione una fecha para el servicio.');
      return;
    }
    if (!formTime) {
      setBookingError('Por favor, seleccione una hora de reserva.');
      return;
    }

    const cleanPlate = formPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Buscar paquete seleccionado si corresponde
    let washPackageName = undefined;
    if (formServiceType === 'wash' || formServiceType === 'both') {
      const pkg = DEFAULT_WASH_PACKAGES.find(p => p.id === formWashPackageId);
      washPackageName = pkg ? pkg.name : 'Lavado Personalizado';
    }

    const newBooking: ServiceBooking = {
      id: `book-${Date.now()}`,
      clientName: formName.trim(),
      clientPhone: formPhone.trim(),
      clientEmail: formEmail.trim() || undefined,
      plate: cleanPlate,
      vehicleType: formVehicleType,
      serviceType: formServiceType,
      washPackageId: (formServiceType === 'wash' || formServiceType === 'both') ? formWashPackageId : undefined,
      washPackageName,
      bookingDate: formDate,
      bookingTime: formTime,
      notes: formNotes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    onAddBooking(newBooking);
    
    // Guardar para mostrar recibo
    setLastCreatedBooking(newBooking);
    setBookingSuccess(true);

    // Auto-append plate to client profile if logged in and not present
    if (loggedClient) {
      if (!loggedClient.plates.includes(cleanPlate)) {
        const updatedClient = {
          ...loggedClient,
          plates: [...loggedClient.plates, cleanPlate]
        };
        setLoggedClient(updatedClient);
        localStorage.setItem('estacionamiento_logged_client', JSON.stringify(updatedClient));

        const updatedClients = clients.map(c => c.id === loggedClient.id ? updatedClient : c);
        setClients(updatedClients);
        localStorage.setItem('estacionamiento_portal_clients', JSON.stringify(updatedClients));
      }
    }
    
    // Limpiar formulario excepto cliente recurrente
    setFormPlate('');
    setFormNotes('');
    
    // Redirigir la vista a Mis Reservas para esa patente
    if (!loggedClient) {
      setMyReservationsPlate(cleanPlate);
    }
    setTimeout(() => {
      setPortalTab('mis-reservas');
    }, 1000);
  };

  // Real-time ticking for current fee/duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Tick every 10s to keep it accurate without heavy re-renders
    return () => clearInterval(interval);
  }, []);

  // Fetch the real-time session when list of sessions or searchPlate changes
  useEffect(() => {
    let isMounted = true;

    if (!searchPlate.trim()) {
      setActiveSession(null);
      setWashSession(null);
      setNotFound(false);
      setIsSearching(false);
      return;
    }

    const cleanPlate = searchPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Find active parking session first locally
    const localParking = sessions.find(s => s.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate && s.status === 'active')
      || sessions.find(s => s.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate && s.status === 'completed');

    // Find wash session from localstorage
    const storedWashes = localStorage.getItem('estacionamiento_washes');
    let localWash: WashSession | null = null;
    if (storedWashes) {
      try {
        const washes: WashSession[] = JSON.parse(storedWashes);
        localWash = washes.find(w => w.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate && w.status !== 'entregado')
          || washes.find(w => w.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate);
      } catch (e) {
        console.error('Error loading washes in portal:', e);
      }
    }

    if (localParking || localWash) {
      setActiveSession(localParking || null);
      setWashSession(localWash || null);
      setNotFound(false);
    }

    // Always perform async search on database/Firestore to ensure remote devices (mobile scans) get the data
    setIsSearching(true);
    dbService.searchSessionByPlate(cleanPlate).then(remote => {
      if (!isMounted) return;
      setIsSearching(false);

      const finalParking = localParking || remote.parking || null;
      const finalWash = localWash || remote.wash || null;

      if (finalParking || finalWash) {
        setActiveSession(finalParking);
        setWashSession(finalWash);
        setNotFound(false);
      } else {
        setActiveSession(null);
        setWashSession(null);
        setNotFound(true);
      }
    }).catch(err => {
      if (!isMounted) return;
      setIsSearching(false);
      if (!localParking && !localWash) {
        setNotFound(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [searchPlate, sessions]);

  // Handle URL change or initial plate detection
  useEffect(() => {
    if (initialPlate) {
      setSearchPlate(initialPlate);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlate = urlParams.get('plate');
      if (urlPlate) {
        setSearchPlate(urlPlate);
      }
    }
  }, [initialPlate]);

  // Generate real-time client link with query parameters
  const getClientLink = (plateCode: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?plate=${plateCode.toUpperCase()}`;
  };

  // Helper to generate QR code API URL
  const getQrCodeUrl = (plateCode: string) => {
    const link = getClientLink(plateCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link)}`;
  };

  const handleCopyLink = (plateCode: string) => {
    const link = getClientLink(plateCode);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Calculate fees and time
  const elapsedMinutes = activeSession 
    ? (activeSession.status === 'active' 
        ? calculateMinutes(activeSession.entryTime, currentTime.toISOString())
        : calculateMinutes(activeSession.entryTime, activeSession.exitTime || currentTime.toISOString())
      )
    : 0;

  const currentFee = activeSession
    ? (activeSession.status === 'active'
        ? calculateFee(elapsedMinutes, settings)
        : (activeSession.chargedAmount || 0)
      )
    : 0;

  // Stepper helper for wash status progress percentages
  const getWashStepDetails = (status: string) => {
    switch (status) {
      case 'espera':
        return {
          percent: 25,
          color: 'from-amber-600 to-amber-500',
          label: 'En Cola de Espera',
          desc: 'Tu vehículo se encuentra en la cola y comenzará a lavarse pronto.',
          step: 1
        };
      case 'lavando':
        return {
          percent: 50,
          color: 'from-blue-600 to-cyan-500',
          label: 'Fase de Lavado Activo',
          desc: 'Estamos aplicando espuma premium y limpiando la carrocería en profundidad.',
          step: 2
        };
      case 'secando':
        return {
          percent: 75,
          color: 'from-violet-600 to-purple-500',
          label: 'Fase de Secado y Aspirado',
          desc: 'Detallado de neumáticos, secado manual con microfibra y aspirado profundo.',
          step: 3
        };
      case 'listo':
        return {
          percent: 100,
          color: 'from-emerald-600 to-teal-500',
          label: '¡Listo para Retiro!',
          desc: 'El servicio ha finalizado con éxito. Tu vehículo brilla y espera por ti.',
          step: 4
        };
      default:
        return {
          percent: 0,
          color: 'from-slate-600 to-slate-500',
          label: 'No registrado',
          desc: 'No hay servicios de estética pendientes en este momento.',
          step: 0
        };
    }
  };

  const washDetails = washSession ? getWashStepDetails(washSession.status) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* HEADER / NAVIGATION BAR */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-4 py-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            {companyLogo ? (
              <div className="bg-slate-950 w-10 h-10 p-1.5 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="bg-blue-600/15 text-blue-400 p-2 rounded-xl border border-blue-900/30">
                <Car className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Portal de Clientes</h1>
              <p className="text-[10px] text-slate-400 font-medium">Auto-consulta y Estado en Tiempo Real</p>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs text-slate-300 rounded-xl font-bold border border-slate-750 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver
            </button>
          )}
        </div>
      </header>

      {/* PORTAL CONTENT */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-6">

        {/* CLIENT PROFILE BANNER (Registro con Correo) */}
        {loggedClient ? (
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3.5 relative overflow-hidden">
            {/* Ambient subtle light glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-900/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400">Sesión de Cliente</h3>
                  <p className="text-sm font-black text-white">{loggedClient.name}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 hover:text-rose-400 text-slate-500 rounded-xl text-[10px] font-bold border border-slate-850/80 flex items-center gap-1 transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850/60 text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 font-sans">
                <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{loggedClient.email}</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans">
                <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{loggedClient.phone}</span>
              </div>
            </div>

            {/* REGISTERED PLATES LIST */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mis Vehículos Registrados</span>
                <button
                  onClick={() => setShowAddPlate(!showAddPlate)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  Agregar Patente
                </button>
              </div>

              {showAddPlate && (
                <form onSubmit={handleAddPlateToClient} className="flex gap-1.5 animate-fade-in mt-1">
                  <input
                    type="text"
                    required
                    placeholder="E.G. ABCD12"
                    value={newPlateInput}
                    onChange={(e) => setNewPlateInput(e.target.value.toUpperCase())}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-[10px] font-mono font-bold uppercase text-white placeholder-slate-700 tracking-wider focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase transition-colors"
                  >
                    Guardar
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-1.5">
                {loggedClient.plates.map((plate) => (
                  <button
                    key={plate}
                    onClick={() => {
                      setSearchPlate(plate);
                      setPortalTab('consultar');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      searchPlate.replace(/[^A-Z0-9]/g, '').toUpperCase() === plate.replace(/[^A-Z0-9]/g, '').toUpperCase() && portalTab === 'consultar'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/30'
                        : 'bg-slate-950 border-slate-850 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <Car className="w-3 h-3 text-blue-400" />
                    {formatPlate(plate)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* REGISTRATION / LOGIN FORM (Acceso Clientes Registrados) */
          <div className="bg-slate-900/40 border border-slate-850/80 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-950/30 border border-blue-900/20 flex items-center justify-center text-blue-400 shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white">Acceso Clientes Registrados</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Regístrese o ingrese con su correo electrónico para solicitar agendar horas de lavado/estacionamiento, asociar sus patentes y ver estados de vehículos en vivo.
                </p>
              </div>
            </div>

            {authSuccess && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-[10px] text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authError && (
              <div className="p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl text-[10px] text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {!showRegisterForm ? (
              <form onSubmit={handleAuthSubmit} className="flex gap-2 text-xs">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    placeholder="Tu correo electrónico (e.g. juan@correo.cl)"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 font-sans"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] uppercase transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Ingresar
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              /* COMPACT NEW CLIENT REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-1 border-t border-slate-850/60 animate-fade-in text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" />
                    Registrar Cuenta Nueva
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-400"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Correo Electrónico</label>
                  <input
                    type="email"
                    disabled
                    value={authEmail}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-slate-500 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Juan Pérez"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-white rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono Móvil *</label>
                    <input
                      type="text"
                      required
                      placeholder="+56912345678"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-white rounded-lg text-xs font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Patente Vehículo Principal *</label>
                  <input
                    type="text"
                    required
                    placeholder="ABCD12 o AB1234"
                    value={regPlate}
                    onChange={(e) => setRegPlate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 text-white rounded-lg text-xs font-mono uppercase tracking-widest focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Completar Registro e Ingresar
                </button>
              </form>
            )}
          </div>
        )}
        
        {/* Subtabs for Client Portal */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/60 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setPortalTab('consultar')}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              portalTab === 'consultar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/35'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </button>
          
          <button
            type="button"
            onClick={() => setPortalTab('agendar')}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              portalTab === 'agendar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/35'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agendar</span>
          </button>
          
          <button
            type="button"
            onClick={() => setPortalTab('mis-reservas')}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              portalTab === 'mis-reservas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/35'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Mis Reservas</span>
          </button>
        </div>

        {portalTab === 'consultar' && (
          <div className="space-y-6 animate-fade-in">
            {/* LICENSE PLATE SEARCH FORM (If not displaying a specific plate) */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-4">
              <div className="space-y-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultar Estado de Vehículo</h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ingrese la patente / placa patente de su vehículo para conocer el costo acumulado, tiempo transcurrido y fase de lavado en vivo.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="e.g. KPDX45 o BBRR90"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold font-mono tracking-widest text-white placeholder-slate-600 uppercase focus:outline-hidden focus:border-blue-500"
                  />
                  <Search className="w-4 h-4 text-slate-600 absolute left-3 top-3" />
                </div>
                {searchPlate && (
                  <button
                    onClick={() => setSearchPlate('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* SEARCHING LOADER */}
            {isSearching && !activeSession && !washSession && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-slate-900/60 border border-blue-900/40 rounded-2xl text-center space-y-3"
              >
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-blue-300">Buscando vehículo en tiempo real en el sistema...</p>
              </motion.div>
            )}

            {/* NOT FOUND SCREEN */}
            {!isSearching && notFound && searchPlate.trim() && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-slate-900/40 border border-rose-950/50 rounded-2xl text-center space-y-4 shadow-xl"
              >
                <div className="w-12 h-12 rounded-full bg-rose-950/30 border border-rose-900/50 flex items-center justify-center mx-auto text-rose-400 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white">Vehículo No Encontrado</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    No encontramos registros activos para la patente <strong className="font-mono text-rose-300">{searchPlate.toUpperCase()}</strong> en este momento.
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl text-[10px] text-slate-500 leading-relaxed text-left font-sans">
                  💡 <strong>¿Qué puede ocurrir?</strong><br />
                  • El vehículo ya se retiró y la sesión fue cerrada.<br />
                  • La patente fue ingresada con algún error de tipeo.<br />
                  • El operador aún no registra el ingreso en el sistema principal.
                </div>
              </motion.div>
            )}

            {/* ACTIVE TICKET DISPLAY */}
            <AnimatePresence mode="wait">
              {(activeSession || washSession) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  
                  {/* CHILEAN STYLE LICENSE PLATE BADGE */}
                  <div className="flex flex-col items-center">
                    <div className="relative bg-white border-3 border-black rounded-lg px-6 py-2.5 shadow-xl select-none w-52 text-center">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-600 flex justify-center items-center text-[5px] text-white font-bold leading-none uppercase tracking-widest font-sans">
                        CL · CHILE
                      </div>
                      <span className="text-2xl font-black text-black font-mono tracking-widest uppercase">
                        {formatPlate(searchPlate)}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center mt-2.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-sans">Consulta Conectada en Vivo</span>
                    </div>
                  </div>

                  {/* SECTION: PARKING SESSION STATUS */}
                  {activeSession && (
                    <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
                      <div className="p-4 bg-slate-950/60 border-b border-slate-800/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-400" />
                          Estado de Estacionamiento
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          activeSession.status === 'active' 
                            ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {activeSession.status === 'active' ? 'En Recinto' : 'Finalizado'}
                        </span>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Tarifa y Tiempo centralizados */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850/60 text-center">
                          <div className="border-r border-slate-850/80 space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tiempo Estadía</span>
                            <p className="text-lg font-black text-white font-mono">
                              {formatDuration(elapsedMinutes)}
                            </p>
                            <p className="text-[9px] text-slate-500">
                              {elapsedMinutes} minutos totales
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tarifa Acumulada</span>
                            <p className="text-lg font-black text-emerald-400 font-mono">
                              {formatCurrency(currentFee)}
                            </p>
                            <p className="text-[9px] text-slate-500">
                              Actualizando en vivo
                            </p>
                          </div>
                        </div>

                        {/* Ficha técnica del ticket */}
                        <div className="grid grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px] mb-0.5">Tipo de Vehículo</span>
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-blue-500" />
                              {getVehicleTypeLabel(activeSession.vehicleType)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] mb-0.5">Hora de Ingreso</span>
                            <span className="font-bold text-slate-200 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {new Date(activeSession.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {(activeSession.brand || activeSession.model) && (
                            <div>
                              <span className="text-slate-500 block text-[10px] mb-0.5">Marca / Modelo</span>
                              <span className="font-bold text-slate-200 block truncate">
                                {[activeSession.brand, activeSession.model].filter(Boolean).join(' ')}
                              </span>
                            </div>
                          )}
                          {(activeSession.color || activeSession.year) && (
                            <div>
                              <span className="text-slate-500 block text-[10px] mb-0.5">Color / Año</span>
                              <span className="font-bold text-slate-200 block truncate">
                                {[activeSession.color, activeSession.year ? `Año ${activeSession.year}` : ''].filter(Boolean).join(' - ')}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500 block text-[10px] mb-0.5">Casillero / Estacionamiento</span>
                            <span className="font-bold text-slate-200">
                              {activeSession.notes?.match(/casillero|slot|estacionamiento\s*(\d+)/i)?.[1] || 'Asignado al ingreso'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] mb-0.5">Modelo Cobro</span>
                            <span className="font-bold text-slate-200 uppercase font-mono text-[10px]">
                              {settings.defaultBlockModel === 'cumulative' ? 'Tramo Acumulado' : settings.defaultBlockModel === 'flat_ranges' ? 'Bloque Fijo' : 'Lineal Fracción'}
                            </span>
                          </div>
                        </div>

                        {/* Aviso amistoso */}
                        {activeSession.status === 'active' && (
                          <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-xl flex gap-2">
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-300 leading-relaxed leading-tight">
                              El valor final del estacionamiento se calcula al momento exacto del cobro físico en la caja de acuerdo a su tiempo de permanencia real.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION: CAR WASH STATUS STEPPER */}
                  {washSession && washDetails && (
                    <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
                      <div className="p-4 bg-slate-950/60 border-b border-slate-800/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Waves className="w-4 h-4 text-blue-400" />
                          Estado de Lavado de Vehículo
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          washSession.status === 'listo' 
                            ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400 animate-bounce' 
                            : 'bg-blue-950 border border-blue-900/60 text-blue-400'
                        }`}>
                          {washSession.status === 'espera' ? 'En espera' : washSession.status === 'lavando' ? 'Lavando' : washSession.status === 'secando' ? 'Secando' : '¡Listo para entrega!'}
                        </span>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Datos del paquete contratado */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Servicio Contratado</span>
                            <p className="text-xs font-bold text-white">{washSession.packageName}</p>
                            {washSession.washerName && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Lavador asignado: {washSession.washerName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Precio</span>
                            <p className="text-sm font-extrabold text-blue-400 font-mono">{formatCurrency(washSession.price)}</p>
                          </div>
                        </div>

                        {/* PROGRESS BAR VISUAL */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span className="font-bold text-white">{washDetails.label}</span>
                            <span className="font-mono font-bold">{washDetails.percent}% completado</span>
                          </div>
                          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-850/40">
                            <motion.div 
                              className={`h-full bg-gradient-to-r ${washDetails.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${washDetails.percent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            {washDetails.desc}
                          </p>
                        </div>

                        {/* STEPPER STEP BY STEP DISPLAY */}
                        <div className="grid grid-cols-4 gap-2 pt-2">
                          {/* Step 1 */}
                          <div className="text-center space-y-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold border transition-all ${
                              washDetails.step >= 1 
                                ? 'bg-amber-950 text-amber-400 border-amber-800' 
                                : 'bg-slate-950 text-slate-600 border-slate-850'
                            }`}>
                              1
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">Espera</span>
                          </div>

                          {/* Step 2 */}
                          <div className="text-center space-y-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold border transition-all ${
                              washDetails.step >= 2 
                                ? 'bg-blue-950 text-blue-400 border-blue-800' 
                                : 'bg-slate-950 text-slate-600 border-slate-850'
                            }`}>
                              2
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">Lavando</span>
                          </div>

                          {/* Step 3 */}
                          <div className="text-center space-y-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold border transition-all ${
                              washDetails.step >= 3 
                                ? 'bg-purple-950 text-purple-400 border-purple-800' 
                                : 'bg-slate-950 text-slate-600 border-slate-850'
                            }`}>
                              3
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">Secando</span>
                          </div>

                          {/* Step 4 */}
                          <div className="text-center space-y-1 animate-pulse">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold border transition-all ${
                              washDetails.step >= 4 
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                                : 'bg-slate-950 text-slate-600 border-slate-850'
                            }`}>
                              ✓
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">Listo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR CODE & LINK GENERATOR CARD FOR DEMONSTRATION */}
                  <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-4 text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-500" />
                        Código QR de Consulta para el Cliente
                      </h3>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                        Este código QR permite que el cliente escanee su ticket físico con su celular para abrir este portal de consulta en tiempo real en cualquier dispositivo.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-200">
                      <img
                        src={getQrCodeUrl(searchPlate)}
                        alt="Código QR del Portal"
                        className="w-36 h-36 mx-auto select-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[8px] text-slate-500 font-bold font-mono tracking-widest mt-1">
                        PATENTE: {searchPlate.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleCopyLink(searchPlate)}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                      </button>
                      <a
                        href={getClientLink(searchPlate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-bold text-white flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir en Nueva Pestaña
                      </a>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* INSTRUCTIONS DISPLAY FOR CLIENT SEARCH */}
            {!searchPlate.trim() && (
              <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-850/80 space-y-4 text-center py-8">
                <div className="w-12 h-12 bg-blue-950/40 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-900/30">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Consulta tu Vehículo en Tiempo Real</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Ingrese la patente del vehículo ingresado al estacionamiento para consultar su estado, tiempo transcurrido, cobro actual o estado de lavado.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {portalTab === 'agendar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-4 animate-fade-in"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                Nueva Solicitud de Servicio
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Regístrese y reserve un cupo en nuestra agenda. Los operadores revisarán y aprobarán su solicitud a la brevedad.
              </p>
            </div>

            {bookingSuccess && lastCreatedBooking && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-xl space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">¡Solicitud Enviada con Éxito!</h4>
                    <p className="text-[10px] text-emerald-300 leading-normal mt-0.5 font-sans">
                      Su reserva ha sido registrada bajo el ID <span className="font-mono font-bold text-white">{lastCreatedBooking.id}</span> en estado <strong>Pendiente</strong>. Redirigiendo a "Mis Reservas" para que pueda hacerle seguimiento.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {bookingError && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-[11px] text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs">
              {/* Sección 1: Datos de Registro */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900/80">
                <div className="flex justify-between items-center border-b border-slate-850 pb-1 mb-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    1. Datos de Contacto
                  </span>
                  {loggedClient && (
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Cuenta Sincronizada
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 font-sans">
                  <label className="text-[10px] font-bold text-slate-400 block">Nombre Completo *</label>
                  <div className="relative font-sans">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Daniel Jara"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      disabled={!!loggedClient}
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                    />
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Teléfono *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="+56912345678"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        disabled={!!loggedClient}
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono disabled:opacity-60"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Email (Opcional)</label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="cliente@correo.cl"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        disabled={!!loggedClient}
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Vehículo */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900/80">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                  2. Vehículo
                </span>

                {loggedClient && loggedClient.plates.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Seleccionar de mis vehículos registrados:</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {loggedClient.plates.map(plate => (
                        <button
                          type="button"
                          key={plate}
                          onClick={() => setFormPlate(plate)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
                            formPlate.toUpperCase() === plate.toUpperCase()
                              ? 'bg-blue-600 border-blue-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {formatPlate(plate)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormPlate('')}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          !loggedClient.plates.includes(formPlate.toUpperCase()) && formPlate !== ''
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Otro Vehículo
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Patente / Placa *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AB1234"
                      value={formPlate}
                      onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase tracking-widest focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Tipo Vehículo *</label>
                    <select
                      value={formVehicleType}
                      onChange={(e) => setFormVehicleType(e.target.value as VehicleType)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="auto">Auto Sedán / Hatchback</option>
                      <option value="suv">SUV / Station Wagon</option>
                      <option value="moto">Motocicleta</option>
                      <option value="camioneta">Camioneta Pick-Up</option>
                      <option value="furgon">Furgón / Van</option>
                      <option value="otro">Otro Tipo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Servicios */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900/80">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                  3. Servicio Solicitado
                </span>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 block">Tipo de Servicio *</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setFormServiceType('parking')}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        formServiceType === 'parking'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Estacionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormServiceType('wash')}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        formServiceType === 'wash'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Solo Lavar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormServiceType('both')}
                      className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        formServiceType === 'both'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Ambos (Full)
                    </button>
                  </div>
                </div>

                {(formServiceType === 'wash' || formServiceType === 'both') && (
                  <div className="space-y-1.5 pt-1 animate-fade-in">
                    <label className="text-[10px] font-bold text-slate-400 block">Plan de Estética / Lavado</label>
                    <select
                      value={formWashPackageId}
                      onChange={(e) => setFormWashPackageId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500"
                    >
                      {DEFAULT_WASH_PACKAGES.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} ({formatCurrency(pkg.priceByVehicleType[formVehicleType] || pkg.priceByVehicleType['auto'])})
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const selectedPkg = DEFAULT_WASH_PACKAGES.find(p => p.id === formWashPackageId);
                      if (!selectedPkg) return null;
                      return (
                        <p className="text-[9px] text-slate-500 italic leading-relaxed mt-1 font-sans">
                          {selectedPkg.description} • Tiempo estimado: {selectedPkg.estimatedMinutes} min.
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Sección 4: Agenda (Fecha y Hora) */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900/80">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                  4. Agenda / Turno
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Fecha del Servicio *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Hora de Llegada *</label>
                    <select
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="08:00">08:00 AM</option>
                      <option value="08:30">08:30 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">13:00 PM</option>
                      <option value="13:30">13:30 PM</option>
                      <option value="14:00">14:00 PM</option>
                      <option value="14:30">14:30 PM</option>
                      <option value="15:00">15:00 PM</option>
                      <option value="15:30">15:30 PM</option>
                      <option value="16:00">16:00 PM</option>
                      <option value="16:30">16:30 PM</option>
                      <option value="17:00">17:00 PM</option>
                      <option value="17:30">17:30 PM</option>
                      <option value="18:00">18:00 PM</option>
                      <option value="18:30">18:30 PM</option>
                      <option value="19:00">19:00 PM</option>
                      <option value="19:30">19:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Indicaciones / Notas</label>
                  <textarea
                    placeholder="e.g. Dejaré las llaves, favor limpiar manchas de barro..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/35 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Registrarse y Confirmar Turno
              </button>
            </form>
          </motion.div>
        )}

        {portalTab === 'mis-reservas' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 animate-fade-in"
          >
            {loggedClient ? (
              <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Búsqueda Automática Sincronizada</h4>
                  <p className="text-[10px] text-slate-400 leading-normal font-sans mt-0.5">
                    Mostrando reservas registradas con tu correo <strong>{loggedClient.email}</strong> y vehículos vinculados (<strong>{loggedClient.plates.map(formatPlate).join(', ')}</strong>).
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis Reservas y Citas</h2>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ingrese la patente / placa patente de su vehículo para conocer el estado de aprobación de sus citas programadas.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. AABB12 o KPDX45"
                      value={myReservationsPlate}
                      onChange={(e) => setMyReservationsPlate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold font-mono tracking-widest text-white placeholder-slate-600 uppercase focus:outline-hidden focus:border-blue-500"
                    />
                    <Search className="w-4 h-4 text-slate-600 absolute left-3 top-3" />
                  </div>
                  {myReservationsPlate && (
                    <button
                      onClick={() => setMyReservationsPlate('')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            {((!loggedClient && myReservationsPlate.trim()) || loggedClient) && myReservations.length === 0 && (
              <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl text-center space-y-2">
                <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">Sin Reservas Programadas</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-normal font-sans">
                  {loggedClient 
                    ? "No hemos encontrado ninguna reserva agendada vinculada a tu correo o patentes registradas." 
                    : `No registramos ninguna reserva en agenda para la patente ${myReservationsPlate ? myReservationsPlate.toUpperCase() : ""}.`} ¡Vaya a la pestaña "Agendar" para solicitar una!
                </p>
              </div>
            )}

            {loggedClient && myReservations.length > 0 && (
              <div className="space-y-3.5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Reservas Encontradas ({myReservations.length})
                </h3>
                {myReservations.map((book) => (
                  <div 
                    key={book.id} 
                    className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-500">ID: {book.id}</span>
                        <h4 className="text-xs font-bold text-white font-sans">{book.clientName}</h4>
                      </div>
                      
                      {/* Status indicator */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        book.status === 'pending'
                          ? 'bg-amber-950/80 border border-amber-900/60 text-amber-400 animate-pulse'
                          : book.status === 'approved'
                          ? 'bg-blue-950/80 border border-blue-900/60 text-blue-400'
                          : book.status === 'completed'
                          ? 'bg-emerald-950/80 border border-emerald-900/60 text-emerald-400'
                          : 'bg-rose-950/80 border border-rose-900/60 text-rose-400'
                      }`}>
                        {book.status === 'pending' ? 'Pendiente' : book.status === 'approved' ? 'Aprobado' : book.status === 'completed' ? 'Completado' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl text-[10px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Vehículo</span>
                        <span className="font-bold text-slate-200">
                          {getVehicleTypeLabel(book.vehicleType)} ({formatPlate(book.plate)})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Servicio</span>
                        <span className="font-bold text-slate-200 capitalize">
                          {book.serviceType === 'parking' ? 'Estacionar' : book.serviceType === 'wash' ? 'Lavado' : 'Ambos'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Fecha Cita</span>
                        <span className="font-bold text-slate-200">{book.bookingDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Hora Pactada</span>
                        <span className="font-bold text-slate-200">{book.bookingTime} Hrs</span>
                      </div>
                    </div>

                    {book.notes && (
                      <p className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg font-sans italic leading-normal">
                        "{book.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loggedClient && myReservations.length > 0 && (
              <div className="space-y-3.5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Reservas Encontradas ({myReservations.length})
                </h3>
                {myReservations.map((book) => (
                  <div 
                    key={book.id} 
                    className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-500">ID: {book.id}</span>
                        <h4 className="text-xs font-bold text-white font-sans">{book.clientName}</h4>
                      </div>
                      
                      {/* Status indicator */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        book.status === 'pending'
                          ? 'bg-amber-950/80 border border-amber-900/60 text-amber-400 animate-pulse'
                          : book.status === 'approved'
                          ? 'bg-blue-950/80 border border-blue-900/60 text-blue-400'
                          : book.status === 'completed'
                          ? 'bg-emerald-950/80 border border-emerald-900/60 text-emerald-400'
                          : 'bg-rose-950/80 border border-rose-900/60 text-rose-400'
                      }`}>
                        {book.status === 'pending' ? 'Pendiente' : book.status === 'approved' ? 'Aprobado' : book.status === 'completed' ? 'Completado' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl text-[10px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Vehículo</span>
                        <span className="font-bold text-slate-200">
                          {getVehicleTypeLabel(book.vehicleType)} ({formatPlate(book.plate)})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Servicio</span>
                        <span className="font-bold text-slate-200 capitalize">
                          {book.serviceType === 'parking' ? 'Estacionar' : book.serviceType === 'wash' ? 'Lavado' : 'Ambos'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Fecha Cita</span>
                        <span className="font-bold text-slate-200">{book.bookingDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Hora Pactada</span>
                        <span className="font-bold text-slate-200">{book.bookingTime} Hrs</span>
                      </div>
                    </div>

                    {book.washPackageName && (
                      <div className="text-[10px] bg-slate-950 p-2 rounded-xl flex justify-between items-center border border-slate-900">
                        <span className="text-slate-500 font-sans">Plan Estética:</span>
                        <span className="font-bold text-blue-400 font-sans">{book.washPackageName}</span>
                      </div>
                    )}

                    {book.notes && (
                      <div className="text-[9px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg leading-tight font-sans">
                        💬 Nota: "{book.notes}"
                      </div>
                    )}

                    {book.status === 'rejected' && book.rejectionReason && (
                      <div className="bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl text-[10px] text-rose-300 font-sans">
                        <strong>Motivo de rechazo:</strong> {book.rejectionReason}
                      </div>
                    )}

                    {book.status === 'approved' && (
                      <div className="bg-blue-950/20 border border-blue-900/30 p-2.5 rounded-xl text-[10px] text-blue-300 leading-normal font-sans">
                        ✓ <strong>Su cita está aprobada.</strong> Le esperamos en el recinto a la hora agendada. Al ingresar, el operador activará su ingreso.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-center py-4 text-[10px] text-slate-500 border-t border-slate-900/60">
        <p>© 2026 Sistema de Estacionamientos Inteligente · Portal de Consulta Segura para Clientes</p>
      </footer>

    </div>
  );
}
