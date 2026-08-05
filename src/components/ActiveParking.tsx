/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ParkingSession, TariffSettings, VehicleType, PaymentMethod, AppUser, VehicleRecord } from '../types';
import PaymentGatewayModal from './PaymentGatewayModal';
import { 
  normalizePlate, 
  formatPlate, 
  calculateMinutes, 
  calculateFee, 
  getVehicleTypeLabel, 
  formatCurrency, 
  formatDuration 
} from '../utils/parkingUtils';
import { 
  PlusCircle, 
  Search, 
  Clock, 
  User, 
  FileText, 
  LogOut, 
  Coins, 
  Info, 
  Phone, 
  CheckCircle,
  XCircle,
  Car,
  AlertTriangle,
  CreditCard,
  Wallet,
  ArrowRightLeft,
  Lock,
  Key,
  QrCode,
  Share2,
  ExternalLink,
  Trash2,
  Globe,
  Printer,
  ShieldAlert,
  Star,
  Database
} from 'lucide-react';
import { print58mmTicket } from '../utils/ticketGenerator';

interface ActiveParkingProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  capacity: number;
  onRegisterEntry: (session: Omit<ParkingSession, 'id' | 'status'>) => void;
  onCheckout: (id: string, exitTime: string, finalAmount: number, paymentMethod: PaymentMethod, notes?: string) => void;
  currentUser?: AppUser | null;
  users?: AppUser[];
  onDeleteSession?: (id: string) => void;
  onUpdateSession?: (session: ParkingSession) => void;
  companyLogo?: string;
  showLogoInTicket?: boolean;
  vehicleRecords?: VehicleRecord[];
  onSaveVehicleRecord?: (record: VehicleRecord) => void;
}

