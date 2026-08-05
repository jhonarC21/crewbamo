/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CashSession, CashMovement, ParkingSession, TariffSettings, PaymentMethod, AccessorySale } from '../types';
import { formatCurrency } from '../utils/parkingUtils';
import { 
  Wallet, 
  Coins, 
  TrendingUp, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  ArrowDownRight, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  History, 
  CreditCard, 
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';

interface CashRegisterProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  cashSessions: CashSession[];
  accessorySales: AccessorySale[];
  onOpenCash: (openingBalance: number, notes?: string) => void;
  onCloseCash: (closingBalance: number, notes?: string) => void;
  onAddMovement: (type: 'ingreso' | 'egreso', amount: number, description: string) => void;
}

export default function CashRegister({
  sessions,
  settings,
  cashSessions,
  accessorySales,
  onOpenCash,
  onCloseCash,
  onAddMovement
}: CashRegisterProps) {
  
  // States para apertura
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(20000); // 20.000 de base por defecto
  const [openingNotes, setOpeningNotes] = useState('');

  // States para registrar movimiento manual
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('egreso');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementDesc, setMovementDesc] = useState('');
  const [movementError, setMovementError] = useState('');

  // States para cierre de caja
  const [physicalCashInput, setPhysicalCashInput] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Encontrar sesión de caja activa
  const activeSession = cashSessions.find(s => s.status === 'open');

  // Calcular las ventas realizadas durante la sesión de caja activa actual
  // Las ventas son sesiones completadas (status === 'completed') cuya hora de salida (exitTime)
  // es posterior a la hora de apertura de la caja (openedAt) más ventas de accesorios
  const getSalesFromActiveSession = () => {
    if (!activeSession) return { cash: 0, debito: 0, transferencia: 0, tarjeta_online: 0, total: 0, parkingCount: 0, accessoryCount: 0, parkingTotal: 0, accessoryTotal: 0, accessoryNet: 0, accessoryIva: 0 };

    let cash = 0;
    let debito = 0;
    let transferencia = 0;
    let tarjeta_online = 0;
    let parkingTotal = 0;
    let accessoryTotal = 0;

    const completedInSession = sessions.filter(s => 
      s.status === 'completed' && 
      s.exitTime && 
      new Date(s.exitTime).getTime() >= new Date(activeSession.openedAt).getTime()
    );

    completedInSession.forEach(s => {
      const amount = s.chargedAmount || 0;
      parkingTotal += amount;
      if (s.paymentMethod === 'efectivo' || !s.paymentMethod) {
        cash += amount;
      } else if (s.paymentMethod === 'debito') {
        debito += amount;
      } else if (s.paymentMethod === 'transferencia') {
        transferencia += amount;
      } else if (s.paymentMethod === 'tarjeta_online') {
        tarjeta_online += amount;
      }
    });

    const accessorySalesInSession = (accessorySales || []).filter(as => 
      new Date(as.timestamp).getTime() >= new Date(activeSession.openedAt).getTime()
    );

    let accessoryNet = 0;
    accessorySalesInSession.forEach(as => {
      const amount = as.totalPrice;
      accessoryTotal += amount;
      
      const rate = as.ivaRate !== undefined ? as.ivaRate : 19;
      const netVal = as.netPrice !== undefined ? as.netPrice : Math.round(amount / (1 + rate / 100));
      accessoryNet += netVal;

      if (as.paymentMethod === 'efectivo') {
        cash += amount;
      } else if (as.paymentMethod === 'debito') {
        debito += amount;
      } else if (as.paymentMethod === 'transferencia') {
        transferencia += amount;
      } else if (as.paymentMethod === 'tarjeta_online') {
        tarjeta_online += amount;
      }
    });

    const accessoryIva = accessoryTotal - accessoryNet;

    return {
      cash,
      debito,
      transferencia,
      tarjeta_online,
      total: cash + debito + transferencia + tarjeta_online,
      parkingCount: completedInSession.length,
      accessoryCount: accessorySalesInSession.length,
      parkingTotal,
      accessoryTotal,
      accessoryNet,
      accessoryIva
    };
  };

  const sales = getSalesFromActiveSession();

  // Calcular totales de movimientos manuales de la sesión activa
  const manualInputs = activeSession 
    ? activeSession.movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
    : 0;

  const manualOutputs = activeSession 
    ? activeSession.movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0)
    : 0;

  // Efectivo esperado en caja = Monto Apertura + Ventas Efectivo + Ingresos Manuales - Egresos Manuales
  const expectedCashInDrawer = activeSession 
    ? activeSession.openingBalance + sales.cash + manualInputs - manualOutputs
    : 0;

  // Manejar apertura de caja
  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    if (openingBalanceInput < 0) return;
    onOpenCash(openingBalanceInput, openingNotes.trim() || undefined);
    setOpeningNotes('');
    // Inicializar el input de arqueo de caja con el efectivo esperado para facilitar el proceso
    setPhysicalCashInput(openingBalanceInput);
  };

  // Manejar agregar movimiento manual
  const handleAddManualMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setMovementError('');

    if (movementAmount <= 0) {
      setMovementError('El monto debe ser mayor a cero.');
      return;
    }
    if (!movementDesc.trim()) {
      setMovementError('Debe ingresar una descripción/motivo.');
      return;
    }

    onAddMovement(movementType, movementAmount, movementDesc.trim());
    setMovementAmount(0);
    setMovementDesc('');
  };

  // Manejar el cierre de caja final
  const handleClose = () => {
    onCloseCash(physicalCashInput, closingNotes.trim() || undefined);
    setClosingNotes('');
    setShowConfirmClose(false);
  };

  // Sincronizar input de arqueo cuando cambia el efectivo esperado
  React.useEffect(() => {
    if (activeSession) {
      setPhysicalCashInput(expectedCashInDrawer);
    }
  }, [expectedCashInDrawer, !!activeSession]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Encabezado y Estado de Caja */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-900/40 text-blue-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Caja y Turnos Diarios</h2>
            <p className="text-xs text-slate-400">Gestión de flujo de efectivo, cuadratura de caja y arqueo de turnos.</p>
          </div>
        </div>

        {/* Estado Visual */}
        {activeSession ? (
          <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold font-mono">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span>TURNO ACTIVO (ABIERTO)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold font-mono">
            <span className="w-2.5 h-2.5 bg-slate-600 rounded-full"></span>
            <span>TURNO INACTIVO (CERRADO)</span>
          </div>
        )}
      </div>

      {/* CASO A: Caja Cerrada -> Formulario de Apertura */}
      {!activeSession && (
        <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center gap-2.5">
            <Unlock className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-white text-base">Apertura de Turno de Caja</h3>
          </div>
          
          <form onSubmit={handleOpen} className="p-6 space-y-6">
            <div className="bg-blue-950/20 border border-blue-900/30 p-4 rounded-xl text-slate-300 text-xs flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Atención:</strong> Para registrar salidas de vehículos, recaudar dinero y llevar un control contable, debe realizar la <strong>Apertura de Caja</strong> ingresando el saldo inicial en efectivo (sencillo de base para dar vuelto).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Saldo Inicial en Efectivo (Base Sencillo)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 font-mono">
                    {settings.currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(Number(e.target.value))}
                    className="w-full bg-slate-950/80 pl-8 pr-4 py-3 rounded-xl border border-slate-800 font-bold text-white text-sm font-mono focus:outline-hidden focus:border-blue-500 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">
                  Dinero en efectivo físico presente en la gaveta al comenzar el turno.
                </span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Notas de Apertura
                </label>
                <textarea
                  placeholder="Ej. Sencillo cargado por administrador, turno mañana..."
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                Iniciar Apertura de Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CASO B: Caja Abierta -> Panel Bento de Gestión Activa */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Estadísticas Bento y Resumen Financiero */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bento Grid de Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: EFECTIVO ESPERADO (Caja Chica) */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">EFECTIVO EN GAVETA</span>
                    <Coins className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-mono font-black text-white mt-2">
                    {formatCurrency(expectedCashInDrawer, settings.currency)}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Monto teórico que debe estar físicamente en efectivo.
                  </p>
                </div>

                <div className="border-t border-slate-850 pt-3.5 space-y-1.5 text-[10px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Base Apertura:</span>
                    <span className="text-slate-300 font-bold">{formatCurrency(activeSession.openingBalance, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Ventas Efectivo:</span>
                    <span className="text-emerald-400 font-bold">+{formatCurrency(sales.cash, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Entradas Caja:</span>
                    <span className="text-blue-400 font-bold">+{formatCurrency(manualInputs, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Salidas/Gastos:</span>
                    <span className="text-rose-400 font-bold">-{formatCurrency(manualOutputs, settings.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: OTROS MEDIOS Y VENTAS TOTALES */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">RESUMEN COBROS TURNO</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-mono font-black text-emerald-400 mt-2">
                    {formatCurrency(sales.total, settings.currency)}
                  </h3>
                  <div className="mt-2.5 pt-2 border-t border-slate-850/40 space-y-1 font-mono text-[9px] text-slate-400">
                    <div className="flex justify-between">
                      <span>🚗 Estacionamiento:</span>
                      <span className="text-slate-200 font-bold">{formatCurrency(sales.parkingTotal, settings.currency)} ({sales.parkingCount} u.)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛍️ Venta Accesorios:</span>
                      <span className="text-slate-200 font-bold">{formatCurrency(sales.accessoryTotal, settings.currency)} ({sales.accessoryCount} u.)</span>
                    </div>
                    {sales.accessoryCount > 0 && (
                      <div className="flex justify-between text-slate-500 text-[8px] pl-3.5 border-l border-slate-800">
                        <span>Neto: {formatCurrency(sales.accessoryNet, settings.currency)}</span>
                        <span>IVA: {formatCurrency(sales.accessoryIva, settings.currency)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-3.5 space-y-1.5 text-[10px] font-mono text-slate-400">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">💵 Efectivo:</span>
                    <span className="text-slate-300 font-bold">{formatCurrency(sales.cash, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">💳 Tarjetas Débito:</span>
                    <span className="text-blue-400 font-bold">{formatCurrency(sales.debito, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">📲 Transferencias:</span>
                    <span className="text-purple-400 font-bold">{formatCurrency(sales.transferencia, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">🌐 Pago Electrónico (Pasarela):</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(sales.tarjeta_online || 0, settings.currency)}</span>
                  </div>
                  <div className="border-t border-slate-850/60 pt-1.5 flex justify-between text-xs font-bold text-slate-200">
                    <span>Ventas del Turno:</span>
                    <span>{formatCurrency(sales.total, settings.currency)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Formulario y Registro de Movimientos Manuales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
              
              {/* Form de Ingreso/Egreso */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-blue-500" />
                  Registrar Movimiento de Efectivo
                </h4>

                <form onSubmit={handleAddManualMovement} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      Tipo de Movimiento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMovementType('egreso')}
                        className={`py-2 rounded-lg font-bold text-center transition-all border cursor-pointer ${
                          movementType === 'egreso'
                            ? 'bg-rose-950/30 border-rose-900/60 text-rose-400'
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        🔴 Egreso / Retiro / Gasto
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovementType('ingreso')}
                        className={`py-2 rounded-lg font-bold text-center transition-all border cursor-pointer ${
                          movementType === 'ingreso'
                            ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400'
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400'
                        }`}
                      >
                        🟢 Ingreso / Sencillo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Monto ({settings.currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        value={movementAmount || ''}
                        onChange={(e) => setMovementAmount(Number(e.target.value))}
                        placeholder="Ej. 5000"
                        className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-850 font-bold text-white font-mono focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Descripción / Motivo
                      </label>
                      <input
                        type="text"
                        required
                        value={movementDesc}
                        onChange={(e) => setMovementDesc(e.target.value)}
                        placeholder="Ej. Compra artículos aseo"
                        className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-850 text-xs text-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {movementError && (
                    <p className="text-rose-400 text-[11px] font-semibold">{movementError}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-2.5 rounded-xl border border-slate-800 transition-colors uppercase tracking-wider text-[10px] cursor-pointer"
                  >
                    Registrar en Caja
                  </button>
                </form>
              </div>

              {/* Listado de Movimientos Manuales de este turno */}
              <div className="border-t md:border-t-0 md:border-l border-slate-850 pt-6 md:pt-0 md:pl-6 flex flex-col h-full">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 flex items-center justify-between">
                  <span>Movimientos del Turno</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">Historial del turno</span>
                </h4>

                <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1 custom-scrollbar">
                  {activeSession.movements.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-8 text-center text-slate-600 font-mono text-[10px]">
                      [ No hay ingresos o egresos registrados ]
                    </div>
                  ) : (
                    [...activeSession.movements].reverse().map((mov) => (
                      <div 
                        key={mov.id} 
                        className="p-2.5 bg-slate-950/70 border border-slate-900 rounded-xl flex justify-between items-center gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {mov.type === 'ingreso' ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400 bg-emerald-950/40 p-0.5 rounded-md border border-emerald-900/30 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-rose-400 bg-rose-950/40 p-0.5 rounded-md border border-rose-900/30 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-300 truncate max-w-[120px]">{mov.description}</p>
                            <span className="text-[8px] text-slate-600 font-mono">
                              {new Date(mov.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <span className={`font-mono font-bold ${mov.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount, settings.currency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Columna Derecha: Arqueo y Cierre de Caja */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col justify-between">
            
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-white text-sm">Arqueo y Cierre de Caja</h3>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Efectivo Teórico Esperado</span>
                <p className="text-xl font-mono font-black text-blue-400">
                  {formatCurrency(expectedCashInDrawer, settings.currency)}
                </p>
                <p className="text-[9px] text-slate-400 leading-normal mt-1.5">
                  Calculado automáticamente según el flujo de ventas en efectivo y aportes/retiros.
                </p>
              </div>

              {/* Formulario de Conteo Físico */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Efectivo Real Contado (Arqueo Físico)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 font-mono">
                      {settings.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      value={physicalCashInput}
                      onChange={(e) => setPhysicalCashInput(Number(e.target.value))}
                      className="w-full bg-slate-950 pl-8 pr-4 py-3 rounded-xl border border-slate-850 font-bold text-white text-base font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block leading-normal">
                    Cuente físicamente los billetes y monedas en la gaveta y digite el total.
                  </span>
                </div>

                {/* Resultado de cuadratura en tiempo real */}
                {(() => {
                  const diff = physicalCashInput - expectedCashInDrawer;
                  if (diff === 0) {
                    return (
                      <div className="bg-emerald-950/30 border border-emerald-900/50 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-400">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[10px]">Caja Cuadrada</p>
                          <p className="text-[10px] text-slate-400 font-medium">El efectivo coincide perfectamente.</p>
                        </div>
                      </div>
                    );
                  } else if (diff > 0) {
                    return (
                      <div className="bg-amber-950/30 border border-amber-900/50 p-3.5 rounded-xl flex items-center gap-2.5 text-amber-400">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[10px]">Sobrante de Caja</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Hay un excedente de <strong className="text-amber-400 font-mono font-bold">+{formatCurrency(diff, settings.currency)}</strong>.
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-rose-950/30 border border-rose-900/50 p-3.5 rounded-xl flex items-center gap-2.5 text-rose-400">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[10px]">Faltante de Caja</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Hay una diferencia negativa de <strong className="text-rose-400 font-mono font-bold">{formatCurrency(diff, settings.currency)}</strong>.
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Comentarios de Cierre */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Comentarios del Cierre
                  </label>
                  <textarea
                    placeholder="Ej. Faltante de $200 por problemas de vuelto, caja cuadrada..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2.5}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Acciones de Cierre */}
            <div className="pt-6 border-t border-slate-850 mt-6 space-y-3.5">
              {!showConfirmClose ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmClose(true)}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  Proceder al Cierre de Caja
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-rose-900/40 text-center">
                    <p className="text-[11px] font-bold text-rose-400">¿Confirmas cerrar este turno?</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Se archivará el registro y no podrás agregar más movimientos.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmClose(false)}
                      className="py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-950 transition-colors border border-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Sí, Cerrar Caja
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* HISTORIAL DE CIERRES DE CAJA ANTERIORES */}
      <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-md">
        
        <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/20">
          <div className="flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-blue-500" />
            <h3 className="font-bold text-white text-sm">Historial de Turnos y Cierres ({cashSessions.filter(s => s.status === 'closed').length})</h3>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Resguardo de auditoría de arqueos</span>
        </div>

        <div className="overflow-x-auto text-xs">
          {cashSessions.filter(s => s.status === 'closed').length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-sm">
              [ No hay registros de cierres anteriores ]
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-950/10">
                  <th className="py-3.5 px-6">Fechas (Apertura / Cierre)</th>
                  <th className="py-3.5 px-6 text-right">Apertura</th>
                  <th className="py-3.5 px-6 text-right">Efectivo Esperado</th>
                  <th className="py-3.5 px-6 text-right">Efectivo Real</th>
                  <th className="py-3.5 px-6 text-right">Discrepancia</th>
                  <th className="py-3.5 px-6 text-right">Ventas Totales</th>
                  <th className="py-3.5 px-6">Comentarios / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {[...cashSessions]
                  .filter(s => s.status === 'closed')
                  .reverse()
                  .map((s) => {
                    const diff = (s.closingBalance || 0) - (s.expectedBalance || 0);
                    const totalSales = s.cashSales + s.debitoSales + s.transferenciaSales + (s.tarjetaOnlineSales || 0);
                    
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/30 text-slate-300">
                        
                        {/* Fechas de Turno */}
                        <td className="py-4 px-6 font-mono text-[11px]">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5">
                              <span className="text-[9px] text-slate-600 font-bold uppercase w-10">Abre:</span>
                              <span>{new Date(s.openedAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                            {s.closedAt && (
                              <p className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-600 font-bold uppercase w-10">Cierra:</span>
                                <span>{new Date(s.closedAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Apertura */}
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-400">
                          {formatCurrency(s.openingBalance, settings.currency)}
                        </td>

                        {/* Esperado */}
                        <td className="py-4 px-6 text-right font-mono text-slate-400">
                          {formatCurrency(s.expectedBalance || 0, settings.currency)}
                        </td>

                        {/* Real contado */}
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-300">
                          {formatCurrency(s.closingBalance || 0, settings.currency)}
                        </td>

                        {/* Diferencia */}
                        <td className="py-4 px-6 text-right font-mono">
                          {diff === 0 ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded font-bold uppercase">
                              Cuadrada
                            </span>
                          ) : diff > 0 ? (
                            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/30 px-2 py-0.5 rounded font-bold font-mono">
                              +{formatCurrency(diff, settings.currency)} Sobrante
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 bg-rose-950/40 border border-rose-900/30 px-2 py-0.5 rounded font-bold font-mono">
                              {formatCurrency(diff, settings.currency)} Faltante
                            </span>
                          )}
                        </td>

                        {/* Recaudación Total */}
                        <td className="py-4 px-6 text-right font-mono">
                          <span className="font-bold text-emerald-400 block">{formatCurrency(totalSales, settings.currency)}</span>
                          <span className="text-[9px] text-slate-500 font-semibold uppercase block mt-1">
                            💵{formatCurrency(s.cashSales, settings.currency)} | 💳{formatCurrency(s.debitoSales, settings.currency)} | 📲{formatCurrency(s.transferenciaSales, settings.currency)} | 🌐{formatCurrency(s.tarjetaOnlineSales || 0, settings.currency)}
                          </span>
                        </td>

                        {/* Comentarios */}
                        <td className="py-4 px-6 text-slate-400 italic max-w-[200px] truncate">
                          {s.notes || '-'}
                        </td>

                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
