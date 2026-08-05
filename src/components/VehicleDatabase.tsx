import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Car, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  AlertTriangle, 
  Star, 
  Edit2, 
  Trash2, 
  History, 
  CheckCircle2, 
  X, 
  Filter, 
  Sparkles,
  Waves,
  RefreshCw,
  Eye,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { VehicleRecord, VehicleType, ParkingSession, WashSession, ServiceQuote, NightSubscription } from '../types';
import { formatPlate, getVehicleTypeLabel, normalizePlate } from '../utils/parkingUtils';

interface VehicleDatabaseProps {
  vehicleRecords: VehicleRecord[];
  sessions: ParkingSession[];
  washSessions?: WashSession[];
  quotes?: ServiceQuote[];
  nightSubscriptions?: NightSubscription[];
  onSaveVehicleRecord: (record: VehicleRecord) => void;
  onDeleteVehicleRecord: (id: string) => void;
  onSyncFromHistory?: () => void;
  onNavigateToService?: (tab: 'active' | 'lavado' | 'cotizaciones' | 'nocturno', plate: string) => void;
}

export default function VehicleDatabase({
  vehicleRecords,
  sessions,
  washSessions = [],
  quotes = [],
  nightSubscriptions = [],
  onSaveVehicleRecord,
  onDeleteVehicleRecord,
  onSyncFromHistory,
  onNavigateToService
}: VehicleDatabaseProps) {
  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [onlyVip, setOnlyVip] = useState(false);
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  // Modal para agregar / editar vehículo
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleRecord | null>(null);

  // Form states
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [vipStatus, setVipStatus] = useState(false);
  const [alertFlag, setAlertFlag] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [formError, setFormError] = useState('');

  // Modal de vista detallada e historial por patente
  const [detailRecord, setDetailRecord] = useState<VehicleRecord | null>(null);

  // Sincronización feedback
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Abrir modal para crear
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setPlate('');
    setVehicleType('auto');
    setBrand('');
    setModel('');
    setColor('');
    setYear('');
    setClientName('');
    setClientRut('');
    setClientPhone('');
    setClientEmail('');
    setInternalNotes('');
    setVipStatus(false);
    setAlertFlag(false);
    setAlertMessage('');
    setFormError('');
    setShowFormModal(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (record: VehicleRecord) => {
    setEditingRecord(record);
    setPlate(record.plate);
    setVehicleType(record.vehicleType || 'auto');
    setBrand(record.brand || '');
    setModel(record.model || '');
    setColor(record.color || '');
    setYear(record.year || '');
    setClientName(record.clientName || '');
    setClientRut(record.clientRut || '');
    setClientPhone(record.clientPhone || '');
    setClientEmail(record.clientEmail || '');
    setInternalNotes(record.internalNotes || '');
    setVipStatus(!!record.vipStatus);
    setAlertFlag(!!record.alertFlag);
    setAlertMessage(record.alertMessage || '');
    setFormError('');
    setShowFormModal(true);
  };

  // Guardar formulario
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) {
      setFormError('Debe ingresar la patente del vehículo.');
      return;
    }

    const norm = normalizePlate(plate);
    if (!norm) {
      setFormError('La patente ingresada no es válida.');
      return;
    }

    // Verificar duplicado si es nuevo registro
    if (!editingRecord && vehicleRecords.some(v => v.id === norm)) {
      setFormError(`La patente ${formatPlate(norm)} ya se encuentra registrada en la base de datos.`);
      return;
    }

    const now = new Date().toISOString();
    const recordToSave: VehicleRecord = {
      id: norm,
      plate: formatPlate(norm),
      vehicleType,
      brand: brand.trim(),
      model: model.trim(),
      color: color.trim(),
      year: year.trim(),
      clientName: clientName.trim(),
      clientRut: clientRut.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      internalNotes: internalNotes.trim(),
      vipStatus,
      alertFlag,
      alertMessage: alertFlag ? alertMessage.trim() : '',
      createdAt: editingRecord ? editingRecord.createdAt : now,
      updatedAt: now
    };

    onSaveVehicleRecord(recordToSave);
    setShowFormModal(false);
  };

  // Sincronizar desde historial
  const handleSync = () => {
    if (onSyncFromHistory) {
      onSyncFromHistory();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }
  };

  // Filtrado de registros
  const filteredRecords = vehicleRecords.filter(rec => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      rec.plate.toLowerCase().includes(q) ||
      rec.id.toLowerCase().includes(q) ||
      (rec.clientName && rec.clientName.toLowerCase().includes(q)) ||
      (rec.clientRut && rec.clientRut.toLowerCase().includes(q)) ||
      (rec.clientPhone && rec.clientPhone.toLowerCase().includes(q)) ||
      (rec.brand && rec.brand.toLowerCase().includes(q)) ||
      (rec.model && rec.model.toLowerCase().includes(q)) ||
      (rec.internalNotes && rec.internalNotes.toLowerCase().includes(q))
    );

    const matchesType = selectedTypeFilter === 'all' || rec.vehicleType === selectedTypeFilter;
    const matchesVip = !onlyVip || rec.vipStatus;
    const matchesAlerts = !onlyAlerts || rec.alertFlag || (rec.internalNotes && rec.internalNotes.length > 0);

    return matchesSearch && matchesType && matchesVip && matchesAlerts;
  });

  // Cálculo de estadísticas
  const totalVehicles = vehicleRecords.length;
  const totalVip = vehicleRecords.filter(v => v.vipStatus).length;
  const totalAlerts = vehicleRecords.filter(v => v.alertFlag || (v.internalNotes && v.internalNotes.length > 0)).length;

  // Obtener historial de servicios para un registro en detalle
  const getVehicleHistory = (normPlate: string) => {
    const targetNorm = normalizePlate(normPlate);
    const pSessions = sessions.filter(s => normalizePlate(s.plate) === targetNorm);
    const wSessions = washSessions.filter(w => normalizePlate(w.plate) === targetNorm);
    const qQuotes = quotes.filter(q => q.plate && normalizePlate(q.plate) === targetNorm);
    const nSubs = nightSubscriptions.filter(n => normalizePlate(n.plate) === targetNorm);

    return {
      parkingCount: pSessions.length,
      parkingSessions: pSessions,
      washCount: wSessions.length,
      washSessions: wSessions,
      quotesCount: qQuotes.length,
      quotes: qQuotes,
      nightSubs: nSubs,
      totalSpentParking: pSessions.reduce((acc, curr) => acc + (curr.chargedAmount || 0), 0),
      totalSpentWash: wSessions.reduce((acc, curr) => acc + (curr.price || 0), 0)
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2.5">
            <Database className="w-6 h-6 text-blue-500" />
            Base de Datos de Vehículos y Patentes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro centralizado de vehículos con notas internas, alertas y autocompletado automático en todos los servicios.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onSyncFromHistory && (
            <button
              onClick={handleSync}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
              title="Analiza estacionamientos, lavados y cotizaciones para autogregar patentes faltantes"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${syncSuccess ? 'animate-spin' : ''}`} />
              <span>{syncSuccess ? 'Sincronizado!' : 'Importar de Historial'}</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Vehículo
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Estadístico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-blue-400">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalVehicles}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vehículos Registrados</div>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-amber-950/50 border border-amber-800/40 rounded-xl text-amber-400">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalVip}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes VIP</div>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-rose-950/50 border border-rose-800/40 rounded-xl text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalAlerts}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Con Notas / Alertas</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Búsqueda por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por patente, cliente, RUT, teléfono, marca o nota interna..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro Tipo de Vehículo */}
          <div className="w-full md:w-48">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">Todos los Tipos</option>
              <option value="auto">Automóvil</option>
              <option value="suv">SUV / Crossover</option>
              <option value="camioneta">Camioneta</option>
              <option value="furgon">Furgón / Van</option>
              <option value="moto">Motocicleta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Badges de filtro rápido */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtros rápidos:
          </span>
          <button
            onClick={() => setOnlyVip(!onlyVip)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
              onlyVip 
                ? 'bg-amber-950 border border-amber-700 text-amber-300 shadow-sm' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400" />
            Solo VIP ({totalVip})
          </button>

          <button
            onClick={() => setOnlyAlerts(!onlyAlerts)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
              onlyAlerts 
                ? 'bg-rose-950 border border-rose-700 text-rose-300 shadow-sm' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Solo con Notas/Alertas ({totalAlerts})
          </button>
        </div>
      </div>

      {/* Lista / Grid de Vehículos */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-950/40 p-12 rounded-2xl border border-slate-800/80 text-center space-y-3">
          <Car className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No se encontraron vehículos</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? 'No hay registros que coincidan con los criterios de búsqueda ingresados.' 
              : 'Aún no has registrado ningún vehículo en la base de datos. Haz clic en "Nuevo Vehículo" o "Importar de Historial".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const history = getVehicleHistory(record.id);
            return (
              <div
                key={record.id}
                className="bg-slate-950/40 hover:bg-slate-900/50 transition-all p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 shadow-xl space-y-3 relative group"
              >
                {/* Header de la Tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* Patente Destacada */}
                    <div className="bg-amber-400 text-black font-black text-sm px-3 py-1 rounded-lg tracking-wider border border-amber-300 shadow-sm font-mono">
                      {record.plate}
                    </div>
                    
                    {/* Badges Especiales */}
                    {record.vipStatus && (
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 uppercase">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        VIP
                      </span>
                    )}

                    {record.alertFlag && (
                      <span className="bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 uppercase">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Alerta
                      </span>
                    )}
                  </div>

                  {/* Acciones de Edición/Eliminación */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailRecord(record)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Ver Ficha e Historial de Servicios"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(record)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Editar Ficha"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la patente ${record.plate} de la base de datos?`)) {
                          onDeleteVehicleRecord(record.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Datos del Vehículo */}
                <div className="space-y-1 pt-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {[record.brand, record.model, record.color, record.year ? `(${record.year})` : ''].filter(Boolean).join(' ') || 'Vehículo sin detalles de modelo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                      {getVehicleTypeLabel(record.vehicleType)}
                    </span>
                  </div>
                </div>

                {/* Datos del Cliente */}
                {(record.clientName || record.clientPhone || record.clientRut) && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-850/80 space-y-1 text-xs">
                    {record.clientName && (
                      <div className="text-slate-200 font-bold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate">{record.clientName}</span>
                        {record.clientRut && <span className="text-slate-500 text-[10px] font-mono">({record.clientRut})</span>}
                      </div>
                    )}
                    {record.clientPhone && (
                      <div className="text-slate-400 text-[11px] flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{record.clientPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Observaciones Internas Relevantes */}
                {record.internalNotes && (
                  <div className={`p-2.5 rounded-xl border text-xs space-y-0.5 ${
                    record.alertFlag 
                      ? 'bg-rose-950/30 border-rose-900/40 text-rose-300' 
                      : 'bg-blue-950/30 border-blue-900/40 text-blue-300'
                  }`}>
                    <div className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                      <FileText className="w-3 h-3" />
                      Observación Interna:
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-2">
                      {record.internalNotes}
                    </p>
                  </div>
                )}

                {/* Footer de Acciones Rápidas para Servicios */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                      🚗 {history.parkingCount} Est.
                    </span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                      🧼 {history.washCount} Lav.
                    </span>
                  </div>

                  {onNavigateToService && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onNavigateToService('active', record.plate)}
                        className="px-2 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/60 rounded-lg transition-colors font-bold flex items-center gap-1 cursor-pointer"
                        title="Ingresar a Estacionamiento"
                      >
                        Estacionar <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => onNavigateToService('lavado', record.plate)}
                        className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg transition-colors font-bold flex items-center gap-1 cursor-pointer"
                        title="Ingresar a Lavado"
                      >
                        Lavar <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR VEHÍCULO */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" />
                {editingRecord ? 'Editar Ficha de Vehículo' : 'Registrar Nuevo Vehículo'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Patente y Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Patente del Vehículo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="Ej: BBCL12 o AB-12-34"
                    disabled={!!editingRecord}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold uppercase focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Vehículo</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="auto">Automóvil</option>
                    <option value="suv">SUV / Crossover</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="furgon">Furgón / Van</option>
                    <option value="moto">Motocicleta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Detalle Vehículo: Marca, Modelo, Color, Año */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej: Chevrolet"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ej: Sail"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Color</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej: Gris Plata"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Año (Opcional)</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ej: 2021"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <hr className="border-slate-800" />

              {/* Datos del Cliente Propietario */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Datos del Cliente Propietario
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-300 mb-1">RUT Cliente</label>
                    <input
                      type="text"
                      value={clientRut}
                      onChange={(e) => setClientRut(e.target.value)}
                      placeholder="Ej: 18.765.432-1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono Móvil</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+569 1234 5678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-800" />

              {/* Observaciones Internas y Alertas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Observaciones Internas del Vehículo
                </h4>

                <div>
                  <textarea
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Ej: Rayón en puerta derecha preexistente, cliente VIP exige lavado especial, advertencia de pago pendiente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 resize-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Esta observación aparecerá automáticamente como alerta visible para el operador cada vez que este vehículo ingrese a Estacionamiento o Lavado.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vipStatus}
                      onChange={(e) => setVipStatus(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Cliente VIP
                      </span>
                      <span className="block text-[10px] text-slate-500">Destacar este cliente</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertFlag}
                      onChange={(e) => setAlertFlag(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-rose-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> Activar Alerta
                      </span>
                      <span className="block text-[10px] text-slate-500">Mostrar aviso rojo en ingreso</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones de Envío */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-900/30 cursor-pointer"
                >
                  {editingRecord ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA DETALLADA Y HISTORIAL POR PATENTE */}
      {detailRecord && (() => {
        const history = getVehicleHistory(detailRecord.id);
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-fade-in my-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-400 text-black font-black text-lg px-3 py-1 rounded-lg tracking-wider border border-amber-300 font-mono shadow-sm">
                    {detailRecord.plate}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Ficha de Vehículo
                      {detailRecord.vipStatus && (
                        <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-800 uppercase flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" /> VIP
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {[detailRecord.brand, detailRecord.model, detailRecord.color, detailRecord.year].filter(Boolean).join(' ') || 'Sin modelo especificado'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailRecord(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Resumen de Cliente y Notas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Propietario / Cliente
                  </h4>
                  <div className="text-xs space-y-1">
                    <div className="text-white font-bold">{detailRecord.clientName || 'Cliente no registrado'}</div>
                    {detailRecord.clientRut && <div className="text-slate-400 font-mono text-[11px]">RUT: {detailRecord.clientRut}</div>}
                    {detailRecord.clientPhone && <div className="text-emerald-400 font-mono text-[11px]">Tel: {detailRecord.clientPhone}</div>}
                    {detailRecord.clientEmail && <div className="text-slate-400 text-[11px]">Email: {detailRecord.clientEmail}</div>}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-2 ${
                  detailRecord.alertFlag 
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Observaciones Internas
                  </h4>
                  <p className="text-xs leading-relaxed italic">
                    {detailRecord.internalNotes || 'Sin observaciones registradas para este vehículo.'}
                  </p>
                </div>
              </div>

              {/* Historial de Servicios */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  Historial de Servicios Vinculados ({history.parkingCount + history.washCount} Registros)
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {/* Estacionamiento */}
                  {history.parkingSessions.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">Estacionamiento</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.entryTime).toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">${s.chargedAmount || 0}</div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${s.status === 'active' ? 'bg-blue-950 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                          {s.status === 'active' ? 'En Curso' : 'Finalizado'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Lavado */}
                  {history.washSessions.map((w) => (
                    <div key={w.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">Lavado: {w.packageName}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(w.entryTime).toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-cyan-400">${w.price || 0}</div>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-bold uppercase">
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {history.parkingCount === 0 && history.washCount === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4">
                      No hay historial previo de estacionamiento o lavado registrado para esta patente.
                    </p>
                  )}
                </div>
              </div>

              {/* Pie con Botones de Acción Directa */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleOpenEditModal(detailRecord);
                    setDetailRecord(null);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Ficha
                </button>

                <div className="flex items-center gap-2">
                  {onNavigateToService && (
                    <>
                      <button
                        onClick={() => {
                          const p = detailRecord.plate;
                          setDetailRecord(null);
                          onNavigateToService('active', p);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5" />
                        Ingresar a Estacionamiento
                      </button>
                      <button
                        onClick={() => {
                          const p = detailRecord.plate;
                          setDetailRecord(null);
                          onNavigateToService('lavado', p);
                        }}
                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Waves className="w-3.5 h-3.5" />
                        Ingresar a Lavado
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
