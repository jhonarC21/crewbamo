/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Loader2, 
  Smartphone, 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle,
  Coins
} from 'lucide-react';
import { formatCurrency } from '../utils/parkingUtils';

interface PaymentGatewayModalProps {
  amount: number;
  description: string;
  plate: string;
  currency: string;
  onSuccess: (data: { provider: string; authCode: string; transactionId: string; method: string }) => void;
  onClose: () => void;
}

type Step = 'select_provider' | 'processing_gateway' | 'approved' | 'rejected';

interface Provider {
  id: string;
  name: string;
  logoColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  method: 'qr' | 'tarjeta';
}

const PROVIDERS: Provider[] = [
  {
    id: 'webpay',
    name: 'Webpay Plus',
    logoColor: 'from-orange-500 to-red-600',
    badgeBg: 'bg-red-950/40 border-red-900/50',
    badgeText: 'text-red-400',
    description: 'Transbank - Tarjetas de Crédito, Débito y Prepago.',
    method: 'tarjeta'
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    logoColor: 'from-sky-400 to-blue-600',
    badgeBg: 'bg-sky-950/40 border-sky-900/50',
    badgeText: 'text-sky-400',
    description: 'Billetera digital y transferencia inmediata con QR.',
    method: 'qr'
  },
  {
    id: 'stripe',
    name: 'Stripe Checkout',
    logoColor: 'from-indigo-500 to-purple-600',
    badgeBg: 'bg-indigo-950/40 border-indigo-900/50',
    badgeText: 'text-indigo-400',
    description: 'Procesamiento internacional seguro de tarjetas bancarias.',
    method: 'tarjeta'
  }
];

