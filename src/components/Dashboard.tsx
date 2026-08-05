/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSession, TariffSettings, VehicleType, AppUser, AccessorySale, ServiceBooking } from '../types';
import { formatCurrency, formatDuration, getVehicleTypeLabel, formatPlate } from '../utils/parkingUtils';
import { 
  Car, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Activity, 
  ShieldCheck, 
  Calendar, 
  LayoutDashboard, 
  History, 
  Wrench 
} from 'lucide-react';

import HistoryLog from './HistoryLog';
import VehicleServicesHistory from './VehicleServicesHistory';
import ServiceBookingManagement from './ServiceBookingManagement';

interface DashboardProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  capacity: number;
  currentUser: AppUser | null;
  onDeleteSession: (id: string) => void;
  onUpdateSession: (session: ParkingSession) => void;
  // Servicios
  accessorySales: AccessorySale[];
  isCashOpen: boolean;
  onSellAccessory: (saleData: Omit<AccessorySale, 'id' | 'timestamp'>) => void;
  // Agenda
  bookings: ServiceBooking[];
  onAddBooking: (booking: ServiceBooking) => void;
  onUpdateBookingStatus: (id: string, status: 'approved' | 'rejected' | 'completed', rejectionReason?: string) => void;
  onDeleteBooking: (id: string) => void;
  onActivateSessionFromBooking: (booking: ServiceBooking) => void;
}

