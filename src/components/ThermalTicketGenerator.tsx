import React, { useState, useEffect } from 'react';
import { ParkingSession, TariffSettings, VehicleType, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/parkingUtils';
import { jsPDF } from 'jspdf';
import { 
  Printer, 
  ArrowLeftRight, 
  Settings, 
  FileText, 
  Download, 
  Clock, 
  User, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Hash,
  ChevronDown,
  Scissors,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';

// Helper to generate base64 QR code data URL using qrcode library
const getQrCodeDataUrl = async (plateText: string): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(
      window.location.origin + window.location.pathname + '?plate=' + plateText.trim().toUpperCase(),
      { margin: 1, width: 150 }
    );
    return dataUrl;
  } catch (e) {
    console.error("Error generating QR code for PDF:", e);
    return '';
  }
};

interface ThermalTicketGeneratorProps {
  sessions: ParkingSession[];
  settings: TariffSettings;
  companyLogo?: string;
  showLogoInTicket?: boolean;
}

export default function ThermalTicketGenerator({ 
  sessions, 
  settings, 
  companyLogo = '', 
  showLogoInTicket = false 
}: ThermalTicketGeneratorProps) {
  // Configuración del emisor (Guardado en localStorage)
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('ticket_business_name') || 'ESTACIONAMIENTO CENTRAL');
  const [businessId, setBusinessId] = useState(() => localStorage.getItem('ticket_business_id') || 'RUT: 77.345.123-K');
  const [businessAddress, setBusinessAddress] = useState(() => localStorage.getItem('ticket_business_address') || 'Av. Providencia 1245, Santiago');
  const [businessPhone, setBusinessPhone] = useState(() => localStorage.getItem('ticket_business_phone') || 'Tel: +56 9 1234 5678');
  const [ticketFooter, setTicketFooter] = useState(() => localStorage.getItem('ticket_footer') || 'Conserve este ticket. No nos responsabilizamos por objetos de valor no declarados al ingresar. ¡Gracias por su preferencia!');

  // Persistir configuración del ticket
  useEffect(() => {
    localStorage.setItem('ticket_business_name', businessName);
    localStorage.setItem('ticket_business_id', businessId);
    localStorage.setItem('ticket_business_address', businessAddress);
    localStorage.setItem('ticket_business_phone', businessPhone);
    localStorage.setItem('ticket_footer', ticketFooter);
  }, [businessName, businessId, businessAddress, businessPhone, ticketFooter]);

  // Estados de generación del Ticket
  const [ticketType, setTicketType] = useState<'ingreso' | 'egreso' | 'boleta' | 'grabado'>('ingreso');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  // Datos del formulario manual/auto-completado
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [chargedAmount, setChargedAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [slotNumber, setSlotNumber] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Estados específicos para Boleta Comercial / Boleta de Servicio
  const [clientRut, setClientRut] = useState<string>('12.345.678-9');
  const [clientName, setClientName] = useState<string>('Juan Pérez');
  const [clientPhone, setClientPhone] = useState<string>('+569 8765 4321');
  const [controlNum, setControlNum] = useState<string>('8319');
  const [scheduleText, setScheduleText] = useState<string>('HORARIO: 8:30 AM A 6:30 PM');
  const [rateText, setRateText] = useState<string>('MINIMO $ 900 / HORA: $ 1.800');
  const [paymentText, setPaymentText] = useState<string>('DÉBITO: MAS DE $1,000');
  const [footerBannerText, setFooterBannerText] = useState<string>('VALIDO COMO BOLETA DE SERVICIO');
  
  // Configuración física de impresión
  const [paperHeight, setPaperHeight] = useState<number>(100); // en mm
  const [autoHeight, setAutoHeight] = useState(true);

  // Éxito y Errores
  const [successMsg, setSuccessMsg] = useState('');

  // Filtrar sesiones disponibles para auto-completar
  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Actualizar formulario cuando se selecciona una sesión pre-existente
  useEffect(() => {
    if (selectedSessionId === 'manual') {
      // No hacer nada, dejar vacío o mantener el estado
      return;
    }

    const session = sessions.find(s => s.id === selectedSessionId);
    if (session) {
      setPlate(session.plate);
      setVehicleType(session.vehicleType);
      setBrand(session.brand || '');
      setModel(session.model || '');
      setColor(session.color || '');
      setYear(session.year || '');
      
      // Convertir ISO string a datetime-local format para el input
      const entryDateObj = new Date(session.entryTime);
      const entryFormatted = formatDateForInput(entryDateObj);
      setEntryTime(entryFormatted);

      if (ticketType === 'egreso') {
        const exitDateObj = session.exitTime ? new Date(session.exitTime) : new Date();
        setExitTime(formatDateForInput(exitDateObj));
        setChargedAmount(session.chargedAmount || 0);
        setPaymentMethod(session.paymentMethod || 'efectivo');
      } else {
        // Si cambiamos a ingreso, borrar salida
        setExitTime('');
        setChargedAmount(0);
      }
      
      if (session.notes) {
        setCustomNotes(session.notes);
      } else {
        setCustomNotes('');
      }

      // Buscar número de slot si viene en notas o generar aleatorio coherente
      const slotMatch = session.notes?.match(/casillero|slot|estacionamiento\s*(\d+)/i);
      if (slotMatch) {
        setSlotNumber(slotMatch[1]);
      } else {
        setSlotNumber('');
      }
    }
  }, [selectedSessionId, ticketType, sessions]);

  // Cuando cambia el tipo de ticket, resetear selección
  useEffect(() => {
    setSelectedSessionId('');
    resetForm();
  }, [ticketType]);

  const resetForm = () => {
    setPlate('');
    setVehicleType('auto');
    setBrand('');
    setModel('');
    setColor('');
    setYear('');
    setEntryTime(formatDateForInput(new Date()));
    setExitTime(ticketType === 'egreso' ? formatDateForInput(new Date()) : '');
    setChargedAmount(0);
    setPaymentMethod('efectivo');
    setSlotNumber('');
    setCustomNotes('');
  };

  // Helper para dar formato datetime-local
  function formatDateForInput(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset en ms
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  }

  // Helper para formatear fecha legible
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calcular duración aproximada si es egreso
  const calculateDurationString = () => {
    if (!entryTime || !exitTime) return '0 min';
    const entryObj = new Date(entryTime);
    const exitObj = new Date(exitTime);
    const diffMs = exitObj.getTime() - entryObj.getTime();
    if (diffMs <= 0) return '0 min';

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
  };

  // Generar cadena de texto del Ticket estructurado para Courier monospaced (28 caracteres de ancho para 58mm)
  const generateTicketTextLines = (): string[] => {
    const width = 28; // Ancho seguro para rollo de 58mm
    const lines: string[] = [];

    // Separador monótono
    const hr = '-'.repeat(width);
    const dblHr = '='.repeat(width);

    // Centrar texto
    const center = (text: string): string => {
      const cleanText = text.slice(0, width);
      const pad = Math.max(0, Math.floor((width - cleanText.length) / 2));
      return ' '.repeat(pad) + cleanText;
    };

    // Formatear línea key-value justificada
    const justify = (key: string, value: string): string => {
      const spaceLeft = width - key.length - value.length;
      if (spaceLeft <= 0) {
        return (key + ' ' + value).slice(0, width);
      }
      return key + ' '.repeat(spaceLeft) + value;
    };

    // Si el ticket es de grabado de vidrio, se imprime únicamente la patente a ser grabada sin membrete ni marcas de corte
    if (ticketType === 'grabado') {
      const cleanPlate = plate.trim().toUpperCase() || 'FBTT88';
      lines.push(center('PATENTES A GRABAR'));
      lines.push('='.repeat(width));
      lines.push('');
      for (let i = 0; i < 6; i++) {
        lines.push(center(`[  ${cleanPlate}  ]`));
        lines.push('');
      }
      return lines;
    }

    // Si el ticket es de Boleta Comercial / Boleta de Servicio
    if (ticketType === 'boleta') {
      const cleanPlate = plate.trim().toUpperCase() || 'S/PATENTE';
      lines.push(center(businessName));
      if (businessId) lines.push(center(`RUT: ${businessId}`));
      if (businessPhone) lines.push(center(`TEL: ${businessPhone}`));
      lines.push(dblHr);
      lines.push(center('BOLETA DE SERVICIO'));
      if (controlNum) lines.push(center(`Nº CONTROL: ${controlNum}`));
      lines.push(hr);

      // Datos Cliente
      if (clientName || clientRut || clientPhone) {
        lines.push('DATOS DEL CLIENTE:');
        if (clientName) lines.push(justify('CLIENTE:', clientName));
        if (clientRut) lines.push(justify('RUT:', clientRut));
        if (clientPhone) lines.push(justify('TEL:', clientPhone));
        lines.push(hr);
      }

      // Datos Vehículo
      lines.push('DATOS DEL VEHICULO:');
      lines.push(justify('PATENTE:', cleanPlate));
      const vehDetails = [brand, model, color, year].filter(Boolean).join(' ');
      if (vehDetails) lines.push(justify('VEHICULO:', vehDetails));
      lines.push(hr);

      // Recepción y Servicio
      lines.push('RECEPCION Y SERVICIO:');
      if (entryTime) {
        const formatted = formatReadableDate(entryTime);
        lines.push(justify('FECHA:', formatted.split(' ')[0]));
        lines.push(justify('HORA:', formatted.split(' ')[1] || ''));
      }
      if (chargedAmount > 0) {
        lines.push(justify('TOTAL:', formatCurrency(chargedAmount, settings.currency)));
      }
      if (customNotes) {
        lines.push(justify('SERVICIO:', customNotes));
      }
      lines.push(hr);

      if (scheduleText) lines.push(center(scheduleText));
      if (rateText) lines.push(center(rateText));
      if (paymentText) lines.push(center(paymentText));
      lines.push(dblHr);
      lines.push(center(footerBannerText || 'VALIDO COMO BOLETA'));
      return lines;
    }

    // 1. Datos Emisor
    lines.push(center(businessName));
    if (businessId) lines.push(center(businessId));
    if (businessAddress) lines.push(center(businessAddress));
    if (businessPhone) lines.push(center(businessPhone));
    lines.push(hr);

    // 2. Tipo de ticket
    if (ticketType === 'ingreso') {
      lines.push(center('*** TICKET DE INGRESO ***'));
    } else {
      lines.push(center('*** TICKET DE SALIDA ***'));
    }
    lines.push(hr);

    // 3. Contenido Principal
    lines.push(justify('PATENTE:', plate.trim().toUpperCase() || 'S/PATENTE'));
    
    const labelVehiculo = vehicleType.toUpperCase();
    lines.push(justify('VEHICULO:', labelVehiculo));

    if (brand.trim()) {
      lines.push(justify('MARCA:', brand.trim().toUpperCase()));
    }
    if (model.trim()) {
      lines.push(justify('MODELO:', model.trim().toUpperCase()));
    }
    if (color.trim()) {
      lines.push(justify('COLOR:', color.trim().toUpperCase()));
    }
    if (year.trim()) {
      lines.push(justify('ANIO:', year.trim()));
    }

    if (slotNumber) {
      lines.push(justify('CASILLERO / SLOT:', `N° ${slotNumber}`));
    }

    lines.push(justify('FECHA INGRESO:', formatReadableDate(entryTime).split(' ')[0]));
    lines.push(justify('HORA INGRESO:', formatReadableDate(entryTime).split(' ')[1] || ''));

    if (ticketType === 'egreso') {
      lines.push(justify('FECHA SALIDA:', formatReadableDate(exitTime).split(' ')[0] || ''));
      lines.push(justify('HORA SALIDA:', formatReadableDate(exitTime).split(' ')[1] || ''));
      lines.push(justify('DURACION:', calculateDurationString()));
      lines.push(dblHr);

      // Desglose de Dinero con cálculo de IVA (por defecto 19% o configurable)
      const ivaPercentage = 19; // Estándar de Chile/Latam
      const netAmount = Math.round(chargedAmount / (1 + ivaPercentage / 100));
      const ivaAmount = chargedAmount - netAmount;

      lines.push(justify('MONTO NETO:', formatCurrency(netAmount, settings.currency)));
      lines.push(justify(`IVA COBRADO (${ivaPercentage}%):`, formatCurrency(ivaAmount, settings.currency)));
      lines.push(justify('TOTAL COBRADO:', formatCurrency(chargedAmount, settings.currency)));
      lines.push(justify('MEDIO DE PAGO:', paymentMethod.toUpperCase()));
    }

    if (customNotes.trim()) {
      lines.push(hr);
      lines.push('NOTAS:');
      // Ajustar notas a líneas de 32 caracteres
      const noteWords = customNotes.trim().split(' ');
      let currentLine = '';
      noteWords.forEach(word => {
        if ((currentLine + word).length >= width) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }

    lines.push(hr);

    // 4. Código de barras o QR simulado en texto
    if (ticketType === 'ingreso') {
      lines.push(center('||||| | |||| ||| ||| |||'));
      lines.push(center(plate.trim().toUpperCase() || '000000'));
      lines.push(hr);
    }

    // 5. Términos y condiciones
    if (ticketFooter.trim()) {
      const footerWords = ticketFooter.trim().split(/\s+/);
      let currLine = '';
      footerWords.forEach(word => {
        if ((currLine + word).length >= width) {
          lines.push(center(currLine.trim()));
          currLine = word + ' ';
        } else {
          currLine += word + ' ';
        }
      });
      if (currLine.trim()) {
        lines.push(center(currLine.trim()));
      }
    }

    return lines;
  };

  const handleDownloadPDF = async () => {
    try {
      const lines = generateTicketTextLines();
      
      const logoOffset = (companyLogo && showLogoInTicket && ticketType !== 'grabado') ? 14 : 0;
      
      // QR code space (height is around 24mm + some text spacing = ~32mm if plate exists)
      const qrOffset = (plate.trim() && ticketType !== 'grabado') ? 32 : 0;

      // Calcular la altura óptima si autoHeight está activado
      // Cada línea mide aproximadamente 3.5mm en tamaño 7.5
      const calculatedHeight = autoHeight 
        ? Math.max(70, Math.round(lines.length * 3.5 + 16 + logoOffset + qrOffset)) 
        : paperHeight + qrOffset;

      // Crear documento jsPDF con tamaño físico de 58mm x calculado/manual
      const doc = new jsPDF({
        unit: 'mm',
        format: [58, calculatedHeight],
        orientation: 'portrait'
      });

      // Configurar fuente Courier en negrita (todas las letras de rollo térmico por defecto van en negrita)
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5); // Tamaño ideal para impresora térmica de 58mm con ancho de 28 caracteres
      doc.setTextColor(0, 0, 0);

      let y = 6; // Margen superior de 6mm

      // Agregar logo de la empresa si está activado (salvo en grabado de vidrio)
      if (companyLogo && showLogoInTicket && ticketType !== 'grabado') {
        try {
          let format = 'PNG';
          if (companyLogo.startsWith('data:image/jpeg') || companyLogo.startsWith('data:image/jpg')) {
            format = 'JPEG';
          } else if (companyLogo.startsWith('data:image/webp')) {
            format = 'WEBP';
          }
          // Posición: Centrado en el rollo de 58mm (ancho: 18mm, alto: 10mm, x: (58-18)/2 = 20)
          doc.addImage(companyLogo, format, 20, y, 18, 10, undefined, 'FAST');
          y += 13; // Espaciado después del logo
        } catch (imgError) {
          console.warn("Could not draw image in PDF:", imgError);
        }
      }

      const leftMargin = 6.8;
      const rightMargin = 51.2;
      const centerCoord = 29;

      // Dibujar texto línea por línea adaptado dinámicamente
      lines.forEach(line => {
        // Ignorar líneas vacías de espaciado excesivo
        if (!line && line.trim() === '') {
          y += 2.5;
          return;
        }

        // Detectar separadores monótonos para dibujarlos tal cual
        if (line.startsWith('---') || line.startsWith('===')) {
          doc.setFont('courier', 'bold');
          doc.setFontSize(7.5);
          doc.text(line, leftMargin, y);
          y += 3.5;
          return;
        }

        // Detectar si es un par key-value
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex + 1).trim();
          const value = line.slice(colonIndex + 1).trim();

          if (value.length > 0) {
            // Estilo específico según el tipo de campo solicitado por el usuario (Patente, Modelo, Total)
            if (key === 'PATENTE:') {
              // Patente muy destacada y grande en negrita
              doc.setFont('courier', 'bold');
              doc.setFontSize(7.5);
              doc.text(key, leftMargin, y);
              
              doc.setFontSize(13); // Énfasis fuerte solicitado
              doc.text(value, rightMargin, y, { align: 'right' });
              
              doc.setFontSize(7.5); // Reset
              y += 4.5;
            } else if (key === 'MARCA:' || key === 'MODELO:') {
              // Modelo / Marca destacados con énfasis
              doc.setFont('courier', 'bold');
              doc.setFontSize(7.5);
              doc.text(key, leftMargin, y);
              
              doc.setFontSize(10.5); // Énfasis medio solicitado
              doc.text(value, rightMargin, y, { align: 'right' });
              
              doc.setFontSize(7.5); // Reset
              y += 4.2;
            } else if (key === 'TOTAL COBRADO:') {
              // Total cobrado destacado
              doc.setFont('courier', 'bold');
              doc.setFontSize(7.5);
              doc.text(key, leftMargin, y);
              
              doc.setFontSize(11);
              doc.text(value, rightMargin, y, { align: 'right' });
              
              doc.setFontSize(7.5);
              y += 4.5;
            } else {
              // Par clave-valor estándar
              doc.setFont('courier', 'bold');
              doc.setFontSize(7.5);
              doc.text(key, leftMargin, y);
              doc.text(value, rightMargin, y, { align: 'right' });
              y += 3.5;
            }
            return;
          }
        }

        // Línea de texto general (centrar títulos, footer y condiciones de forma elegante)
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        
        if (line.startsWith(' ') || line.includes('***')) {
          // Centrar títulos principales de emisor y tipos de ticket
          const trimmed = line.trim();
          doc.text(trimmed, centerCoord, y, { align: 'center' });
        } else {
          // Textos normales justificados a la izquierda
          doc.text(line, leftMargin, y);
        }
        y += 3.5;
      });

      // Agregar Código QR físico real generado de manera local al final del ticket (omitido en grabado de vidrio)
      if (plate.trim() && ticketType !== 'grabado') {
        try {
          y += 3; // Espacio antes del QR
          const qrDataUrl = await getQrCodeDataUrl(plate);
          if (qrDataUrl) {
            // Dibujar QR perfectamente centrado en los 58mm (ancho: 22mm, alto: 22mm, x: (58-22)/2 = 18)
            doc.addImage(qrDataUrl, 'PNG', 18, y, 22, 22, undefined, 'FAST');
            y += 24;
            
            // Texto descriptivo del QR
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.text('SIGA SU ESTADO EN VIVO', centerCoord, y, { align: 'center' });
            y += 3;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.text('Escanee para ver tiempo y lavado en vivo', centerCoord, y, { align: 'center' });
          }
        } catch (qrError) {
          console.warn("Could not draw QR code in PDF:", qrError);
        }
      }

      // Guardar archivo PDF
      const filename = `ticket_${ticketType}_${plate.trim().toUpperCase() || 'sin_patente'}.pdf`;
      doc.save(filename);

      triggerSuccess(`¡Ticket PDF generado correctamente con código QR! (${filename})`);
    } catch (error) {
      console.error(error);
      alert('Error al generar el PDF. Verifica los datos ingresados.');
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const linesPreview = generateTicketTextLines();

  return (
    <div className="space-y-6">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            Tickets Térmicos 58mm
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generador de comprobantes de ingreso y salida en formato PDF de alta definición optimizados para rollos de impresora térmica estándar (58mm).
          </p>
        </div>

        {/* Interruptor de Tipo de Ticket */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setTicketType('ingreso')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
              ticketType === 'ingreso'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Ticket de Ingreso (Entrada)
          </button>
          <button
            onClick={() => setTicketType('egreso')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
              ticketType === 'egreso'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Ticket de Egreso (Salida)
          </button>
          <button
            onClick={() => setTicketType('boleta')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
              ticketType === 'boleta'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-300" />
            Boleta de Servicio (BAMO GARAGE)
          </button>
          <button
            onClick={() => setTicketType('grabado')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
              ticketType === 'grabado'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            Grabado de Patente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* PARTE IZQUIERDA: CONFIGURADOR Y DATOS (8 de 12 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Alertas Rápidas de Éxito */}
          <AnimatePresence>
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-400"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card 1: Selección de Sesión Activa */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
              1. Auto-completar desde Registros de Caja
            </h3>

            <div className="space-y-3">
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {ticketType === 'ingreso' ? 'Buscar Vehículo Estacionado Actualmente:' : 'Buscar Vehículo que haya Salido Recientemente:'}
              </label>
              
              <div className="relative">
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-blue-500 appearance-none pr-10"
                >
                  <option value="">-- Seleccionar un registro --</option>
                  <option value="manual">[ Completar manualmente / Formulario en Blanco ]</option>
                  
                  {ticketType === 'ingreso' && activeSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      🚗 {s.plate} | {s.vehicleType.toUpperCase()} | Ingreso: {new Date(s.entryTime).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}
                    </option>
                  ))}

                  {ticketType === 'egreso' && completedSessions.slice(-15).reverse().map((s) => (
                    <option key={s.id} value={s.id}>
                      ✅ {s.plate} | {s.vehicleType.toUpperCase()} | Cobrado: {formatCurrency(s.chargedAmount || 0, settings.currency)} ({new Date(s.exitTime!).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {ticketType === 'ingreso' && activeSessions.length === 0 && (
                <p className="text-[10px] text-slate-500 italic mt-1">No hay vehículos estacionados actualmente.</p>
              )}
              {ticketType === 'egreso' && completedSessions.length === 0 && (
                <p className="text-[10px] text-slate-500 italic mt-1">No hay vehículos con salida registrada en el historial.</p>
              )}
            </div>
          </div>

          {/* Card 2: Formulario de Datos del Ticket */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              2. Datos Específicos del Vehículo y Cobro
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Patente */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patente / Placa</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="Ej: AA-BB-11"
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-mono uppercase focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Tipo de Vehículo */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tipo de Vehículo</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="auto">Automóvil / Sedan</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="suv">SUV</option>
                  <option value="moto">Motocicleta</option>
                  <option value="bicicleta">Bicicleta</option>
                  <option value="camioneta">Camioneta</option>
                  <option value="furgon">Furgón</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Marca */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Marca</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ej: Toyota"
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modelo</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ej: Corolla"
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ej: Rojo"
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Año */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Año</label>
                <input
                  type="text"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 2022"
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>

              {/* Hora de Ingreso */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fecha y Hora de Ingreso</label>
                <input
                  type="datetime-local"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Casillero / Slot (Solo para Ingreso) */}
              {ticketType === 'ingreso' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Número de Casillero / Slot (Opcional)</label>
                  <input
                    type="text"
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(e.target.value)}
                    placeholder="Ej: 14"
                    className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              {/* Hora de Salida (Solo para Egreso) */}
              {ticketType === 'egreso' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fecha y Hora de Salida</label>
                  <input
                    type="datetime-local"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}

              {/* Total Cobrado (Solo para Egreso) */}
              {ticketType === 'egreso' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monto Total Cobrado ({settings.currency})</label>
                  <input
                    type="number"
                    value={chargedAmount}
                    onChange={(e) => setChargedAmount(Number(e.target.value))}
                    placeholder="Ej: 3500"
                    className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-mono font-bold focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}

              {/* Medio de Pago (Para Egreso) */}
              {ticketType === 'egreso' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="debito">💳 Tarjeta de Débito</option>
                    <option value="transferencia">📲 Transferencia Bancaria</option>
                  </select>
                </div>
              )}

              {/* Campos específicos para Boleta Comercial / Boleta de Servicio */}
              {ticketType === 'boleta' && (
                <>
                  <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-2">
                      Datos del Cliente y Recibo
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nombre del Cliente</label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Juan Pérez"
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">RUT del Cliente</label>
                        <input
                          type="text"
                          value={clientRut}
                          onChange={(e) => setClientRut(e.target.value)}
                          placeholder="12.345.678-9"
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Teléfono del Cliente</label>
                        <input
                          type="text"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+569 8765 4321"
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nº Control / Ticket</label>
                    <input
                      type="text"
                      value={controlNum}
                      onChange={(e) => setControlNum(e.target.value)}
                      placeholder="8319"
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monto Total ({settings.currency})</label>
                    <input
                      type="number"
                      value={chargedAmount}
                      onChange={(e) => setChargedAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-2">
                      Textos y Tarifas de la Boleta
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Horario de Atención</label>
                        <input
                          type="text"
                          value={scheduleText}
                          onChange={(e) => setScheduleText(e.target.value)}
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tarifa / Descripción</label>
                        <input
                          type="text"
                          value={rateText}
                          onChange={(e) => setRateText(e.target.value)}
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Condiciones de Pago</label>
                        <input
                          type="text"
                          value={paymentText}
                          onChange={(e) => setPaymentText(e.target.value)}
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pie de Boleta</label>
                        <input
                          type="text"
                          value={footerBannerText}
                          onChange={(e) => setFooterBannerText(e.target.value)}
                          className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notas personalizadas en el ticket */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Notas Especiales o Mensajes del Operador</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ej: Lavado de carrocería incluido, Llaves en casilla 4."
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

            </div>
          </div>

          {/* Card 3: Datos de Identidad del Parking y Términos */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                3. Configuración del Comercio Impresor (Global)
              </h3>
              <span className="text-[9px] bg-blue-950 border border-blue-900/60 px-2 py-0.5 rounded text-blue-400 font-bold uppercase">Persistente</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nombre del Comercio / Razón Social</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white uppercase focus:outline-hidden focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">RUT / Identificador de Impuestos</label>
                <input
                  type="text"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dirección Comercial</label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Términos, Garantías y Deslindes (Pie del ticket)</label>
                <textarea
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

            </div>
          </div>

          {/* Card 4: Ajustes de Papel */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-400" />
              4. Propiedades Físicas de la Impresión de 58mm
            </h3>

            <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-bold">Largo dinámico inteligente del papel (Recomendado)</p>
                <p className="text-[10px] text-slate-500">
                  Calcula de manera exacta la longitud en milímetros según el volumen de texto, evitando desperdiciar papel térmico en blanco.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">{autoHeight ? 'Activado' : 'Desactivado'}</span>
                <button
                  type="button"
                  onClick={() => setAutoHeight(!autoHeight)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-hidden ${
                    autoHeight ? 'bg-blue-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    autoHeight ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {!autoHeight && (
              <div className="space-y-2 pt-2 border-t border-slate-850/60">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Especificar Largo de Hoja Manual:</span>
                  <span className="text-blue-400 font-bold">{paperHeight} mm</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="5"
                  value={paperHeight}
                  onChange={(e) => setPaperHeight(Number(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[9px] text-slate-500 italic">Un largo estándar para ingreso suele ser 80mm-100mm, y para cobro final/egreso 100mm-130mm.</p>
              </div>
            )}
          </div>

        </div>

        {/* PARTE DERECHA: VISTA PREVIA SATISFACTORIA (5 de 12 columnas) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
          
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">VISTA PREVIA DE HOJA (58mm)</span>
            <span className="text-[10px] text-slate-500 font-mono">DPI simulado Courier</span>
          </div>

          {/* Ticket Térmico Simulado */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl flex justify-center items-center">
            
            {/* El cuerpo físico del papel térmico */}
            <div className="w-[250px] bg-[#fbfbf9] text-[#141414] shadow-inner-lg p-5 font-mono text-[11px] leading-tight select-none relative rounded-sm border-b-4 border-dashed border-slate-300">
              
              {/* Sombra y textura realista */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/5 via-transparent to-slate-900/5 pointer-events-none" />
              
              {companyLogo && showLogoInTicket && (
                <div className="flex justify-center mb-4 border-b border-dashed border-slate-200 pb-3">
                  <img src={companyLogo} alt="Logo Empresa" className="max-h-12 max-w-[120px] object-contain" referrerPolicy="no-referrer" />
                </div>
              )}

              {/* Líneas de texto simulando impresora Courier */}
              <div className="space-y-0.5 whitespace-pre break-all">
                {linesPreview.map((line, idx) => {
                  const isPatente = line.startsWith('PATENTE:') || line.includes('***');
                  const isModel = line.startsWith('MODELO:');
                  const isTotal = line.includes('TOTAL COBRADO:');

                  return (
                    <div 
                      key={idx} 
                      className={`font-mono tracking-tight font-bold text-black ${
                        isPatente ? 'text-[12px] border-y border-dashed border-slate-300 py-1 font-black my-1' : 
                        isModel ? 'text-[11.5px] font-black' : 'text-[10px]'
                      } ${
                        isTotal ? 'text-[12.5px] font-black border-y border-double border-slate-400 py-1' : ''
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>

              {/* Live QR Code on printed ticket preview */}
              {plate.trim() && (
                <div className="mt-4 border-t border-dashed border-slate-300 pt-4 text-center space-y-1 flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                      window.location.origin + window.location.pathname + '?plate=' + plate.trim().toUpperCase()
                    )}`}
                    alt="QR Cliente"
                    className="w-24 h-24 border border-slate-200 p-1 bg-white select-none"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[7.5px] font-sans font-bold uppercase text-slate-800 tracking-wider">
                    Siga su estado en vivo
                  </span>
                  <span className="text-[6.5px] font-sans text-slate-500 max-w-[180px] leading-tight">
                    Escanee para ver su ticket, tiempo y estado de lavado en vivo.
                  </span>
                </div>
              )}

              {/* Decoración física: indicador de margen */}
              <div className="mt-6 text-center text-[8px] text-slate-400 uppercase tracking-widest font-sans font-black select-none">
                ✂ Corte de Impresora Térmica ✂
              </div>
            </div>

          </div>

          {/* Acciones del Ticket */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadPDF}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/40 text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-150 active:scale-98"
            >
              <Download className="w-4 h-4" />
              Descargar Ticket PDF (58mm)
            </button>
            
            <button
              onClick={() => {
                const text = linesPreview.join('\n');
                navigator.clipboard.writeText(text);
                triggerSuccess('¡Texto del ticket copiado al portapapeles!');
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs flex items-center justify-center gap-2 transition-all duration-150 active:scale-98"
            >
              <FileText className="w-4 h-4" />
              Copiar como Texto Plano
            </button>

            <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl text-[10px] text-slate-500 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Tip para Impresión Térmica:</strong> Al imprimir el archivo PDF descargado, selecciona el tamaño de papel <strong>58mm x Roll</strong> (o el largo especificado) y pon los márgenes de impresión en <strong>"Ninguno"</strong> en los ajustes de tu sistema para un calce perfecto.
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
