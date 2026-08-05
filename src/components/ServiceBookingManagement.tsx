/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ServiceBooking, VehicleType, ParkingSession, TariffSettings } from '../types';
import { 
  formatCurrency, 
  formatPlate, 
  getVehicleTypeLabel, 
  DEFAULT_WASH_PACKAGES 
} from '../utils/parkingUtils';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Car, 
  Sparkles, 
  Waves, 
  Search, 
  Plus, 
  X, 
  Check, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  ClipboardList, 
  Printer, 
  Play,
  UserPlus,
  HelpCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ServiceBookingManagementProps {
  bookings: ServiceBooking[];
  sessions: ParkingSession[];
  settings: TariffSettings;
  onAddBooking: (booking: ServiceBooking) => void;
  onUpdateBookingStatus: (id: string, status: 'approved' | 'rejected' | 'completed', rejectionReason?: string) => void;
  onDeleteBooking: (id: string) => void;
  onActivateSessionFromBooking: (booking: ServiceBooking) => void;
}

export default function ServiceBookingManagement({
  bookings,
  sessions,
  settings,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking,
  onActivateSessionFromBooking
}: ServiceBookingManagementProps) {
  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | VehicleType>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modal State for Manual Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    plate: '',
    vehicleType: 'auto' as VehicleType,
    serviceType: 'both' as 'parking' | 'wash' | 'both',
    washPackageId: 'wp-simple',
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: '12:00',
    notes: ''
  });

  // Modal State for Rejection Reason
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Stats Calculations
  const totalBookings = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const approvedCount = bookings.filter(b => b.status === 'approved').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const rejectedCount = bookings.filter(b => b.status === 'rejected').length;

  // Filter Bookings
  const filteredBookings = bookings.filter(book => {
    // Search query matches client name, plate, phone, email
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      book.clientName.toLowerCase().includes(query) ||
      book.plate.toLowerCase().includes(query) ||
      book.clientPhone.toLowerCase().includes(query) ||
      (book.clientEmail && book.clientEmail.toLowerCase().includes(query)) ||
      book.id.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || book.vehicleType === vehicleFilter;
    const matchesDate = !dateFilter || book.bookingDate === dateFilter;

    return matchesSearch && matchesStatus && matchesVehicle && matchesDate;
  }).sort((a, b) => {
    // Sort pending first, then by date/time
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(`${a.bookingDate}T${a.bookingTime}`).getTime() - new Date(`${b.bookingDate}T${b.bookingTime}`).getTime();
  });

  const handleCreateManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    let washPackageName = undefined;
    if (newBooking.serviceType === 'wash' || newBooking.serviceType === 'both') {
      const pkg = DEFAULT_WASH_PACKAGES.find(p => p.id === newBooking.washPackageId);
      washPackageName = pkg ? pkg.name : 'Lavado Personalizado';
    }

    const booking: ServiceBooking = {
      id: `book-${Date.now()}`,
      clientName: newBooking.clientName.trim(),
      clientPhone: newBooking.clientPhone.trim(),
      clientEmail: newBooking.clientEmail.trim() || undefined,
      plate: newBooking.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
      vehicleType: newBooking.vehicleType,
      serviceType: newBooking.serviceType,
      washPackageId: (newBooking.serviceType === 'wash' || newBooking.serviceType === 'both') ? newBooking.washPackageId : undefined,
      washPackageName,
      bookingDate: newBooking.bookingDate,
      bookingTime: newBooking.bookingTime,
      notes: newBooking.notes.trim() || undefined,
      status: 'approved', // Manual reservations are approved by default
      createdAt: new Date().toISOString()
    };

    onAddBooking(booking);
    setShowCreateModal(false);
    
    // Reset form
    setNewBooking({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      plate: '',
      vehicleType: 'auto',
      serviceType: 'both',
      washPackageId: 'wp-simple',
      bookingDate: new Date().toISOString().split('T')[0],
      bookingTime: '12:00',
      notes: ''
    });
  };

  const openRejectDialog = (id: string) => {
    setRejectId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (rejectId) {
      onUpdateBookingStatus(rejectId, 'rejected', rejectionReason.trim() || 'Cupo no disponible para este horario');
      setShowRejectModal(false);
      setRejectId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Agenda y Citas de Clientes
          </h2>
          <p className="text-xs text-slate-400">
            Administre solicitudes de reservas online, apruebe turnos y registre reservas telefónicas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/35 self-start cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Cita Manual
        </button>
      </div>

      {/* QUICK BENTO STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 text-slate-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Total</span>
            <span className="text-lg font-black text-white">{totalBookings}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/40 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Pendientes</span>
            <span className="text-lg font-black text-amber-400">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-950/40 text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Aprobados</span>
            <span className="text-lg font-black text-blue-400">{approvedCount}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/40 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Completados</span>
            <span className="text-lg font-black text-emerald-400">{completedCount}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2.5 rounded-xl bg-rose-950/40 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase">Rechazados</span>
            <span className="text-lg font-black text-rose-400">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* FILTER BAR PANEL */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-3.5 items-end">
        {/* Search Query */}
        <div className="w-full md:flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buscador de Clientes / Patente</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Daniel, KPDX45, +569..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Status Tab Toggle */}
        <div className="w-full md:w-auto space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-44 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">🟢 Todos los Estados</option>
            <option value="pending">🕒 Pendientes</option>
            <option value="approved">🔵 Aprobados</option>
            <option value="completed">💚 Completados</option>
            <option value="rejected">🔴 Rechazados</option>
          </select>
        </div>

        {/* Vehicle Filter */}
        <div className="w-full md:w-auto space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehículo</label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value as any)}
            className="w-full md:w-44 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">🚗 Todos los Vehículos</option>
            <option value="auto">Auto Sedán</option>
            <option value="suv">SUV</option>
            <option value="moto">Motocicleta</option>
            <option value="camioneta">Camioneta</option>
            <option value="furgon">Furgón</option>
            <option value="otro">Otros</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="w-full md:w-auto space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filtrar Fecha</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || statusFilter !== 'all' || vehicleFilter !== 'all' || dateFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setVehicleFilter('all');
              setDateFilter('');
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs whitespace-nowrap transition-colors self-start md:self-auto cursor-pointer"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* AGENDA BOOKINGS LIST */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-white">No se encontraron reservas en la agenda</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal mt-1">
                Intente modificar los criterios de búsqueda, filtre por otro estado o registre una cita manual si un cliente se comunicó telefónicamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBookings.map((book) => {
              const isVehicleActive = sessions.some(s => s.plate === book.plate && s.status === 'active');
              
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top line with status badge & ID */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-850">
                          RESERVA: {book.id}
                        </span>
                        <h4 className="text-sm font-extrabold text-white mt-1.5 flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {book.clientName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVehicleActive && book.status === 'approved' && (
                          <span className="text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded-md uppercase">
                            En Recinto
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          book.status === 'pending'
                            ? 'bg-amber-950 border border-amber-900/60 text-amber-400 animate-pulse'
                            : book.status === 'approved'
                            ? 'bg-blue-950 border border-blue-900/60 text-blue-400'
                            : book.status === 'completed'
                            ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400'
                            : 'bg-rose-950 border border-rose-900/60 text-rose-400'
                        }`}>
                          {book.status === 'pending' ? 'Pendiente' : book.status === 'approved' ? 'Aprobado' : book.status === 'completed' ? 'Completado' : 'Rechazado'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Metadata Block */}
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-950 p-3 rounded-xl text-xs border border-slate-900">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Vehículo</span>
                        <span className="font-bold text-slate-200 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-blue-400" />
                          {getVehicleTypeLabel(book.vehicleType)} ({formatPlate(book.plate)})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Servicio</span>
                        <span className="font-bold text-slate-200 capitalize flex items-center gap-1">
                          {book.serviceType === 'parking' ? (
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                          ) : book.serviceType === 'wash' ? (
                            <Waves className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          {book.serviceType === 'parking' ? 'Solo Estacionamiento' : book.serviceType === 'wash' ? 'Solo Lavado' : 'Ambos (Est. + Lavado)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Fecha Agenda</span>
                        <span className="font-bold text-slate-200 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {book.bookingDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Hora Pactada</span>
                        <span className="font-bold text-slate-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {book.bookingTime} Hrs
                        </span>
                      </div>
                    </div>

                    {/* Plan details if washing requested */}
                    {book.washPackageName && (
                      <div className="text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          Estética / Lavado:
                        </span>
                        <span className="font-bold text-blue-400">{book.washPackageName}</span>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 px-1 pt-1 border-t border-slate-850">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {book.clientPhone}
                      </span>
                      {book.clientEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {book.clientEmail}
                        </span>
                      )}
                    </div>

                    {/* Notes block */}
                    {book.notes && (
                      <div className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/30">
                        💡 Nota: "{book.notes}"
                      </div>
                    )}

                    {/* Rejection reason block */}
                    {book.status === 'rejected' && book.rejectionReason && (
                      <div className="bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl text-xs text-rose-300">
                        <strong>Motivo de rechazo:</strong> {book.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons footer depending on status */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-850 mt-3 shrink-0">
                    {/* Delete button (accessible on completed, rejected, or anytime) */}
                    <button
                      onClick={() => {
                        if (confirm('¿Está seguro de eliminar esta reserva de la agenda de forma definitiva?')) {
                          onDeleteBooking(book.id);
                        }
                      }}
                      className="p-2 bg-slate-950 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar de la agenda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {book.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openRejectDialog(book.id)}
                          className="px-3 py-1.5 bg-rose-950 text-rose-400 hover:bg-rose-900 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                        <button
                          onClick={() => onUpdateBookingStatus(book.id, 'approved')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-md shadow-blue-900/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar Cita
                        </button>
                      </>
                    )}

                    {book.status === 'approved' && (
                      <>
                        <button
                          onClick={() => openRejectDialog(book.id)}
                          className="px-3 py-1.5 bg-slate-850 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                        
                        {!isVehicleActive && (
                          <button
                            onClick={() => onActivateSessionFromBooking(book)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-lg shadow-emerald-950/30"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Activar Ingreso
                          </button>
                        )}

                        <button
                          onClick={() => onUpdateBookingStatus(book.id, 'completed')}
                          className="px-3 py-1.5 bg-slate-800 text-emerald-400 hover:bg-slate-750 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completado
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: MANUAL RESERVATION CREATION */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-5 shadow-2xl space-y-4 my-8"
            >
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4.5 h-4.5 text-blue-500" />
                  Registrar Cita Manual en Agenda
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateManualBooking} className="space-y-4 text-xs">
                {/* 1. Datos cliente */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                    1. Datos de Registro de Cliente
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sebastián Martínez"
                        value={newBooking.clientName}
                        onChange={(e) => setNewBooking({...newBooking, clientName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Teléfono *</label>
                      <input
                        type="text"
                        required
                        placeholder="+56999999999"
                        value={newBooking.clientPhone}
                        onChange={(e) => setNewBooking({...newBooking, clientPhone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Email (Opcional)</label>
                      <input
                        type="email"
                        placeholder="cliente@ejemplo.cl"
                        value={newBooking.clientEmail}
                        onChange={(e) => setNewBooking({...newBooking, clientEmail: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Vehiculo y servicios */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                    2. Vehículo y Servicios Solicitados
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Patente / Placa *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CHIL34"
                        value={newBooking.plate}
                        onChange={(e) => setNewBooking({...newBooking, plate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase tracking-widest"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Tipo Vehículo *</label>
                      <select
                        value={newBooking.vehicleType}
                        onChange={(e) => setNewBooking({...newBooking, vehicleType: e.target.value as VehicleType})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="auto">Auto</option>
                        <option value="suv">SUV</option>
                        <option value="moto">Motocicleta</option>
                        <option value="camioneta">Camioneta</option>
                        <option value="furgon">Furgón</option>
                        <option value="otro">Otros</option>
                      </select>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Tipo de Servicio *</label>
                      <select
                        value={newBooking.serviceType}
                        onChange={(e) => setNewBooking({...newBooking, serviceType: e.target.value as any})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="parking">Solo Estacionamiento (Parking)</option>
                        <option value="wash">Solo Estética (Lavado)</option>
                        <option value="both">Ambos (Estacionamiento + Lavado)</option>
                      </select>
                    </div>

                    {(newBooking.serviceType === 'wash' || newBooking.serviceType === 'both') && (
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 block">Plan de Estética / Lavado</label>
                        <select
                          value={newBooking.washPackageId}
                          onChange={(e) => setNewBooking({...newBooking, washPackageId: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                        >
                          {DEFAULT_WASH_PACKAGES.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} ({formatCurrency(pkg.priceByVehicleType[newBooking.vehicleType] || pkg.priceByVehicleType['auto'])})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Agenda */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/40">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-850 pb-1 mb-2">
                    3. Agenda y Notas
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Fecha del Turno *</label>
                      <input
                        type="date"
                        required
                        value={newBooking.bookingDate}
                        onChange={(e) => setNewBooking({...newBooking, bookingDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Hora Citada *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 14:30"
                        value={newBooking.bookingTime}
                        onChange={(e) => setNewBooking({...newBooking, bookingTime: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Notas de la Reserva</label>
                      <input
                        type="text"
                        placeholder="e.g. Cliente llamó vía telefónica, dejará llaves..."
                        value={newBooking.notes}
                        onChange={(e) => setNewBooking({...newBooking, notes: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-950/50 cursor-pointer"
                  >
                    Confirmar y Agendar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REJECTION REASON */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                  Rechazar Solicitud de Reserva
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ingrese un motivo de rechazo que el cliente podrá ver al consultar el estado de sus reservas en el portal.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Motivo / Razón de Rechazo</label>
                <textarea
                  placeholder="e.g. Lo sentimos, no contamos con cupos de estacionamiento disponibles para este horario."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-rose-950/50"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