export default function ActiveParking({ 
  sessions, 
  settings, 
  capacity, 
  onRegisterEntry, 
  onCheckout,
  currentUser = null,
  users = [],
  onDeleteSession,
  onUpdateSession,
  companyLogo = '',
  showLogoInTicket = true,
  vehicleRecords = [],
  onSaveVehicleRecord
}: ActiveParkingProps) {
  
  // State para el formulario de ingreso
  const [plateInput, setPlateInput] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Buscar coincidencia en la Base de Datos de Vehículos por Patente
  const matchedVehicleRecord = useMemo(() => {
    if (!vehicleRecords || vehicleRecords.length === 0) return null;
    const norm = normalizePlate(plateInput);
    if (!norm || norm.length < 3) return null;
    return vehicleRecords.find(v => v.id === norm || normalizePlate(v.plate) === norm) || null;
  }, [plateInput, vehicleRecords]);

  // Autocompletar campos cuando se detecta un vehículo existente
  useEffect(() => {
    if (matchedVehicleRecord) {
      if (matchedVehicleRecord.vehicleType) setVehicleType(matchedVehicleRecord.vehicleType);
      if (matchedVehicleRecord.brand) setBrand(matchedVehicleRecord.brand);
      if (matchedVehicleRecord.model) setModel(matchedVehicleRecord.model);
      if (matchedVehicleRecord.color) setColor(matchedVehicleRecord.color);
      if (matchedVehicleRecord.year) setYear(matchedVehicleRecord.year);
      if (matchedVehicleRecord.clientName) setClientName(matchedVehicleRecord.clientName);
      if (matchedVehicleRecord.clientPhone) setClientPhone(matchedVehicleRecord.clientPhone);
    }
  }, [matchedVehicleRecord]);

  // State para búsqueda y filtrado
  const [searchQuery, setSearchQuery] = useState('');
  
  // State para modal de salida/cobro
  const [selectedSessionForCheckout, setSelectedSessionForCheckout] = useState<ParkingSession | null>(null);
  const [manualExitTime, setManualExitTime] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutSurcharge, setCheckoutSurcharge] = useState(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<number | ''>('');

  // State para pasarela de pago electrónico en curso
  const [gatewayParams, setGatewayParams] = useState<{ id: string; exitTime: string; totalToPay: number; notes?: string } | null>(null);

  // States para autorización temporal de Administrador
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [sessionToCheckoutWithAuth, setSessionToCheckoutWithAuth] = useState<ParkingSession | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // States para modal de QR de cliente
  const [showSessionQrModal, setShowSessionQrModal] = useState(false);
  const [selectedSessionForQr, setSelectedSessionForQr] = useState<ParkingSession | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShowSessionQr = (session: ParkingSession) => {
    setSelectedSessionForQr(session);
    setShowSessionQrModal(true);
    setCopiedLink(false);
  };

  // Tick periódico para forzar render del temporizador cada 15 segundos
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 15000); // Actualiza estimados y tiempos cada 15s
    return () => clearInterval(timer);
  }, []);

  // Filtrar sesiones activas
  const activeSessions = sessions.filter(s => s.status === 'active');
  const filteredActive = activeSessions.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    return (
      s.plate.toLowerCase().includes(query) ||
      (s.clientName && s.clientName.toLowerCase().includes(query)) ||
      getVehicleTypeLabel(s.vehicleType).toLowerCase().includes(query)
    );
  });

  // Manejar envío de entrada
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanPlate = normalizePlate(plateInput);
    
    if (!cleanPlate) {
      setFormError('La placa patente es requerida.');
      return;
    }

    if (cleanPlate.length < 4) {
      setFormError('La patente debe tener al menos 4 caracteres.');
      return;
    }

    // Validar si ya está adentro
    const alreadyParked = activeSessions.find(s => normalizePlate(s.plate) === cleanPlate);
    if (alreadyParked) {
      setFormError(`El vehículo con patente ${formatPlate(cleanPlate)} ya se encuentra registrado con un ingreso activo.`);
      return;
    }

    // Validar capacidad
    if (activeSessions.length >= capacity) {
      setFormError('El estacionamiento se encuentra al límite de su capacidad.');
      return;
    }

    onRegisterEntry({
      plate: cleanPlate,
      vehicleType,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      color: color.trim() || undefined,
      year: year.trim() || undefined,
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      entryTime: new Date().toISOString(),
      notes: notes.trim() || undefined
    });

    // Guardar / actualizar automáticamente en la Base de Datos de Vehículos
    if (onSaveVehicleRecord) {
      const now = new Date().toISOString();
      onSaveVehicleRecord({
        id: cleanPlate,
        plate: formatPlate(cleanPlate),
        vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
        year: year.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        internalNotes: matchedVehicleRecord?.internalNotes || notes.trim(),
        vipStatus: matchedVehicleRecord?.vipStatus || false,
        alertFlag: matchedVehicleRecord?.alertFlag || false,
        alertMessage: matchedVehicleRecord?.alertMessage || '',
        createdAt: matchedVehicleRecord?.createdAt || now,
        updatedAt: now
      });
    }

    // Resetear formulario
    setPlateInput('');
    setVehicleType('auto');
    setBrand('');
    setModel('');
    setColor('');
    setYear('');
    setClientName('');
    setClientPhone('');
    setNotes('');
  };

  // Abrir modal de cobro con control de rol
  const handleOperatorOpenCheckout = (session: ParkingSession) => {
    if (currentUser?.role === 'operador') {
      setSessionToCheckoutWithAuth(session);
      setAdminPinInput('');
      setAdminPinError('');
      setShowAdminAuthModal(true);
    } else {
      handleOpenCheckout(session);
    }
  };

  // Abrir modal de cobro
  const handleOpenCheckout = (session: ParkingSession) => {
    setSelectedSessionForCheckout(session);
    setManualExitTime(new Date().toISOString().substring(0, 16)); // Formato para datetime-local input
    setCheckoutNotes(session.notes || '');
    setCheckoutSurcharge(0);
    setCheckoutPaymentMethod('efectivo');
    setCheckoutAmountPaid('');
  };

  // Confirmar salida
  const handleConfirmCheckout = () => {
    if (!selectedSessionForCheckout) return;

    // Convertir la fecha manual local a ISO String
    const exitISO = manualExitTime ? new Date(manualExitTime).toISOString() : new Date().toISOString();
    
    // Validar que la salida no sea anterior a la entrada
    if (new Date(exitISO).getTime() < new Date(selectedSessionForCheckout.entryTime).getTime()) {
      alert('La fecha de salida no puede ser anterior a la hora de ingreso.');
      return;
    }

    const elapsedMins = calculateMinutes(selectedSessionForCheckout.entryTime, exitISO);
    const tariffFee = calculateFee(elapsedMins, settings);
    const totalToPay = tariffFee + checkoutSurcharge;

    let finalNotes = checkoutNotes;
    if (checkoutPaymentMethod === 'efectivo' && typeof checkoutAmountPaid === 'number' && checkoutAmountPaid > 0) {
      const vuelto = checkoutAmountPaid - totalToPay;
      finalNotes = (finalNotes ? finalNotes + ' | ' : '') + `[Paga con $${checkoutAmountPaid.toLocaleString('es-CL')} | Vuelto: $${Math.max(0, vuelto).toLocaleString('es-CL')}]`;
    }

    if (checkoutPaymentMethod === 'tarjeta_online') {
      setGatewayParams({
        id: selectedSessionForCheckout.id,
        exitTime: exitISO,
        totalToPay,
        notes: finalNotes
      });
    } else {
      onCheckout(
        selectedSessionForCheckout.id,
        exitISO,
        totalToPay,
        checkoutPaymentMethod,
        finalNotes
      );
      setSelectedSessionForCheckout(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Columna Izquierda: Formulario de Registro de Ingreso */}
      <div className="lg:col-span-1 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl h-fit space-y-6 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-500" />
            Registrar Ingreso
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Asigne placa patente, categoría de vehículo y notas iniciales.
          </p>
        </div>

        {formError && (
          <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-3.5 rounded-xl text-xs flex gap-2 items-start animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitEntry} className="space-y-4">
          
          {/* Patente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="plate" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Placa Patente <span className="text-rose-400">*</span>
              </label>
              {matchedVehicleRecord && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  <Database className="w-3 h-3" /> Datos Autocompletados
                </span>
              )}
            </div>
            <input
              id="plate"
              type="text"
              required
              placeholder="e.g. AB CD 12 o AB 12 34"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold tracking-widest placeholder:text-slate-600 text-white placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all uppercase"
            />

            {/* Ficha Detectada en Base de Datos */}
            {matchedVehicleRecord && (
              <div className={`mt-2.5 p-3 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                matchedVehicleRecord.alertFlag 
                  ? 'bg-rose-950/60 border-rose-800 text-rose-200' 
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    {matchedVehicleRecord.alertFlag ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    Observación Interna Guardada
                  </span>
                  {matchedVehicleRecord.vipStatus && (
                    <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-black" /> VIP
                    </span>
                  )}
                </div>

                {matchedVehicleRecord.internalNotes ? (
                  <p className="text-[11px] leading-relaxed italic">
                    "{matchedVehicleRecord.internalNotes}"
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Vehículo registrado sin observaciones internas.</p>
                )}

                {matchedVehicleRecord.alertMessage && (
                  <div className="text-[10px] font-bold text-rose-300 bg-rose-900/40 px-2 py-1 rounded border border-rose-800/60">
                    ⚠️ Alerta: {matchedVehicleRecord.alertMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo de Vehículo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Vehículo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { key: 'auto', label: 'Sedan/Auto' },
                { key: 'hatchback', label: 'Hatchback' },
                { key: 'suv', label: 'SUV' },
                { key: 'moto', label: 'Moto' },
                { key: 'bicicleta', label: 'Bicicleta' },
                { key: 'camioneta', label: 'Camioneta' },
                { key: 'furgon', label: 'Furgón' },
                { key: 'otro', label: 'Otro' }
              ] as { key: VehicleType; label: string }[]).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVehicleType(v.key)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all duration-150 uppercase tracking-wider ${
                    vehicleType === v.key
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marca & Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="brand" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Marca <span className="text-slate-500 font-normal italic">(Opcional)</span>
              </label>
              <input
                id="brand"
                type="text"
                placeholder="e.g. Toyota"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="model" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Modelo <span className="text-slate-500 font-normal italic">(Opcional)</span>
              </label>
              <input
                id="model"
                type="text"
                placeholder="e.g. Corolla"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Color & Año */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="color" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Color <span className="text-slate-500 font-normal italic">(Opcional)</span>
              </label>
              <input
                id="color"
                type="text"
                placeholder="e.g. Rojo"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="year" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Año <span className="text-slate-500 font-normal italic">(Opcional)</span>
              </label>
              <input
                id="year"
                type="text"
                maxLength={4}
                placeholder="e.g. 2022"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Nombre Cliente */}
          <div>
            <label htmlFor="clientName" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre del Cliente <span className="text-slate-500 font-normal italic">(Opcional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                id="clientName"
                type="text"
                placeholder="e.g. Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Teléfono Cliente */}
          <div>
            <label htmlFor="clientPhone" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Teléfono de Contacto <span className="text-slate-500 font-normal italic">(Opcional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                id="clientPhone"
                type="tel"
                placeholder="e.g. +56 9 1234 5678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Observaciones <span className="text-slate-500 font-normal italic">(Opcional)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <textarea
                id="notes"
                placeholder="e.g. Detalle visual, sector de estacionado, etc."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder:text-slate-600 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg hover:shadow-blue-900/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Ingresar Vehículo
          </button>
        </form>

        <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-900/40 text-[11px] text-blue-300 space-y-1 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            Control de reingresos
          </p>
          <p>
            Al ingresar una patente que ya tiene un historial anterior, el sistema la asociará automáticamente para mostrarle el conteo de visitas del cliente de forma interactiva.
          </p>
        </div>
      </div>

      {/* Columna Derecha: Listado de Vehículos Estacionados (Activos) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Filtro y Encabezado de Lista */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-500" />
              Vehículos en Estacionamiento ({activeSessions.length})
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Cupos Libres: <span className="font-mono text-emerald-400 font-bold">{Math.max(0, capacity - activeSessions.length)}</span> de {capacity} totales
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar patente o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Grid de Vehículos Estacionados */}
        {filteredActive.length === 0 ? (
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-16 text-center shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-slate-500 flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Car className="w-6 h-6" />
            </div>
            <p className="text-white font-bold text-sm">Sin vehículos en curso</p>
            <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
              {searchQuery ? 'Prueba con otra búsqueda o limpia el filtro.' : 'Usa el panel de la izquierda para registrar el ingreso de un nuevo vehículo al recinto.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActive.map((s) => {
              // Calcular minutos transcurridos en tiempo real
              const mins = calculateMinutes(s.entryTime, new Date().toISOString());
              const currentEstimate = calculateFee(mins, settings);

              return (
                <div 
                  key={s.id} 
                  className="bg-gradient-to-br from-slate-900 to-slate-950/90 p-5 rounded-2xl border border-slate-800/80 hover:border-blue-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 group"
                >
                  {/* Encabezado del auto */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 tracking-wider">
                          {formatPlate(s.plate)}
                        </span>
                        <span className="text-[10px] font-bold uppercase bg-blue-950/50 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded-full">
                          {getVehicleTypeLabel(s.vehicleType)}
                        </span>
                      </div>
                      
                      <div className="text-slate-300 font-semibold text-xs flex items-center gap-1.5 pt-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{s.clientName || 'Cliente Particular'}</span>
                      </div>
                      {(s.brand || s.model || s.color || s.year) && (
                        <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5 pt-0.5">
                          <Car className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {[s.brand, s.model, s.color, s.year ? `(${s.year})` : ''].filter(Boolean).join(' - ')}
                          </span>
                        </div>
                      )}
                      {s.clientPhone && (
                        <div className="text-slate-500 text-[10px] flex items-center gap-1.5 font-bold font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{s.clientPhone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Tarifa Estimada */}
                    <div className="text-right">
                      <span className="text-slate-500 text-[9px] font-bold block uppercase tracking-wider">Estimado</span>
                      <span className="text-base font-mono font-black text-blue-400">
                        {formatCurrency(currentEstimate, settings.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Informaciones del tiempo */}
                  <div className="border-t border-slate-850 pt-3 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-mono">Ingreso: {new Date(s.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => print58mmTicket(s, settings, companyLogo, showLogoInTicket)}
                        className="bg-slate-900 hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 px-2 py-1.5 rounded-lg border border-slate-800 hover:border-emerald-800/60 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                        title="Imprimir Ticket Térmico 58mm de Ingreso"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ticket 58mm</span>
                      </button>
                      <button
                        onClick={() => handleShowSessionQr(s)}
                        className="bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 p-1.5 rounded-lg border border-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                        title="Ver QR de consulta cliente"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <div className="bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2 py-1 rounded-lg font-bold text-[10px] font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                        <span>{formatDuration(mins)}</span>
                      </div>
                    </div>
                  </div>

                  {s.notes && (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 text-xs text-slate-400 line-clamp-2">
                      <span className="font-bold text-slate-300 uppercase text-[9px] tracking-wider">Obs:</span> {s.notes}
                    </div>
                  )}

                   {/* Botón de salida y opción de eliminar para Administrador */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOperatorOpenCheckout(s)}
                      className="flex-1 bg-slate-905 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 font-bold text-xs py-2 rounded-xl border border-slate-800 hover:border-rose-900/60 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {currentUser?.role === 'operador' ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Salida (PIN)</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4.5 h-4.5" />
                          <span>Registrar Salida</span>
                        </>
                      )}
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Está seguro de que desea eliminar permanentemente el ingreso del vehículo con patente ${formatPlate(s.plate)}?\nEsta acción retirará el vehículo sin registrar cobro ni salida oficial.`)) {
                            onDeleteSession?.(s.id);
                          }
                        }}
                        className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl border border-rose-900/30 hover:border-rose-600 transition-all flex items-center justify-center cursor-pointer"
                        title="Eliminar vehículo estacionado (Retiro sin pago)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal de Salida y Cobro */}
      {selectedSessionForCheckout && (() => {
        const exitISO = manualExitTime ? new Date(manualExitTime).toISOString() : new Date().toISOString();
        const mins = calculateMinutes(selectedSessionForCheckout.entryTime, exitISO);
        const tariffFee = calculateFee(mins, settings);
        const totalToPay = tariffFee + Number(checkoutSurcharge || 0);

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800 max-h-[90vh] flex flex-col">
              
              {/* Header Modal */}
              <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">REGISTRO DE EGRESO</span>
                  <h3 className="text-lg font-bold tracking-tight text-white">Cobro y Salida de Vehículo</h3>
                </div>
                <button 
                  onClick={() => setSelectedSessionForCheckout(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4 overflow-y-auto text-slate-200">
                
                {/* Cuadro Resumen Patente */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Placa Patente</span>
                    <span className="font-mono text-xl font-black text-white tracking-widest">
                      {formatPlate(selectedSessionForCheckout.plate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Categoría</span>
                    <span className="text-xs bg-blue-950 text-blue-400 border border-blue-900/40 font-bold px-2.5 py-1 rounded-md block mt-0.5">
                      {getVehicleTypeLabel(selectedSessionForCheckout.vehicleType)}
                    </span>
                  </div>
                </div>

                {/* Cliente */}
                {(selectedSessionForCheckout.clientName || selectedSessionForCheckout.clientPhone) && (
                  <div className="text-xs border-b border-slate-800/60 pb-3 space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Datos del Cliente</span>
                    <p className="text-slate-300 font-bold">{selectedSessionForCheckout.clientName || 'Sin Nombre'}</p>
                    {selectedSessionForCheckout.clientPhone && (
                      <p className="text-slate-400 font-bold font-mono">{selectedSessionForCheckout.clientPhone}</p>
                    )}
                  </div>
                )}

                {/* Detalles del Vehículo */}
                {(selectedSessionForCheckout.brand || selectedSessionForCheckout.model || selectedSessionForCheckout.color || selectedSessionForCheckout.year) && (
                  <div className="text-xs border-b border-slate-800/60 pb-3 space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Detalles del Vehículo</span>
                    <p className="text-slate-300 font-semibold">
                      {[selectedSessionForCheckout.brand, selectedSessionForCheckout.model].filter(Boolean).join(' ')}
                    </p>
                    {(selectedSessionForCheckout.color || selectedSessionForCheckout.year) && (
                      <p className="text-slate-400 font-medium">
                        {[selectedSessionForCheckout.color, selectedSessionForCheckout.year ? `Año ${selectedSessionForCheckout.year}` : ''].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Tiempos de Entrada y Salida */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-800/60 pb-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Hora Ingreso</span>
                    <p className="font-bold text-slate-300 mt-0.5 font-mono">
                      {new Date(selectedSessionForCheckout.entryTime).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Hora Salida (Ajustable)</span>
                    <input
                      type="datetime-local"
                      value={manualExitTime}
                      onChange={(e) => setManualExitTime(e.target.value)}
                      className="w-full bg-slate-950 px-2 py-1 rounded-md border border-slate-800 font-bold text-slate-300 focus:outline-hidden focus:border-blue-500 mt-0.5 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Desglose de Tramos y Cobro */}
                <div className="space-y-2 border-b border-slate-800/60 pb-3 text-xs">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Resumen de Cobro</span>
                  
                  <div className="flex justify-between text-slate-400">
                    <span>Estadía total:</span>
                    <span className="font-bold text-white font-mono">{formatDuration(mins)} ({mins} min)</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Monto por tarifa tramos:</span>
                    <span className="font-bold text-white font-mono">{formatCurrency(tariffFee, settings.currency)}</span>
                  </div>

                  {/* Recargo adicional */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      Recargo Extra:
                      <span className="text-[10px] text-slate-500 font-normal">(e.g. ticket perdido, lavado)</span>
                    </span>
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="text-slate-500 font-bold font-mono">{settings.currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={checkoutSurcharge}
                        onChange={(e) => setCheckoutSurcharge(Number(e.target.value))}
                        className="w-full bg-slate-950 text-right px-1.5 py-0.5 rounded border border-slate-800 font-bold text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Formas de Pago */}
                <div className="space-y-2 border-b border-slate-800/60 pb-3">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Forma de Pago</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('efectivo')}
                      className={`py-2 px-1 rounded-xl border font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        checkoutPaymentMethod === 'efectivo'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Wallet className="w-4 h-4 shrink-0" />
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('debito')}
                      className={`py-2 px-1 rounded-xl border font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        checkoutPaymentMethod === 'debito'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 shrink-0" />
                      Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('transferencia')}
                      className={`py-2 px-1 rounded-xl border font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        checkoutPaymentMethod === 'transferencia'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <ArrowRightLeft className="w-4 h-4 shrink-0" />
                      Transfer.
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('tarjeta_online')}
                      className={`py-2 px-1 rounded-xl border font-bold text-[10px] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        checkoutPaymentMethod === 'tarjeta_online'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                      Pasarela
                    </button>
                  </div>
                </div>

                {/* Cálculo de Vuelto / Cambio en Efectivo */}
                {checkoutPaymentMethod === 'efectivo' && (
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        Monto Entregado por Cliente ($)
                      </label>
                      {checkoutAmountPaid !== '' && Number(checkoutAmountPaid) > 0 && (
                        <button
                          type="button"
                          onClick={() => setCheckoutAmountPaid('')}
                          className="text-[9px] text-slate-500 hover:text-rose-400 font-bold uppercase cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <span className="font-mono text-lg font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder={`e.g. ${totalToPay.toLocaleString('es-CL')}`}
                        value={checkoutAmountPaid}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setCheckoutAmountPaid(val);
                        }}
                        className="w-full bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-base font-mono font-bold text-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    {/* Botones de atajo rápido de billetes */}
                    <div className="grid grid-cols-6 gap-1">
                      {[1000, 2000, 5000, 10000, 20000].map((billete) => (
                        <button
                          key={billete}
                          type="button"
                          onClick={() => setCheckoutAmountPaid(billete)}
                          className="py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 rounded border border-slate-800 transition-colors cursor-pointer"
                        >
                          ${(billete/1000).toFixed(0)}k
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCheckoutAmountPaid(totalToPay)}
                        className="py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 text-[10px] font-bold rounded border border-blue-800 transition-colors cursor-pointer"
                      >
                        Exacto
                      </button>
                    </div>

                    {/* Mostrar Vuelto o Advertencia de Falta */}
                    {checkoutAmountPaid !== '' && Number(checkoutAmountPaid) >= totalToPay && (
                      <div className="bg-emerald-950/60 border border-emerald-800/80 p-3 rounded-xl flex justify-between items-center text-emerald-300 animate-fade-in">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Vuelto / Cambio a Entregar:</span>
                        <span className="text-lg font-mono font-black text-emerald-400">
                          {formatCurrency(Number(checkoutAmountPaid) - totalToPay, settings.currency)}
                        </span>
                      </div>
                    )}

                    {checkoutAmountPaid !== '' && Number(checkoutAmountPaid) < totalToPay && (
                      <div className="bg-amber-950/60 border border-amber-800/80 p-2.5 rounded-xl flex justify-between items-center text-amber-300 text-xs font-bold animate-fade-in">
                        <span className="text-[10px] uppercase">Falta por cubrir:</span>
                        <span className="font-mono text-amber-400">
                          {formatCurrency(totalToPay - Number(checkoutAmountPaid), settings.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notas de Egreso */}
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Notas de Egreso</label>
                  <textarea
                    placeholder="Escriba aquí comentarios finales del cobro o egreso..."
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Total Final */}
                <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-900/40 flex justify-between items-center shadow-lg">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Coins className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider">TOTAL A COBRAR</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {checkoutPaymentMethod === 'efectivo' && 'Pago en Efectivo'}
                        {checkoutPaymentMethod === 'debito' && 'Tarjeta de Débito'}
                        {checkoutPaymentMethod === 'transferencia' && 'Transferencia Bancaria'}
                        {checkoutPaymentMethod === 'tarjeta_online' && 'Pago Electrónico (Pasarela)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    {formatCurrency(totalToPay, settings.currency)}
                  </span>
                </div>


              </div>

              {/* Footer Modal */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 cursor-pointer">
                <button
                  onClick={() => setSelectedSessionForCheckout(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCheckout}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Registrar Salida
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE AUTORIZACIÓN DE ADMINISTRADOR */}
      {showAdminAuthModal && sessionToCheckoutWithAuth && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 flex items-center gap-1 font-sans">
                <Lock className="w-3.5 h-3.5" />
                Seguridad: Autorización Requerida
              </span>
              <button 
                onClick={() => {
                  setShowAdminAuthModal(false);
                  setSessionToCheckoutWithAuth(null);
                  setAdminPinInput('');
                  setAdminPinError('');
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-950/20 border border-rose-900/40 flex items-center justify-center mx-auto text-rose-400">
                <Key className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <p className="text-white font-bold text-sm">Se requiere PIN de Administrador</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Para registrar la salida del vehículo <strong>{formatPlate(sessionToCheckoutWithAuth.plate)}</strong>, un administrador debe autorizar el cobro ingresando su PIN:
                </p>
              </div>

              {adminPinError && (
                <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-2.5 rounded-lg text-xs font-sans">
                  {adminPinError}
                </div>
              )}

              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={adminPinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAdminPinInput(val);
                  setAdminPinError('');
                  
                  if (val.length === 4) {
                    const matchedAdmin = users.find(u => u.role === 'admin' && u.pin === val);
                    if (matchedAdmin) {
                      setShowAdminAuthModal(false);
                      setAdminPinInput('');
                      handleOpenCheckout(sessionToCheckoutWithAuth);
                      setSessionToCheckoutWithAuth(null);
                    } else {
                      setAdminPinError('PIN de Administrador inválido.');
                      setAdminPinInput('');
                    }
                  }
                }}
                className="w-32 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-lg font-mono font-black text-center text-white tracking-widest focus:outline-hidden focus:border-rose-500"
              />

              <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                Pista: El PIN de administrador por defecto es <strong>1234</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CÓDIGO QR PARA EL CLIENTE */}
      {showSessionQrModal && selectedSessionForQr && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 font-sans flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                Acceso en Vivo para Cliente
              </span>
              <button 
                onClick={() => {
                  setShowSessionQrModal(false);
                  setSelectedSessionForQr(null);
                  setCopiedLink(false);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-center">
              <div className="space-y-1">
                <p className="text-white font-bold text-sm">Escaneo de Patente {formatPlate(selectedSessionForQr.plate)}</p>
                <p className="text-slate-400 text-xs">
                  Muestre este código al cliente para que pueda seguir su estadía, tarifas y servicios de lavado en tiempo real desde su celular:
                </p>
              </div>

              {/* QR Image */}
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    window.location.origin + window.location.pathname + '?plate=' + selectedSessionForQr.plate
                  )}`}
                  alt="Código QR del Cliente"
                  className="w-40 h-40 mx-auto select-none"
                  referrerPolicy="no-referrer"
                />
                <div className="text-[9px] text-slate-500 font-bold font-mono tracking-wider mt-1.5">
                  ESCANEAR CON LA CÁMARA
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    const link = window.location.origin + window.location.pathname + '?plate=' + selectedSessionForQr.plate;
                    navigator.clipboard.writeText(link).then(() => {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    });
                  }}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-bold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
                </button>
                <a
                  href={`${window.location.origin}${window.location.pathname}?plate=${selectedSessionForQr.plate}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-bold text-white flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Probar Enlace
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {gatewayParams && selectedSessionForCheckout && (
        <PaymentGatewayModal
          amount={gatewayParams.totalToPay}
          description={`Servicio Estacionamiento - Patente: ${formatPlate(selectedSessionForCheckout.plate)}`}
          plate={selectedSessionForCheckout.plate}
          currency={settings.currency}
          onSuccess={(data) => {
            onCheckout(
              gatewayParams.id,
              gatewayParams.exitTime,
              gatewayParams.totalToPay,
              'tarjeta_online',
              `[Pasarela: ${data.provider} | Transacción: ${data.transactionId} | Aut: ${data.authCode}] ` + (gatewayParams.notes || '')
            );
            setGatewayParams(null);
            setSelectedSessionForCheckout(null);
          }}
          onClose={() => setGatewayParams(null)}
        />
      )}

    </div>
  );
}
