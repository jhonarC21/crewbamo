import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ParkingSession, TariffSettings } from '../types';
import { formatPlate, getVehicleTypeLabel, formatCurrency } from './parkingUtils';

/**
 * Genera un PDF de 58mm en memoria para el ticket de ingreso/estacionamiento activo
 */
export async function generate58mmTicketDoc(
  session: ParkingSession,
  settings: TariffSettings,
  companyLogo?: string,
  showLogoInTicket?: boolean
): Promise<jsPDF> {
  // Configuración de papel térmico continuo de 58mm de ancho
  const doc = new jsPDF({
    unit: 'mm',
    format: [58, 145]
  });

  const businessName = settings.businessName || 'ESTACIONAMIENTO';
  const businessId = settings.businessId || '';
  const businessAddress = settings.businessAddress || '';
  const businessPhone = settings.businessPhone || '';
  const ticketFooter = settings.ticketFooter || 'GRACIAS POR SU PREFERENCIA. CONSERVE SU TICKET DE INGRESO.';

  let y = 6;

  // Logo si está activo
  if (showLogoInTicket && companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 19, y, 20, 12);
      y += 14;
    } catch (e) {
      // Si la imagen falla o no es PNG puro, ignorar suavemente
    }
  }

  // Encabezado de la Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(businessName, 29, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (businessId) {
    doc.text(`RUT: ${businessId}`, 29, y, { align: 'center' });
    y += 3.5;
  }
  if (businessAddress) {
    doc.text(businessAddress, 29, y, { align: 'center' });
    y += 3.5;
  }
  if (businessPhone) {
    doc.text(`TEL: ${businessPhone}`, 29, y, { align: 'center' });
    y += 3.5;
  }

  // Línea divisoria
  doc.text('------------------------------------------', 29, y, { align: 'center' });
  y += 4;

  // Título del Ticket
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TICKET DE INGRESO', 29, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Nº CONTROL: ${session.id.substring(0, 8).toUpperCase()}`, 29, y, { align: 'center' });
  y += 4.5;

  // Recuadro Destacado con la Patente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.rect(7, y, 44, 9.5);
  doc.text(formatPlate(session.plate), 29, y + 6.8, { align: 'center' });
  y += 13.5;

  // Detalles del Vehículo e Ingreso
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.setFont('helvetica', 'bold');
  doc.text('TIPO:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(getVehicleTypeLabel(session.vehicleType), 18, y);
  y += 4;

  const vehDetails = [session.brand, session.model, session.color, session.year ? `(${session.year})` : ''].filter(Boolean).join(' ');
  if (vehDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text('VEHÍCULO:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(vehDetails.substring(0, 25), 21, y);
    y += 4;
  }

  if (session.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(session.clientName.substring(0, 25), 19, y);
    y += 4;
  }

  if (session.clientPhone) {
    doc.setFont('helvetica', 'bold');
    doc.text('TELÉFONO:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(session.clientPhone, 21, y);
    y += 4;
  }

  const entryDate = new Date(session.entryTime);
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(entryDate.toLocaleDateString('es-CL'), 17, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('HORA:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(entryDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), 17, y);
  y += 4;

  if (session.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('OBS:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(session.notes.substring(0, 27), 13, y);
    y += 4;
  }

  // Línea divisoria
  doc.text('------------------------------------------', 29, y, { align: 'center' });
  y += 4;

  // Tarifas de referencia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('TARIFAS DE REFERENCIA:', 29, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  if (settings.blocks && settings.blocks.length > 0) {
    settings.blocks.forEach(b => {
      const lineText = `${b.name}: ${formatCurrency(b.cost, settings.currency)}`;
      const truncated = lineText.length > 36 ? lineText.substring(0, 36) + '...' : lineText;
      doc.text(truncated, 29, y, { align: 'center' });
      y += 3;
    });
  } else {
    doc.text(`Hora Base: ${formatCurrency(settings.baseHourlyRate, settings.currency)}`, 29, y, { align: 'center' });
    y += 3;
  }

  // Código QR si está activo
  if (settings.showQrInTicket !== false) {
    try {
      const qrDataUrl = await QRCode.toDataURL(
        `${window.location.origin}${window.location.pathname}?plate=${session.plate}`,
        { margin: 1, width: 80 }
      );
      y += 1;
      doc.addImage(qrDataUrl, 'PNG', 19, y, 20, 20);
      y += 21;
      doc.setFontSize(6.5);
      doc.text('Escanee con la cámara para ver estado', 29, y, { align: 'center' });
      y += 3.5;
    } catch (e) {
      // Ignorar si no se pudo generar QR
    }
  }

  // Pie del Ticket
  doc.text('------------------------------------------', 29, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  
  const footerLines = doc.splitTextToSize(ticketFooter, 48);
  doc.text(footerLines, 29, y, { align: 'center' });

  return doc;
}

/**
 * Abre la ventana de impresión nativa/PDF del ticket de 58mm
 */
export async function print58mmTicket(
  session: ParkingSession,
  settings: TariffSettings,
  companyLogo?: string,
  showLogoInTicket?: boolean
) {
  const doc = await generate58mmTicketDoc(session, settings, companyLogo, showLogoInTicket);
  const blob = doc.output('bloburl');
  window.open(blob.toString(), '_blank');
}