export default function PaymentGatewayModal({
  amount,
  description,
  plate,
  currency,
  onSuccess,
  onClose
}: PaymentGatewayModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('select_provider');
  const [selectedProvider, setSelectedProvider] = useState<Provider>(PROVIDERS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Generate random transaction codes when initializing processing
  const initiateTransaction = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStep('processing_gateway');
      // Generate a mock auth code and txn ID
      const randomAuth = Math.floor(100000 + Math.random() * 900000).toString();
      const randomTxn = 'TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      setAuthCode(randomAuth);
      setTransactionId(randomTxn);
    }, 1200);
  };

  const handleSimulateSuccess = () => {
    setCurrentStep('approved');
  };

  const handleSimulateDecline = (reason: string) => {
    setDeclineReason(reason);
    setCurrentStep('rejected');
  };

  const handleFinalize = () => {
    onSuccess({
      provider: selectedProvider.name,
      authCode,
      transactionId,
      method: selectedProvider.method === 'qr' ? 'Código QR' : 'Tarjeta Online'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header de la Pasarela */}
        <div className="p-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block font-sans">Pasarela de Pago Certificada</span>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Pago Electrónico Integrado</h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-900 cursor-pointer text-xs font-bold"
          >
            ✕ Cancelar
          </button>
        </div>

        {/* Resumen de Cobro Fijo */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-850/50 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Detalle del Cobro</span>
            <p className="text-xs text-slate-300 font-bold truncate">{description}</p>
            <p className="text-[10px] text-slate-500 font-semibold font-mono">Patente: {plate}</p>
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Monto a Cancelar</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL DEPENDIENDO DEL PASO */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* PASO 1: SELECCIONAR PROVEEDOR */}
          {currentStep === 'select_provider' && (
            <div className="space-y-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">1. Seleccione Proveedor de Pago</span>
              
              <div className="space-y-2.5">
                {PROVIDERS.map((prov) => (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedProvider(prov)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      selectedProvider.id === prov.id
                        ? 'bg-slate-950 border-blue-500 shadow-lg shadow-blue-950/20'
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-950/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${prov.logoColor} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      {prov.method === 'qr' ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{prov.name}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${prov.badgeBg} ${prov.badgeText}`}>
                          {prov.method === 'qr' ? 'QR / Digital' : 'Tarjeta'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">{prov.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={initiateTransaction}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Iniciando Conexión...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceder con {selectedProvider.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encriptación TLS de 256 bits activa.</span>
              </div>
            </div>
          )}

          {/* PASO 2: SIMULACIÓN DE TERMINAL / COBRO EN CURSO */}
          {currentStep === 'processing_gateway' && (
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-blue-400 bg-blue-950/40 border border-blue-900/40 px-2.5 py-1 rounded-full inline-block uppercase tracking-wider font-mono">
                  {selectedProvider.name} en Línea
                </span>
                <p className="text-white font-bold text-sm">Esperando Respuesta del Dispositivo</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  La pasarela de pago electrónico está procesando. Solicite al cliente interactuar con el simulador.
                </p>
              </div>

              {/* SIMULADOR DE PANTALLA INTEGRADA */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850/80 shadow-inner relative max-w-[280px] mx-auto space-y-4">
                <div className="absolute top-2.5 inset-x-0 flex justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
                </div>

                <div className="pt-2 flex flex-col items-center">
                  {selectedProvider.method === 'qr' ? (
                    /* Simular Pago QR */
                    <div className="space-y-3.5">
                      <div className="p-3 bg-white rounded-xl shadow-md inline-block">
                        {/* Elegant mock QR code using standard tables/borders and dots */}
                        <div className="w-36 h-36 border border-slate-300 flex items-center justify-center bg-slate-100 rounded-lg relative overflow-hidden">
                          <QrCode className="w-28 h-28 text-slate-900" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 mix-blend-overlay"></div>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-300 font-bold">Escanear para Pagar</p>
                        <p className="text-[8px] text-slate-500">Use la cámara del banco o Mercado Pago</p>
                      </div>
                    </div>
                  ) : (
                    /* Simular Tarjetas Bancarias */
                    <div className="w-full space-y-3 text-left">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block text-center">Formulario Seguro de Tarjeta</span>
                      
                      <div className="space-y-2 text-[10px]">
                        <div>
                          <input
                            type="text"
                            placeholder="Número de Tarjeta"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              // format with spaces
                              let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                              let matches = v.match(/\d{4,16}/g);
                              let match = matches && matches[0] || '';
                              let parts = [];
                              for (let i = 0, len = match.length; i < len; i += 4) {
                                parts.push(match.substring(i, i + 4));
                              }
                              if (parts.length > 0) {
                                setCardNumber(parts.join(' '));
                              } else {
                                setCardNumber(v);
                              }
                            }}
                            className="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-white font-mono placeholder:text-slate-600 focus:outline-hidden"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="MM/AA"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-white font-mono placeholder:text-slate-600 focus:outline-hidden text-center"
                          />
                          <input
                            type="password"
                            placeholder="CVC"
                            maxLength={3}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-white font-mono placeholder:text-slate-600 focus:outline-hidden text-center"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Nombre del Titular"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Indicador de Espera */}
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-blue-400 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span>PROCESANDO DE TRANSACCIÓN...</span>
                </div>
              </div>

              {/* ACCIONES DEL SIMULADOR - CONTROL DEL OPERADOR */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 space-y-2">
                <span className="text-[8px] text-amber-500 font-black tracking-widest uppercase block">Panel de Control de Pruebas (Simulador)</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateSuccess}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Simular Aprobado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateDecline('Fondos Insuficientes')}
                    className="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold text-[10px] uppercase tracking-wider border border-rose-900/50 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Simular Rechazo
                  </button>
                </div>
                <div className="flex gap-1.5 justify-center pt-1">
                  <button 
                    onClick={() => handleSimulateDecline('Tarjeta Vencida / Inválida')} 
                    className="text-[8px] text-slate-500 hover:text-slate-400 underline cursor-pointer"
                  >
                    [Rechazar Tarjeta Vencida]
                  </button>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={() => handleSimulateDecline('Límite de Crédito Excedido')} 
                    className="text-[8px] text-slate-500 hover:text-slate-400 underline cursor-pointer"
                  >
                    [Rechazar Límite Excedido]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: APROBADO */}
          {currentStep === 'approved' && (
            <div className="space-y-5 text-center py-2 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-950/40 border border-emerald-900 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-emerald-400 font-black text-sm uppercase tracking-wider">¡Pago Exitoso!</h4>
                <p className="text-xs text-white">La transacción fue autorizada por {selectedProvider.name}.</p>
              </div>

              {/* Voucher de Pago */}
              <div className="bg-slate-950 rounded-xl border border-slate-850 p-4 text-xs text-left font-mono space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Pasarela:</span>
                  <span className="font-bold text-white uppercase">{selectedProvider.id} ({selectedProvider.method === 'qr' ? 'QR' : 'Tarjeta'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ID Transacción:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-200">{transactionId}</span>
                    <button 
                      onClick={() => copyToClipboard(transactionId)}
                      className="text-slate-500 hover:text-white p-0.5"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Código de Autoriz.:</span>
                  <span className="font-bold text-emerald-400">{authCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto Cobrado:</span>
                  <span className="font-bold text-white">{formatCurrency(amount, currency)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-500">
                  <span>Fecha & Hora:</span>
                  <span>{new Date().toLocaleString('es-CL')}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFinalize}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar Pago y Finalizar</span>
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: RECHAZADO */}
          {currentStep === 'rejected' && (
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="w-14 h-14 bg-rose-950/40 border border-rose-900 text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <XCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-rose-400 font-black text-sm uppercase tracking-wider">Transacción Denegada</h4>
                <p className="text-xs text-white">El emisor de la tarjeta rechazó la solicitud.</p>
                <div className="inline-block px-3 py-1 bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[10px] font-bold rounded-full font-mono mt-1">
                  Motivo: {declineReason || 'Error de Comunicación general'}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-normal">
                Por favor, intente con otra tarjeta, verifique que la billetera tenga saldo, o regrese al menú anterior para seleccionar Efectivo o Transferencia Bancaria Directa.
              </p>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setCurrentStep('select_provider')}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Volver Atrás
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Informativo Fijo */}
        <div className="bg-slate-950 p-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-sans">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Certificado PCI-DSS Compliant & Encriptación AES-GCM</span>
        </div>

      </div>
    </div>
  );
}
