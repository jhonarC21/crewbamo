import React, { useState } from 'react';
import { 
  Moon, Plus, Search, Calendar, CheckCircle, AlertTriangle, XCircle, 
  User, Car, Phone, DollarSign, Clock, RefreshCw, Trash2, CreditCard, ShieldAlert, LogIn, LogOut
} from 'lucide-react';
import { NightSubscription, NightCheckLog, VehicleType, PaymentMethod, TariffSettings } from '../types';
import { formatCurrency, formatPlate, normalizePlate, getVehicleTypeLabel } from '../utils/parkingUtils';

interface NightParkingManagementProps {
  subscriptions: NightSubscription[];
  onSaveSubscription: (sub: NightSubscription) => void;
  onRegisterPayment: (subId: string, amount: number, paymentMethod: PaymentMethod, periodMonth: string) => void;
  onDeleteSubscription: (subId: string) => void;
  settings: TariffSettings;
}

export const NightParkingManagement: React.FC<NightParkingManagementProps> = ({
  subscriptions,
  onSaveSubscription,
  onRegisterPayment,
  onDeleteSubscription,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'al_dia' | 'por_vencer' | 'vencido'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<NightSubscription | null>(null);
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<NightSubscription | null>(null);

  // Check-in / Control Nocturno state
  const [nightCheckLogs, setNightCheckLogs] = useState<NightCheckLog[]>([]);

  // Form State for new night subscriber
  const [plate, setPlate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [schedule, setSchedule] = useState('20:00 - 08:00');
  const [monthlyFee, setMonthlyFee] = useState<number>(45000);
  const [notes, setNotes] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('efectivo');

  // Form State for renewal payment
  const [payAmount, setPayAmount] = useState<number>(45000);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('efectivo');
  const [payMonth, setPayMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [payNotes, setPayNotes] = useState('');

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = normalizePlate(plate);
    if (!cleanPlate || cleanPlate.length < 4) {
      alert('Ingrese una patente válida.');
      return;
    }
    if (!clientName.trim()) {
      alert('Ingrese el nombre del suscriptor.');
      return;
    }

    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const expiryDateObj = new Date(today.getTime() + 30 * 24 * 3600 * 1000);
    const expiryDateStr = expiryDateObj.toISOString().split('T')[0];

    const newSub: NightSubscription = {
      id: `sub-${Date.now()}`,
      plate: cleanPlate,
      clientName: clientName.trim(),
      clientRut: clientRut.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      vehicleType,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      color: color.trim() || undefined,
      schedule,
      monthlyFee,
      startDate: startDateStr,
      expiryDate: expiryDateStr,
      status: 'al_dia',
      lastPaymentDate: today.toISOString(),
      notes: notes.trim() || undefined,
      paymentHistory: [
        {
          id: `pay-${Date.now()}`,
          paymentDate: today.toISOString(),
          periodMonth: today.toISOString().substring(0, 7),
          amount: monthlyFee,
          paymentMethod: initialPaymentMethod,
          notes: 'Pago inicial de inscripción de mensualidad nocturna'
        }
      ]
    };

    onSaveSubscription(newSub);
    setShowCreateModal(false);
    resetForm();
  };

  const resetForm = () => {
    setPlate('');
    setClientName('');
    setClientRut('');
    setClientPhone('');
    setClientEmail('');
    setVehicleType('auto');
    setBrand('');
    setModel('');
    setColor('');
    setSchedule('20:00 - 08:00');
    setMonthlyFee(45000);
    setNotes('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForPayment) return;

    onRegisterPayment(selectedSubForPayment.id, payAmount, payMethod, payMonth);
    setSelectedSubForPayment(null);
  };

  const handleToggleNightCheck = (sub: NightSubscription) => {
    const activeLog = nightCheckLogs.find(l => l.subscriptionId === sub.id && l.status === 'parked');
    if (activeLog) {
      // Checkout
      setNightCheckLogs(nightCheckLogs.map(l => l.id === activeLog.id ? { ...l, exitTime: new Date().toISOString(), status: 'checked_out' } : l));
    } else {
      // Checkin
      const newLog: NightCheckLog = {
        id: `nlog-${Date.now()}`,
        subscriptionId: sub.id,
        plate: sub.plate,
        entryTime: new Date().toISOString(),
        status: 'parked'
      };
      setNightCheckLogs([...nightCheckLogs, newLog]);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    const matchesTab = activeTab === 'all' ? true : s.status === activeTab;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      s.plate.toLowerCase().includes(query) ||
      s.clientName.toLowerCase().includes(query) ||
      (s.clientRut && s.clientRut.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: NightSubscription['status']) => {
    switch (status) {
      case 'al_dia':
        return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Al Día</span>;
      case 'por_vencer':
        return <span className="bg-amber-950/80 text-amber-400 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Por Vencer</span>;
      case 'vencido':
        return <span className="bg-rose-950/80 text-rose-400 border border-rose-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Vencido</span>;
      default:
        return null;
    }
  };

  const countAlDia = subscriptions.filter(s => s.status === 'al_dia').length;
  const countPorVencer = subscriptions.filter(s => s.status === 'por_vencer').length;
  const countVencido = subscriptions.filter(s => s.status === 'vencido').length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Moon className="w-6 h-6 text-indigo-400" />
            Estacionamiento Mensual Nocturno
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Gestión de clientes abonados por mensualidad fija nocturna (e.g. 20:00 hrs a 08:00 hrs).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Inscribir Abonado Nocturno
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abonados Al Día</span>
            <span className="text-2xl font-mono font-black text-emerald-400">{countAlDia}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Por Vencer (Próx. 5 Días)</span>
            <span className="text-2xl font-mono font-black text-amber-400">{countPorVencer}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensualidad Vencida</span>
            <span className="text-2xl font-mono font-black text-rose-400">{countVencido}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control de Tabs y Búsqueda */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { key: 'all', label: 'Todos los Suscriptores', count: subscriptions.length },
            { key: 'al_dia', label: 'Al Día', count: countAlDia },
            { key: 'por_vencer', label: 'Por Vencer', count: countPorVencer },
            { key: 'vencido', label: 'Vencidos', count: countVencido }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="bg-slate-950/80 text-[10px] px-2 py-0.5 rounded-full border border-slate-800 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar patente, suscriptor o RUT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Listado de Suscriptores Nocturnos */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-slate-950/40 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
          <Moon className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <p className="font-bold text-sm text-white">Sin abonados nocturnos registrados</p>
          <p className="text-xs mt-1 text-slate-500">Agregue un nuevo abonado mediante el botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map(sub => {
            const isParkedTonight = nightCheckLogs.some(l => l.subscriptionId === sub.id && l.status === 'parked');

            return (
              <div
                key={sub.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 tracking-wider">
                          {formatPlate(sub.plate)}
                        </span>
                        <span className="text-[10px] font-bold uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded-full">
                          {getVehicleTypeLabel(sub.vehicleType)}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base pt-1">{sub.clientName}</h3>
                      {sub.clientPhone && (
                        <p className="text-slate-400 text-xs font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {sub.clientPhone}
                        </p>
                      )}
                    </div>

                    <div>{getStatusBadge(sub.status)}</div>
                  </div>

                  {/* Horario y Canon Mensual */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">Horario Nocturno:</span>
                      <span className="font-mono font-bold text-indigo-300">{sub.schedule}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">Cuota Mensual:</span>
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(sub.monthlyFee, settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">Vencimiento:</span>
                      <span className="font-mono font-bold text-slate-200">{sub.expiryDate}</span>
                    </div>
                  </div>

                  {/* Estado de presencia esta noche */}
                  <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[11px] text-slate-400 font-medium">Presencia esta noche:</span>
                    <button
                      onClick={() => handleToggleNightCheck(sub)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isParkedTonight
                          ? 'bg-indigo-600 text-white border border-indigo-500 shadow-md shadow-indigo-900/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {isParkedTonight ? (
                        <>
                          <LogIn className="w-3.5 h-3.5 text-indigo-300" />
                          Estacionado
                        </>
                      ) : (
                        <>
                          <LogOut className="w-3.5 h-3.5 text-slate-500" />
                          Fuera de recinto
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Pie y acciones */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedSubForPayment(sub);
                      setPayAmount(sub.monthlyFee);
                    }}
                    className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Renovar Pago
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelectedSubForDetail(sub)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Historial
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Está seguro de eliminar la suscripción nocturna de ${sub.clientName} (${formatPlate(sub.plate)})?`)) {
                          onDeleteSubscription(sub.id);
                        }
                      }}
                      className="bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 p-1.5 rounded-lg border border-rose-900/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL INSCRIBIR NUEVO ABONADO NOCTURNO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 max-h-[90vh] flex flex-col">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">INSCRIBIR ABONADO</span>
                <h3 className="text-lg font-bold text-white">Servicio Estacionamiento Nocturno</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="p-6 space-y-4 overflow-y-auto text-xs text-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Placa Patente *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KPDX45"
                  value={plate}
                  onChange={e => setPlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold uppercase text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Suscriptor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan Pérez"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RUT</label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    value={clientRut}
                    onChange={e => setClientRut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+56 9 8765 4321"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Vehículo</label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="auto">Automóvil</option>
                    <option value="suv">SUV</option>
                    <option value="moto">Moto</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="furgon">Furgón</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marca</label>
                  <input
                    type="text"
                    placeholder="Hyundai"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Accent"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="Gris"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Horario Convenido</label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Tarifa Mensual ($)</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    value={monthlyFee}
                    onChange={e => setMonthlyFee(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Forma de Pago Inicial</label>
                <select
                  value={initialPaymentMethod}
                  onChange={e => setInitialPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="debito">Tarjeta de Débito</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observaciones / Ubicación Asignada</label>
                <input
                  type="text"
                  placeholder="e.g. Cupo asignado Sector B-02"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/30 cursor-pointer uppercase tracking-wider"
                >
                  Inscribir y Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR RENOVAR PAGO */}
      {selectedSubForPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">REGISTRAR PAGO MENSUAL</span>
                <h3 className="text-lg font-bold text-white">{selectedSubForPayment.clientName}</h3>
              </div>
              <button onClick={() => setSelectedSubForPayment(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4 text-xs text-slate-200">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Patente</span>
                  <span className="font-mono text-base font-black text-white">{formatPlate(selectedSubForPayment.plate)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Vencimiento Actual</span>
                  <span className="font-mono font-bold text-amber-400">{selectedSubForPayment.expiryDate}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monto Cobrado ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-base focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medio de Pago</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="debito">Tarjeta de Débito</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubForPayment(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 cursor-pointer uppercase"
                >
                  Confirmar Pago (+30 Días)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE PAGOS */}
      {selectedSubForDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">HISTORIAL DE MENSUALIDADES</span>
                <h3 className="text-lg font-bold text-white">{selectedSubForDetail.clientName}</h3>
              </div>
              <button onClick={() => setSelectedSubForDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-200">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Pagos Registrados</span>
                {selectedSubForDetail.paymentHistory.length === 0 ? (
                  <p className="text-slate-500 italic">No hay historial de pagos.</p>
                ) : (
                  <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-850 overflow-hidden">
                    {selectedSubForDetail.paymentHistory.map(p => (
                      <div key={p.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white font-mono">{p.periodMonth}</p>
                          <p className="text-[10px] text-slate-400">{new Date(p.paymentDate).toLocaleDateString('es-CL')} ({p.paymentMethod})</p>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-sm">{formatCurrency(p.amount, settings.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedSubForDetail(null)}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