export default function Dashboard({
  sessions,
  settings,
  capacity,
  currentUser,
  onDeleteSession,
  onUpdateSession,
  accessorySales,
  isCashOpen,
  onSellAccessory,
  bookings,
  onAddBooking,
  onUpdateBookingStatus,
  onDeleteBooking,
  onActivateSessionFromBooking
}: DashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'history' | 'services' | 'agenda'>('stats');

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Calcular ingresos del día (asumiendo que las sesiones completadas hoy corresponden al día de hoy)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = completedSessions.filter(s => {
    if (!s.exitTime) return false;
    return s.exitTime.startsWith(todayStr);
  });
  
  const todayEarnings = todaySessions.reduce((sum, s) => sum + (s.chargedAmount || 0), 0);
  const totalHistoricalEarnings = completedSessions.reduce((sum, s) => sum + (s.chargedAmount || 0), 0);

  // Ocupación
  const occupiedSpots = activeSessions.length;
  const occupancyPercentage = Math.min(100, Math.round((occupiedSpots / capacity) * 100));

  // Clientes más frecuentes (agrupados por patente)
  const plateVisitsMap: Record<string, { count: number; name?: string; type: VehicleType }> = {};
  sessions.forEach(s => {
    if (!plateVisitsMap[s.plate]) {
      plateVisitsMap[s.plate] = { count: 0, name: s.clientName, type: s.vehicleType };
    }
    plateVisitsMap[s.plate].count += 1;
    if (s.clientName) {
      plateVisitsMap[s.plate].name = s.clientName;
    }
  });

  const frequentClients = Object.entries(plateVisitsMap)
    .map(([plate, data]) => ({ plate, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Distribución de tipos de vehículos
  const vehicleTypeCounts = sessions.reduce((acc, s) => {
    acc[s.vehicleType] = (acc[s.vehicleType] || 0) + 1;
    return acc;
  }, {} as Record<VehicleType, number>);

  const totalVehiclesRegistered = sessions.length;

  return (
    <div className="space-y-6">
      
      {/* Selector de Sub-Pestañas Consolidadas */}
      <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 cursor-pointer ${
            activeSubTab === 'stats'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Estadísticas Generales
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Salidas
        </button>

        <button
          onClick={() => setActiveSubTab('services')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 cursor-pointer ${
            activeSubTab === 'services'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Servicios por Vehículo
        </button>

        <button
          onClick={() => setActiveSubTab('agenda')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 cursor-pointer ${
            activeSubTab === 'agenda'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Agenda de Citas
          {bookings.some(b => b.status === 'pending') && (
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse ml-0.5"></span>
          )}
        </button>
      </div>

      {/* Renderizado de Sub-Pestaña Activa */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          {/* Encabezado Principal */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Panel de Operación y Estadísticas
              </h2>
              <p className="text-slate-400 text-sm mt-1 font-medium">
                Resumen en tiempo real, flujo de ingresos por tramos de tiempo y frecuencia de clientes.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/40 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-emerald-800/60 shadow-lg shadow-emerald-950/20">
              <Activity className="w-4 h-4 animate-pulse text-emerald-400" />
              SISTEMA OPERATIVO
            </div>
          </div>

          {/* Grid de Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card Ocupación */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 p-6 rounded-2xl border border-slate-800/80 shadow-xl hover:border-blue-500/50 transition-all duration-300 group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Ocupación Actual</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-bold text-white group-hover:text-blue-400 transition-colors">{occupiedSpots}</span>
                    <span className="text-slate-500 text-xs font-mono">/ {capacity} cupos</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-900/50 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Car className="w-5 h-5" />
                </div>
              </div>
              
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs font-mono font-medium">
                  <span className="text-slate-500">Porcentaje de uso</span>
                  <span className="text-blue-400 font-bold">{occupancyPercentage}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800/80 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      occupancyPercentage > 85 ? 'bg-rose-500' : occupancyPercentage > 60 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${occupancyPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card Ingresos Hoy */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 p-6 rounded-2xl border border-slate-800/80 shadow-xl hover:border-emerald-500/50 transition-all duration-300 group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Ingresos de Hoy</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono font-bold text-emerald-400">
                        {formatCurrency(todayEarnings, settings.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-900/50 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{todaySessions.length} vehículos facturados</span>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-850 pt-3 space-y-1 text-[10px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>💵 Efectivo:</span>
                  <span className="text-slate-300 font-bold">
                    {formatCurrency(
                      todaySessions
                        .filter(s => s.paymentMethod === 'efectivo' || !s.paymentMethod)
                        .reduce((sum, s) => sum + (s.chargedAmount || 0), 0), 
                      settings.currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>💳 Débito:</span>
                  <span className="text-blue-400 font-bold">
                    {formatCurrency(
                      todaySessions
                        .filter(s => s.paymentMethod === 'debito')
                        .reduce((sum, s) => sum + (s.chargedAmount || 0), 0), 
                      settings.currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>📲 Transf.:</span>
                  <span className="text-indigo-400 font-bold">
                    {formatCurrency(
                      todaySessions
                        .filter(s => s.paymentMethod === 'transferencia')
                        .reduce((sum, s) => sum + (s.chargedAmount || 0), 0), 
                      settings.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Vehículos Totales */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 p-6 rounded-2xl border border-slate-800/80 shadow-xl hover:border-indigo-500/50 transition-all duration-300 group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Registros Totales</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {totalVehiclesRegistered}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">estaciones</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-950/60 text-indigo-400 rounded-xl border border-indigo-900/50 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              
              <p className="text-xs text-slate-400 mt-5 leading-relaxed">
                Cantidad total de vehículos que han ingresado y salido del establecimiento desde el inicio de operaciones.
              </p>
            </div>

            {/* Card Tiempo Promedio */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 p-6 rounded-2xl border border-slate-800/80 shadow-xl hover:border-amber-500/50 transition-all duration-300 group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Estadía Promedio</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-mono font-bold text-amber-400">
                      {completedSessions.length > 0 
                        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / completedSessions.length)
                        : 0
                      }
                    </span>
                    <span className="text-slate-500 text-xs font-mono">minutos</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-900/50 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              
              <p className="text-xs text-slate-400 mt-5 leading-relaxed">
                Tiempo promedio de permanencia por cliente calculado en base a las salidas procesadas.
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Panel Izquierdo: Clientes Frecuentes */}
            <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                Clientes Frecuentes (Top 5)
              </h3>
              <p className="text-slate-400 text-xs mb-6">
                Clientes que registran más visitas recurrentes en el establecimiento.
              </p>

              <div className="space-y-3">
                {frequentClients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-medium">
                    Sin registros suficientes para graficar recurrencia.
                  </div>
                ) : (
                  frequentClients.map((client, i) => (
                    <div 
                      key={client.plate}
                      className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/60 rounded-xl hover:border-slate-700/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold bg-slate-950 px-2 py-1 rounded border border-slate-850 text-slate-400">
                          #{i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white font-mono tracking-wider">
                              {formatPlate(client.plate)}
                            </span>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                              ({getVehicleTypeLabel(client.type)})
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs mt-0.5 font-medium">
                            {client.name || 'Cliente Particular'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-blue-400 font-mono font-bold text-xs block">
                          {client.count} ingresos
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                          historial total
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/80 mt-6">
                <p className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                  <span className="text-blue-400 font-bold uppercase tracking-wider font-mono shrink-0 mt-0.5">Nota:</span>
                  <span>La base de datos detecta automáticamente si una patente ya ha ingresado antes, permitiendo ver su frecuencia, sus últimos tiempos de estadía, y el detalle en la pestaña Historial.</span>
                </p>
              </div>
            </div>

            {/* Panel Derecho: Distribución por tipo de vehículo */}
            <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between backdrop-blur-md">
              <div>
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                  Uso por Categoría
                </h3>
                <p className="text-slate-400 text-xs mb-6">
                  Distribución de ingresos por tipo de vehículo en todo el historial.
                </p>

                <div className="space-y-4">
                  {(['auto', 'hatchback', 'suv', 'moto', 'bicicleta', 'camioneta', 'furgon', 'otro'] as VehicleType[]).map(type => {
                    const count = vehicleTypeCounts[type] || 0;
                    const percent = totalVehiclesRegistered > 0 ? Math.round((count / totalVehiclesRegistered) * 100) : 0;
                    
                    // Colores para cada barra
                    const colorMap: Record<VehicleType, string> = {
                      auto: 'bg-indigo-500',
                      hatchback: 'bg-teal-500',
                      suv: 'bg-sky-500',
                      moto: 'bg-amber-500',
                      bicicleta: 'bg-lime-500',
                      camioneta: 'bg-emerald-500',
                      furgon: 'bg-purple-500',
                      otro: 'bg-slate-500'
                    };

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300 uppercase tracking-wide">{getVehicleTypeLabel(type)}</span>
                          <span className="text-slate-400 font-mono">{count} <span className="text-[10px] text-slate-500">({percent}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-900 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${colorMap[type] || 'bg-slate-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 mt-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 uppercase tracking-wider font-bold">Recaudación Histórica:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {formatCurrency(totalHistoricalEarnings, settings.currency)}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="animate-fade-in">
          <HistoryLog 
            sessions={sessions} 
            settings={settings} 
            currentUser={currentUser}
            onDeleteSession={onDeleteSession}
            onUpdateSession={onUpdateSession}
          />
        </div>
      )}

      {activeSubTab === 'services' && (
        <div className="animate-fade-in">
          <VehicleServicesHistory 
            sessions={sessions}
            accessorySales={accessorySales}
            settings={settings}
            isCashOpen={isCashOpen}
            onSellAccessory={onSellAccessory}
          />
        </div>
      )}

      {activeSubTab === 'agenda' && (
        <div className="animate-fade-in">
          <ServiceBookingManagement 
            bookings={bookings}
            sessions={sessions}
            settings={settings}
            onAddBooking={onAddBooking}
            onUpdateBookingStatus={onUpdateBookingStatus}
            onDeleteBooking={onDeleteBooking}
            onActivateSessionFromBooking={onActivateSessionFromBooking}
          />
        </div>
      )}

    </div>
  );
}
