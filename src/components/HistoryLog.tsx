/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSession, TariffSettings, VehicleStats, AppUser } from '../types';
import { 
  formatCurrency, 
  formatDuration, 
  formatPlate, 
  getVehicleTypeLabel 
} from '../utils/parkingUtils';
import { 
  Search, 
  Calendar, 
  Clock, 
  Coins, 
  User, 
  ChevronRight, 
  History, 
  TrendingUp, 
  X, 
  FileText,
  Tag,
  Download,
  Trash2,
  Edit3,
  CheckCircle
} from 'lucide-react';

interface HistoryLogProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  currentUser?: AppUser | null;
  onDeleteSession?: (id: string) => void;
  onUpdateSession?: (session: ParkingSession) => void;
}

export default function HistoryLog({ 
  sessions, 
  settings, 
  currentUser = null, 
  onDeleteSession,
  onUpdateSession
}: HistoryLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedPlateForAnalysis, setSelectedPlateForAnalysis] = useState<string | null>(null);

  // States para modal de edición administrativa
  const [editingSession, setEditingSession] = useState<ParkingSession | null>(null);
  const [editEntryTime, setEditEntryTime] = useState('');
  const [editExitTime, setEditExitTime] = useState('');
  const [editChargedAmount, setEditChargedAmount] = useState<number>(0);
  const [editClientName, setEditClientName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Filtrar sesiones completadas
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Función para exportar a Excel (CSV con formato compatible)
  const handleExportToExcel = () => {
    const sessionsToExport = searchQuery.trim() || dateFilter !== 'all' ? filteredSessions : completedSessions;
    
    if (sessionsToExport.length === 0) {
      alert("No hay registros en la vista actual para exportar.");
      return;
    }

    // Cabeceras del Excel / CSV
    const headers = [
      "Patente / Placa",
      "Cliente",
      "Tipo Vehiculo",
      "Marca",
      "Modelo",
      "Color",
      "Año",
      "Fecha Ingreso",
      "Fecha Salida",
      "Tiempo Estadia (Minutos)",
      "Tiempo Estadia (Formato)",
      "Total Cobrado (CLP)",
      "Metodo de Pago",
      "Notas / Observaciones"
    ];

    // Filas de datos
    const rows = sessionsToExport.map(s => [
      s.plate.toUpperCase(),
      s.clientName || "Cliente Particular",
      getVehicleTypeLabel(s.vehicleType),
      s.brand || "-",
      s.model || "-",
      s.color || "-",
      s.year || "-",
      s.entryTime ? new Date(s.entryTime).toLocaleString('es-CL') : "",
      s.exitTime ? new Date(s.exitTime).toLocaleString('es-CL') : "",
      s.durationMinutes || 0,
      s.durationMinutes ? formatDuration(s.durationMinutes) : "",
      s.chargedAmount || 0,
      s.paymentMethod ? s.paymentMethod.toUpperCase() : "No especificado",
      (s.notes || "").replace(/;/g, ",").replace(/\n/g, " ").replace(/"/g, '""')
    ]);

    // Unir todo con punto y coma (;) que es el estándar de Excel en español
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(field => {
        const str = String(field);
        if (str.includes(";") || str.includes('"') || str.includes("\n")) {
          return `"${str}"`;
        }
        return str;
      }).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const filterSuffix = searchQuery.trim() || dateFilter !== 'all' ? "_filtrado" : "_completo";
    link.setAttribute("download", `bamo_control_patentes${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado general por texto y fecha
  const filteredSessions = completedSessions.filter(s => {
    // Filtro por búsqueda
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      s.plate.toLowerCase().includes(query) ||
      (s.clientName || '').toLowerCase().includes(query) ||
      (s.brand || '').toLowerCase().includes(query) ||
      (s.model || '').toLowerCase().includes(query);

    if (!matchesQuery) return false;

    // Filtro por fecha
    if (dateFilter === 'all') return true;

    const sessionDate = new Date(s.exitTime || s.entryTime);
    const today = new Date();
    
    if (dateFilter === 'today') {
      return sessionDate.toDateString() === today.toDateString();
    }
    
    if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return sessionDate.toDateString() === yesterday.toDateString();
    }
    
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      return sessionDate >= oneWeekAgo;
    }

    return true;
  });

  // Auxiliar para convertir formato ISO a local datetime input
  const toLocalISOString = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return '';
    }
  };

  // Iniciar edición de sesión
  const handleStartEdit = (session: ParkingSession) => {
    setEditingSession(session);
    setEditEntryTime(toLocalISOString(session.entryTime));
    setEditExitTime(toLocalISOString(session.exitTime));
    setEditChargedAmount(session.chargedAmount || 0);
    setEditClientName(session.clientName || '');
    setEditNotes(session.notes || '');
  };

  // Guardar edición de sesión
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const entryDate = new Date(editEntryTime);
    const exitDate = editExitTime ? new Date(editExitTime) : undefined;

    if (exitDate && entryDate > exitDate) {
      alert("La fecha de ingreso no puede ser posterior a la de egreso/salida.");
      return;
    }

    // Calcular nueva duración
    let durationMinutes = editingSession.durationMinutes;
    if (exitDate) {
      const diffMs = exitDate.getTime() - entryDate.getTime();
      durationMinutes = Math.max(1, Math.round(diffMs / 60000));
    }

    const updated: ParkingSession = {
      ...editingSession,
      clientName: editClientName.trim() || undefined,
      notes: editNotes.trim() || undefined,
      entryTime: entryDate.toISOString(),
      exitTime: exitDate ? exitDate.toISOString() : undefined,
      durationMinutes,
      chargedAmount: Number(editChargedAmount)
    };

    onUpdateSession?.(updated);
    setEditingSession(null);
  };

  // Agrupamiento estadístico de clientes recurrentes para el panel de análisis lateral
  const getCustomerStats = (plateStr: string): VehicleStats | null => {
    const matching = sessions.filter(s => s.plate.toLowerCase() === plateStr.toLowerCase());
    if (matching.length === 0) return null;

    const completed = matching.filter(s => s.status === 'completed');
    const totalSpent = completed.reduce((sum, s) => sum + (s.chargedAmount || 0), 0);
    const totalDuration = completed.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    
    // Buscar la última fecha de visita
    const sorted = [...matching].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
    const lastVisit = sorted[0]?.entryTime || '';

    return {
      plate: plateStr.toUpperCase(),
      totalVisits: matching.length,
      totalDurationMinutes: totalDuration,
      totalSpent,
      lastVisit,
      sessions: sorted
    };
  };

  const currentStats = selectedPlateForAnalysis ? getCustomerStats(selectedPlateForAnalysis) : null;

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Encabezado e Indicadores Rápidos */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-900/40 text-blue-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Historial de Vehículos</h2>
            <p className="text-xs text-slate-400">Auditoría, exportaciones a Excel y modificación de registros para administradores.</p>
          </div>
        </div>

        {/* Botón de Exportación */}
        <button
          onClick={handleExportToExcel}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Download className="w-4 h-4 text-blue-400" />
          Exportar a Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Tabla principal de salidas */}
        <div className={`xl:col-span-2 space-y-4 ${selectedPlateForAnalysis ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          
          {/* Controles de Búsqueda y Filtro de Fecha */}
          <div className="flex flex-col sm:flex-row gap-3 bg-slate-950/20 p-4 rounded-xl border border-slate-800/80">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por patente, cliente, marca o modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Selector de Filtro de Fecha */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'today', 'yesterday', 'week'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    dateFilter === filter
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'all' && '📅 Todos'}
                  {filter === 'today' && 'Hoy'}
                  {filter === 'yesterday' && 'Ayer'}
                  {filter === 'week' && 'Últ. 7 días'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-2xl">
            {filteredSessions.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-mono text-sm">
                [ No se encontraron registros de salidas en la selección actual ]
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-950/10">
                    <th className="py-3.5 px-6">Placa Patente</th>
                    <th className="py-3.5 px-6">Cliente</th>
                    <th className="py-3.5 px-6">Tipo</th>
                    <th className="py-3.5 px-6">Entrada / Salida</th>
                    <th className="py-3.5 px-6">Estadía</th>
                    <th className="py-3.5 px-6 text-right">Cobrado</th>
                    <th className="py-3.5 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {filteredSessions.map((s) => {
                    const isSelected = selectedPlateForAnalysis?.toUpperCase() === s.plate.toUpperCase();
                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedPlateForAnalysis(s.plate)}
                        className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-900 font-semibold text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-mono font-black text-xs text-white bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 tracking-wider">
                            {formatPlate(s.plate)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          <div>
                            <p className="font-bold text-slate-200">{s.clientName || 'Cliente Particular'}</p>
                            {(s.brand || s.model || s.color || s.year) && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {[s.brand, s.model, s.color, s.year ? `(${s.year})` : ''].filter(Boolean).join(' - ')}
                              </p>
                            )}
                            {s.notes && (
                              <p className="text-[10px] text-slate-500 italic truncate max-w-[150px] mt-0.5">
                                Obs: {s.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                          {getVehicleTypeLabel(s.vehicleType)}
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-600 font-bold uppercase">Ing:</span>
                              {new Date(s.entryTime).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-600 font-bold uppercase">Egr:</span>
                              {s.exitTime ? new Date(s.exitTime).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-mono">
                          {s.durationMinutes ? formatDuration(s.durationMinutes) : '-'}
                        </td>
                        <td className="py-4 px-6 text-right font-mono">
                          <span className="text-emerald-400 font-bold block">
                            {formatCurrency(s.chargedAmount || 0, settings.currency)}
                          </span>
                          {s.paymentMethod ? (
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded inline-block mt-1">
                              {s.paymentMethod === 'efectivo' && '💵 Efectivo'}
                              {s.paymentMethod === 'debito' && '💳 Débito'}
                              {s.paymentMethod === 'transferencia' && '📲 Transf.'}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-600 block mt-1">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              className="text-blue-400 hover:text-blue-300 font-bold text-xs flex items-center gap-0.5 uppercase tracking-wider text-[10px] cursor-pointer"
                              onClick={() => setSelectedPlateForAnalysis(s.plate)}
                            >
                              Historial
                            </button>

                            {currentUser?.role === 'admin' && (
                              <>
                                <button 
                                  onClick={() => handleStartEdit(s)}
                                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
                                  title="Editar tiempos/monto"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  className="text-rose-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/20 border border-transparent hover:border-rose-900/45 transition-colors cursor-pointer"
                                  title="Eliminar este registro del historial"
                                  onClick={() => {
                                    if (confirm(`¿Está seguro de eliminar permanentemente este registro del historial?\nVehículo: ${formatPlate(s.plate)}\nMonto: ${formatCurrency(s.chargedAmount || 0, settings.currency)}`)) {
                                      onDeleteSession?.(s.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel de Análisis Lateral */}
        {selectedPlateForAnalysis && currentStats && (
          <div className="bg-slate-900 rounded-2xl border border-blue-900/60 shadow-2xl p-6 h-fit space-y-6 xl:col-span-1 border-t-4 border-t-blue-500 animate-slide-left">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">FICHA DE AUDITORÍA</span>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-xl font-black text-white tracking-widest">
                    {formatPlate(currentStats.plate)}
                  </h3>
                  <span className="text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-900/40 px-2.5 py-0.5 rounded-full uppercase">
                    Recurrente
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlateForAnalysis(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Total Ingresos</span>
                <span className="text-xl font-mono font-black text-blue-400 block">{currentStats.totalVisits}</span>
                <span className="text-[10px] text-slate-400 font-medium">visitas registradas</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Monto Gastado</span>
                <span className="text-xl font-mono font-black text-emerald-400 block">
                  {formatCurrency(currentStats.totalSpent, settings.currency)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">ingresos percibidos</span>
              </div>
            </div>

            {/* Historial rápido */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Línea de Tiempo de Sesiones
              </h4>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {currentStats.sessions.map((sess, idx) => {
                  const isCurrentActive = sess.status === 'active';
                  return (
                    <div 
                      key={sess.id}
                      className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                        isCurrentActive 
                          ? 'bg-blue-950/20 border-blue-900/60 shadow-lg' 
                          : 'bg-slate-950 border-slate-800/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                          isCurrentActive 
                            ? 'bg-blue-950 text-blue-400 border-blue-900' 
                            : 'bg-slate-900 text-slate-400 border-slate-850'
                        }`}>
                          {isCurrentActive ? '🟢 En Curso' : 'Salida'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(sess.entryTime).toLocaleDateString('es-CL')}
                        </p>
                      </div>

                      <div className="text-right">
                        {isCurrentActive ? (
                          <span className="text-[9px] text-slate-500 italic">Estacionado</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-xs font-mono font-bold text-slate-200 block">
                              {formatCurrency(sess.chargedAmount || 0, settings.currency)}
                            </span>
                            {sess.paymentMethod && (
                              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                                {sess.paymentMethod}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL EDICIÓN DE SESIÓN PARA ADMINISTRADORES */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="font-bold text-white text-sm">Modificar Historial Administrativo</h4>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Patente: {editingSession.plate}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              
              {/* Cliente */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Nombre del Cliente</label>
                <input
                  type="text"
                  placeholder="Particular"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Tiempos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Hora de Entrada</label>
                  <input
                    type="datetime-local"
                    required
                    value={editEntryTime}
                    onChange={(e) => setEditEntryTime(e.target.value)}
                    className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Hora de Salida</label>
                  <input
                    type="datetime-local"
                    required
                    value={editExitTime}
                    onChange={(e) => setEditExitTime(e.target.value)}
                    className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Monto Cobrado */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Monto Total Cobrado (Ingreso Real)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={editChargedAmount}
                  onChange={(e) => setEditChargedAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-emerald-400 font-bold font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Notas / Correcciones</label>
                <textarea
                  placeholder="Ej. Ajuste de hora de salida autorizada por supervisor..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-950 transition-colors border border-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aplicar Cambios
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
