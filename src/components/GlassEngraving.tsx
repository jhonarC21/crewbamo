import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Printer, 
  Download, 
  Settings, 
  Maximize2, 
  RotateCw, 
  Layout, 
  Check, 
  Scissors, 
  Eye, 
  FileText,
  Smartphone,
  ChevronRight,
  Info,
  Type
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatPlate } from '../utils/parkingUtils';

interface GlassEngravingProps {
  settings: {
    currency: string;
  };
}

// Reusable monochrome vehicle brand logo drawer using robust canvas paths
const drawBrandLogo = (ctx: CanvasRenderingContext2D, brand: string, x: number, y: number, size: number) => {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  switch (brand.toUpperCase()) {
    case 'KIA':
      // Elipse exterior
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.65, size * 0.32, 0, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Letras KIA estilo nuevo conectadas de forma geométrica
      ctx.beginPath();
      ctx.moveTo(x - size * 0.42, y + size * 0.16);
      ctx.lineTo(x - size * 0.32, y - size * 0.16);
      ctx.moveTo(x - size * 0.42, y + size * 0.16);
      ctx.lineTo(x - size * 0.12, y - size * 0.16);
      ctx.lineTo(x - size * 0.12, y + size * 0.16);
      ctx.moveTo(x + size * 0.12, y + size * 0.16);
      ctx.lineTo(x + size * 0.27, y - size * 0.16);
      ctx.lineTo(x + size * 0.42, y + size * 0.16);
      ctx.lineWidth = size * 0.08;
      ctx.stroke();
      break;
    
    case 'TOYOTA':
      // Óvalo exterior
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.6, size * 0.38, 0, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Elipse vertical (tallo del T)
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.05, size * 0.18, size * 0.33, 0, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Elipse horizontal (barra del T)
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.16, size * 0.42, size * 0.14, 0, 0, 2 * Math.PI);
      ctx.stroke();
      break;
      
    case 'HYUNDAI':
      // Óvalo inclinado
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.6, size * 0.38, 0.16, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.beginPath();
      // Izquierda inclinado
      ctx.moveTo(x - size * 0.22, y - size * 0.18);
      ctx.lineTo(x - size * 0.12, y + size * 0.18);
      // Derecha inclinado
      ctx.moveTo(x + size * 0.12, y - size * 0.18);
      ctx.lineTo(x + size * 0.22, y + size * 0.18);
      // Barra central cruzada
      ctx.moveTo(x - size * 0.17, y);
      ctx.lineTo(x + size * 0.17, y);
      ctx.lineWidth = size * 0.08;
      ctx.stroke();
      break;
      
    case 'CHEVROLET':
      // Corbatín icónico de Chevrolet
      ctx.beginPath();
      ctx.moveTo(x - size * 0.55, y - size * 0.09);
      ctx.lineTo(x - size * 0.22, y - size * 0.09);
      ctx.lineTo(x - size * 0.22, y - size * 0.32);
      ctx.lineTo(x + size * 0.22, y - size * 0.32);
      ctx.lineTo(x + size * 0.22, y - size * 0.09);
      ctx.lineTo(x + size * 0.55, y - size * 0.09);
      ctx.lineTo(x + size * 0.55, y + size * 0.09);
      ctx.lineTo(x + size * 0.22, y + size * 0.09);
      ctx.lineTo(x + size * 0.22, y + size * 0.32);
      ctx.lineTo(x - size * 0.22, y + size * 0.32);
      ctx.lineTo(x - size * 0.22, y + size * 0.09);
      ctx.lineTo(x - size * 0.55, y + size * 0.09);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
      break;
      
    case 'FORD':
      // Elipse doble clásica
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.65, size * 0.35, 0, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.58, size * 0.28, 0, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.02;
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = `italic bold ${Math.round(size * 0.32)}px "Georgia", "Times New Roman", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("Ford", x - size * 0.02, y);
      break;
      
    case 'SUZUKI':
      // S estilizada con ángulos rectos y cortes de Suzuki
      ctx.beginPath();
      ctx.moveTo(x - size * 0.25, y - size * 0.3);
      ctx.lineTo(x + size * 0.18, y - size * 0.3);
      ctx.lineTo(x - size * 0.18, y + size * 0.05);
      ctx.lineTo(x + size * 0.25, y + size * 0.05);
      ctx.lineTo(x + size * 0.25, y + size * 0.3);
      ctx.lineTo(x - size * 0.18, y + size * 0.3);
      ctx.lineTo(x + size * 0.18, y - size * 0.05);
      ctx.lineTo(x - size * 0.25, y - size * 0.05);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
      break;
      
    case 'NISSAN':
      // Aro con barra horizontal
      ctx.beginPath();
      ctx.arc(x, y, size * 0.32, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.06;
      ctx.stroke();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - size * 0.5, y - size * 0.13, size * 1.0, size * 0.26);
      ctx.lineWidth = size * 0.04;
      ctx.strokeRect(x - size * 0.5, y - size * 0.13, size * 1.0, size * 0.26);
      
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(size * 0.13)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("NISSAN", x, y);
      break;
      
    case 'VOLKSWAGEN':
      // Aro VW con V y W separadas
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.05;
      ctx.stroke();
      
      ctx.lineWidth = size * 0.04;
      // V superior
      ctx.beginPath();
      ctx.moveTo(x - size * 0.2, y - size * 0.22);
      ctx.lineTo(x, y - size * 0.02);
      ctx.lineTo(x + size * 0.2, y - size * 0.22);
      ctx.stroke();
      // W inferior
      ctx.beginPath();
      ctx.moveTo(x - size * 0.24, y + size * 0.02);
      ctx.lineTo(x - size * 0.12, y + size * 0.24);
      ctx.lineTo(x, y + size * 0.02);
      ctx.lineTo(x + size * 0.12, y + size * 0.24);
      ctx.lineTo(x + size * 0.24, y + size * 0.02);
      ctx.stroke();
      break;
      
    case 'HONDA':
      // Caja exterior trapezoide honda
      ctx.beginPath();
      ctx.moveTo(x - size * 0.35, y - size * 0.3);
      ctx.lineTo(x + size * 0.35, y - size * 0.3);
      ctx.quadraticCurveTo(x + size * 0.4, y - size * 0.3, x + size * 0.38, y + size * 0.2);
      ctx.quadraticCurveTo(x + size * 0.35, y + size * 0.32, x + size * 0.25, y + size * 0.32);
      ctx.lineTo(x - size * 0.25, y + size * 0.32);
      ctx.quadraticCurveTo(x - size * 0.35, y + size * 0.32, x - size * 0.38, y + size * 0.2);
      ctx.quadraticCurveTo(x - size * 0.4, y - size * 0.3, x - size * 0.35, y - size * 0.3);
      ctx.closePath();
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      
      // Letra H estilizada ensanchada arriba
      ctx.beginPath();
      ctx.moveTo(x - size * 0.22, y - size * 0.2);
      ctx.lineTo(x - size * 0.15, y + size * 0.22);
      ctx.moveTo(x + size * 0.22, y - size * 0.2);
      ctx.lineTo(x + size * 0.15, y + size * 0.22);
      ctx.moveTo(x - size * 0.18, y);
      ctx.lineTo(x + size * 0.18, y);
      ctx.lineWidth = size * 0.06;
      ctx.stroke();
      break;

    case 'BMW':
      // Doble aro
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.05;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(x, y, size * 0.22, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.03;
      ctx.stroke();
      
      // Relleno de cuadrantes BMW
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, size * 0.22, Math.PI, 1.5 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, size * 0.22, 0, 0.5 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(size * 0.09)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("B", x - size * 0.12, y - size * 0.27);
      ctx.fillText("M", x, y - size * 0.28);
      ctx.fillText("W", x + size * 0.12, y - size * 0.27);
      break;
      
    case 'AUDI': {
      const ringRadius = size * 0.18;
      const ringSpacing = size * 0.22;
      const startX = x - (ringSpacing * 1.5);
      ctx.lineWidth = size * 0.04;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * ringSpacing, y, ringRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;
    }
    
    case 'MAZDA': {
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.55, size * 0.35, 0, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x - size * 0.38, y - size * 0.12);
      ctx.quadraticCurveTo(x, y + size * 0.12, x + size * 0.38, y - size * 0.12);
      ctx.quadraticCurveTo(x, y - size * 0.3, x - size * 0.38, y - size * 0.12);
      ctx.lineWidth = size * 0.05;
      ctx.stroke();
      break;
    }
    
    case 'MERCEDES BENZ':
    case 'MERCEDES': {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      
      const r = size * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - r);
      ctx.moveTo(x, y);
      ctx.lineTo(x + r * Math.cos(Math.PI / 6), y + r * Math.sin(Math.PI / 6));
      ctx.moveTo(x, y);
      ctx.lineTo(x - r * Math.cos(Math.PI / 6), y + r * Math.sin(Math.PI / 6));
      ctx.lineWidth = size * 0.06;
      ctx.stroke();
      break;
    }
    
    case 'MITSUBISHI': {
      const r = size * 0.18;
      ctx.fillStyle = '#000000';
      
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.58, y - r * 2);
      ctx.lineTo(x, y - r * 3);
      ctx.lineTo(x - r * 0.58, y - r * 2);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.866, y + r * 0.5);
      ctx.lineTo(x + r * 1.732, y);
      ctx.lineTo(x + r * 0.866, y - r * 1.5);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x - r * 0.866, y + r * 0.5);
      ctx.lineTo(x - r * 1.732, y);
      ctx.lineTo(x - r * 0.866, y - r * 1.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    
    case 'RENAULT': {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.38);
      ctx.lineTo(x + size * 0.25, y);
      ctx.lineTo(x, y + size * 0.38);
      ctx.lineTo(x - size * 0.25, y);
      ctx.closePath();
      ctx.lineWidth = size * 0.06;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.22);
      ctx.lineTo(x + size * 0.14, y);
      ctx.lineTo(x, y + size * 0.22);
      ctx.lineTo(x - size * 0.14, y);
      ctx.closePath();
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      break;
    }
    
    case 'VOLVO': {
      ctx.beginPath();
      ctx.arc(x - size * 0.05, y + size * 0.05, size * 0.28, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + size * 0.15, y - size * 0.15);
      ctx.lineTo(x + size * 0.35, y - size * 0.35);
      ctx.lineTo(x + size * 0.2, y - size * 0.35);
      ctx.moveTo(x + size * 0.35, y - size * 0.35);
      ctx.lineTo(x + size * 0.35, y - size * 0.2);
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - size * 0.38, y - size * 0.08 + size * 0.05, size * 0.66, size * 0.16);
      ctx.strokeRect(x - size * 0.38, y - size * 0.08 + size * 0.05, size * 0.66, size * 0.16);
      
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(size * 0.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("VOLVO", x - size * 0.05, y + size * 0.05);
      break;
    }
    
    case 'JEEP': {
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(size * 0.28)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("Jeep", x, y);
      break;
    }
      
    default:
      // Inicial en círculo en caso de error
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, 2 * Math.PI);
      ctx.lineWidth = size * 0.04;
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(size * 0.3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(brand.charAt(0).toUpperCase(), x, y);
      break;
  }
  ctx.restore();
};

// Reusable single stencil renderer ensuring perfect parity between interactive preview and PDF
const drawSingleStencilInternal = (
  ctx: CanvasRenderingContext2D,
  w: number, // ancho de la celda en px
  h: number, // alto de la celda en px
  scale: number,
  isVerticalMode: boolean,
  mirror: boolean,
  text: string,
  logoActive: boolean,
  logoBrand: string,
  baseHeightMm: number,
  spacing: number,
  fontHeight: number,
  fontCorrectionFactor: number = 1.72,
  customLogoImg: HTMLImageElement | null = null,
  logoSizeFactor: number = 1.0,
  fontFamily: string = 'Courier New',
  fontStyle: string = 'bold'
) => {
  const cleanText = text.toUpperCase().trim();

  if (isVerticalMode) {
    // Modo Vertical Rotado: el bloque mide w (ancho col) x h (largo tira)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2); // Rotación 90 grados contra manecillas

    if (mirror) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const nominalFontHeight = fontHeight * fontCorrectionFactor;
    const calculatedFontSize = nominalFontHeight * 3.793 * scale;
    ctx.font = `${fontStyle} ${calculatedFontSize}px "${fontFamily}", "Courier New", monospace`;

    const chars = cleanText.split('');
    const charSpacing = spacing * scale * 1.5;
    const charWidths = chars.map(char => ctx.measureText(char).width);
    const totalTextWidth = charWidths.reduce((sum, widthVal) => sum + widthVal, 0) + (chars.length - 1) * charSpacing;

    const totalLengthPx = h;
    const logoSize = Math.min(w * 0.65, 18 * scale * logoSizeFactor);

    if (logoActive) {
      // Dibujar logo arriba en el eje X rotado (cerca del extremo superior de la tira)
      const logoX = totalLengthPx / 2 - logoSize - 5 * scale;
      if (logoBrand === 'CUSTOM' && customLogoImg) {
        ctx.save();
        ctx.drawImage(
          customLogoImg,
          logoX - logoSize / 2,
          -logoSize / 2,
          logoSize,
          logoSize
        );
        ctx.restore();
      } else {
        drawBrandLogo(ctx, logoBrand, logoX, 0, logoSize);
      }

      // Desplazar el texto al centro de la mitad inferior restante
      const textCenter = -logoSize;
      let currentX = textCenter - totalTextWidth / 2;
      chars.forEach((char, idx) => {
        ctx.fillText(char, currentX + charWidths[idx] / 2, 0);
        currentX += charWidths[idx] + charSpacing;
      });
    } else {
      // Texto centrado en toda la tira
      let currentX = -totalTextWidth / 2;
      chars.forEach((char, idx) => {
        ctx.fillText(char, currentX + charWidths[idx] / 2, 0);
        currentX += charWidths[idx] + charSpacing;
      });
    }

    ctx.restore();
  } else {
    // Modo Horizontal Tradicional: el bloque mide w (ancho del rollo 58mm) x h (alto del stencil)
    ctx.save();
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const nominalFontHeight = fontHeight * fontCorrectionFactor;
    const calculatedFontSize = nominalFontHeight * 3.8 * scale;
    ctx.font = `${fontStyle} ${calculatedFontSize}px "${fontFamily}", "Courier New", monospace`;

    const chars = cleanText.split('');
    const charSpacing = spacing * scale * 1.5;
    const charWidths = chars.map(char => ctx.measureText(char).width);
    const totalTextWidth = charWidths.reduce((sum, widthVal) => sum + widthVal, 0) + (chars.length - 1) * charSpacing;

    let currentX = (w - totalTextWidth) / 2;
    let centerY = h / 2;

    if (logoActive) {
      // Dibujar logo arriba centrado y texto en el centro de la mitad inferior
      const logoSize = Math.min(h * 0.35, 15 * scale * logoSizeFactor);
      const logoY = 8 * scale + logoSize / 2;
      if (logoBrand === 'CUSTOM' && customLogoImg) {
        ctx.save();
        ctx.drawImage(
          customLogoImg,
          w / 2 - logoSize / 2,
          logoY - logoSize / 2,
          logoSize,
          logoSize
        );
        ctx.restore();
      } else {
        drawBrandLogo(ctx, logoBrand, w / 2, logoY, logoSize);
      }

      centerY = h - (baseHeightMm * 3.8 * scale) / 2;
    }

    chars.forEach((char, idx) => {
      ctx.fillText(char, currentX + charWidths[idx] / 2, centerY);
      currentX += charWidths[idx] + charSpacing;
    });

    ctx.restore();
  }
};

const patentFormats: Record<string, {
  placeholder: string;
  defaultFormat: string;
  formats: Record<string, {
    name: string;
    inputLength: number;
    pattern: (text: string) => string;
  }>;
}> = {
  'Chile': {
    placeholder: 'LLLL-NN',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLLL-NN (Actual)', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 4)}-${text.substring(4, 6)}` : text },
      '2': { name: 'LL·NN-NN (Antiguo)', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 2)}·${text.substring(2, 4)}-${text.substring(4, 6)}` : text },
      '3': { name: 'LLNNNN (Sin Separador)', inputLength: 6, pattern: (text) => text }
    }
  },
  'Argentina': {
    placeholder: 'AA 123 BB',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LL NNN LL (Mercosur)', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 2)} ${text.substring(2, 5)} ${text.substring(5, 7)}` : text },
      '2': { name: 'LLNNNLL (Sin Espacios)', inputLength: 7, pattern: (text) => text },
      '3': { name: 'NNNLLLL (Antiguo)', inputLength: 7, pattern: (text) => text }
    }
  },
  'Bolivia': {
    placeholder: 'NNNN LLL',
    defaultFormat: '1',
    formats: {
      '1': { name: 'NNNN LLL', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 4)} ${text.substring(4, 7)}` : text },
      '2': { name: 'NNNNLLL (Sin Espacio)', inputLength: 7, pattern: (text) => text }
    }
  },
  'Brasil': {
    placeholder: 'ABC1D23',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLLNLNN (Mercosur)', inputLength: 7, pattern: (text) => text },
      '2': { name: 'ABC-1234 (Antiguo)', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 3)}-${text.substring(3, 7)}` : text }
    }
  },
  'Colombia': {
    placeholder: 'AAA-123',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLL-NNN', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 3)}-${text.substring(3, 6)}` : text },
      '2': { name: 'LLL NNN (Espacio)', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 3)} ${text.substring(3, 6)}` : text }
    }
  },
  'Perú': {
    placeholder: 'LLL NNN',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLL NNN (Veh. Grandes)', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 3)} ${text.substring(3, 6)}` : text },
      '2': { name: 'LL NNNN (Veh. Menores)', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 2)} ${text.substring(2, 6)}` : text },
      '3': { name: 'LLLNNN (Sin Espacio)', inputLength: 6, pattern: (text) => text }
    }
  },
  'España': {
    placeholder: 'NNNN LLL',
    defaultFormat: '1',
    formats: {
      '1': { name: 'NNNN LLL', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 4)} ${text.substring(4, 7)}` : text },
      '2': { name: 'NNNNLLL (Sin Espacio)', inputLength: 7, pattern: (text) => text }
    }
  },
  'Uruguay': {
    placeholder: 'ABC 1234',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLL NNNN (Mercosur)', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 3)} ${text.substring(3, 7)}` : text },
      '2': { name: 'LLLNNNN (Sin Espacio)', inputLength: 7, pattern: (text) => text }
    }
  },
  'México': {
    placeholder: 'LLL-NN-NN',
    defaultFormat: '1',
    formats: {
      '1': { name: 'LLL-NN-NN', inputLength: 7, pattern: (text) => text.length >= 7 ? `${text.substring(0, 3)}-${text.substring(3, 5)}-${text.substring(5, 7)}` : text },
      '2': { name: 'NN LL NN', inputLength: 6, pattern: (text) => text.length >= 6 ? `${text.substring(0, 2)} ${text.substring(2, 4)} ${text.substring(4, 6)}` : text }
    }
  },
  'Genérico': {
    placeholder: 'NNNNNN',
    defaultFormat: '1',
    formats: {
      '1': { name: '6 Dígitos', inputLength: 6, pattern: (text) => text },
      '2': { name: '7 Dígitos', inputLength: 7, pattern: (text) => text },
      '3': { name: '8 Dígitos', inputLength: 8, pattern: (text) => text }
    }
  }
};

// Helper components for BAMO GARAGE simulated barcode and logo in the HTML preview
const BarcodeSimulation = ({ code }: { code: string }) => {
  const hash = code + "5820";
  const bars: { isBlack: boolean; width: number }[] = [];
  for (let i = 0; i < hash.length; i++) {
    const charCode = hash.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 2) + 1, ((charCode >> 2) % 3) + 1];
    pattern.forEach((w, idx) => {
      bars.push({
        isBlack: idx % 2 === 0,
        width: w * 0.9,
      });
    });
    bars.push({ isBlack: false, width: 0.8 });
  }
  return (
    <div className="flex justify-center items-stretch h-5 overflow-hidden select-none" style={{ gap: '0px' }}>
      {bars.map((bar, i) => (
        <div 
          key={i} 
          style={{ 
            backgroundColor: bar.isBlack ? 'black' : 'transparent', 
            width: `${bar.width}px` 
          }} 
        />
      ))}
    </div>
  );
};

const GarageLogoSimulation = () => {
  return (
    <div className="relative w-10 h-10 bg-zinc-900 border border-amber-500 rounded flex flex-col items-center justify-center shrink-0 shadow-sm select-none">
      <span className="text-[4px] text-white font-extrabold tracking-widest leading-none mb-0.5">BAMO</span>
      {/* Small stylized SVG car */}
      <svg className="w-5 h-3.5 text-amber-500" viewBox="0 0 24 16" fill="currentColor">
        <path d="M19 6.5l-1.5-2h-11l-1.5 2h14zm2 1h-18v5h3c0-1.1.9-2 2-2s2 .9 2 2h4c0-1.1.9-2 2-2s2 .9 2 2h3v-5zm-14 5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
      <span className="text-[3.5px] text-amber-500 font-bold tracking-tight leading-none mt-0.5">GARAGE</span>
    </div>
  );
};

export default function GlassEngraving({ settings }: GlassEngravingProps) {
  // Configuración de la patente y el grabado
  const [plate, setPlate] = useState('FBTT88'); // Default to match user's upload
  const [fontHeightMm, setFontHeightMm] = useState(12); // Altura de la tipografía seleccionada en milímetros (4mm a 24mm)
  const [letterSpacing, setLetterSpacing] = useState(6);
  const [isMirrored, setIsMirrored] = useState(true);
  const [printCount, setPrintCount] = useState(6); // Por defecto 6 impresiones (para 4 vidrios + parabrisas + luneta trasera)
  const [showCutLines, setShowCutLines] = useState<boolean>(false);
  
  // Nuevos estados para soportar el formato vertical rotado del ticket de referencia
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical');
  const [columns, setColumns] = useState<number>(2);
  const [plateLengthMm, setPlateLengthMm] = useState<number>(100); // Largo total del stencil vertical (50mm a 160mm)

  // Nuevos estados para el logotipo de la marca del vehículo
  const [showBrandLogo, setShowBrandLogo] = useState<boolean>(true);
  const [brandLogo, setBrandLogo] = useState<string>('KIA');

  // Nuevos estados inspirados por el diseño mipatente.cl
  const [logoSizeFactor, setLogoSizeFactor] = useState<number>(1.0);
  const [fontFamily, setFontFamily] = useState<string>('Courier New');
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold'>('bold');
  const [customLogoImg, setCustomLogoImg] = useState<HTMLImageElement | null>(null);
  
  // Selección de país y formato de patente
  const [selectedCountry, setSelectedCountry] = useState<string>('Chile');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('1');
  const [isFormatEnabled, setIsFormatEnabled] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Factor de corrección empírico: Las letras de molde (como Courier) se renderizan a aprox 58% de su tamaño nominal (em-square).
  // Para obtener una altura real física de X milímetros impresos, escalamos la fuente nominal en 1.72 veces.
  const fontCorrectionFactor = 1.72;
  
  // Altura total del recuadro de patente en mm: dinámico para que letras grandes quepan perfecto con holgura.
  const basePlateHeightMm = Math.max(15, Math.ceil(fontHeightMm * fontCorrectionFactor + 4));
  const plateHeightMm = showBrandLogo && layoutMode === 'horizontal' ? basePlateHeightMm + 15 : basePlateHeightMm;

  // Redibujar la patente en el canvas de vista previa interactiva
  useEffect(() => {
    drawPlateOnCanvas();
  }, [plate, fontHeightMm, letterSpacing, isMirrored, plateHeightMm, layoutMode, columns, plateLengthMm, showBrandLogo, brandLogo, logoSizeFactor, fontFamily, fontStyle, customLogoImg, selectedCountry, selectedFormatId, isFormatEnabled]);

  const drawPlateOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let displayPlate = plate;
    if (isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId]) {
      const formatObj = patentFormats[selectedCountry].formats[selectedFormatId];
      displayPlate = formatObj.pattern(plate);
    }

    if (layoutMode === 'vertical') {
      // Dimensiones en píxeles para simular el rollo térmico de 58mm x plateLengthMm en pantalla con alta resolución
      const scale = 4;
      const width = 220 * scale; // ~58mm equivalen a 220px aprox (un factor de 3.793 px/mm)
      const height = Math.round(plateLengthMm * 3.793) * scale;
      
      canvas.width = width;
      canvas.height = height;

      // Fondo blanco limpio para corte térmico
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Dibujar columnas y patentes verticales
      for (let col = 0; col < columns; col++) {
        const colWidthPx = width / columns;

        ctx.save();
        ctx.translate(col * colWidthPx, 0);

        // Renderizado centralizado por columna usando el helper unificado
        drawSingleStencilInternal(
          ctx,
          colWidthPx,
          height,
          scale,
          true,
          isMirrored,
          displayPlate,
          showBrandLogo,
          brandLogo,
          basePlateHeightMm,
          letterSpacing,
          fontHeightMm,
          fontCorrectionFactor,
          customLogoImg,
          logoSizeFactor,
          fontFamily,
          fontStyle
        );

        ctx.restore();

        // Dibujar línea punteada divisoria entre columnas (solo si showCutLines es activo)
        if (showCutLines && col < columns - 1) {
          ctx.save();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1 * scale;
          ctx.setLineDash([5 * scale, 5 * scale]);
          ctx.beginPath();
          ctx.moveTo((col + 1) * colWidthPx, 0);
          ctx.lineTo((col + 1) * colWidthPx, height);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      // Dimensiones en píxeles para simular 58mm x plateHeightMm en pantalla con alta resolución (multiplicador de escala)
      const scale = 4;
      const width = 220 * scale; // ~58mm equivalen a 220px aprox
      const height = Math.round(plateHeightMm * 3.8) * scale;  // ~plateHeightMm en px
      
      canvas.width = width;
      canvas.height = height;

      // Renderizado centralizado usando el helper unificado
      drawSingleStencilInternal(
        ctx,
        width,
        height,
        scale,
        false,
        isMirrored,
        displayPlate,
        showBrandLogo,
        brandLogo,
        basePlateHeightMm,
        letterSpacing,
        fontHeightMm,
        fontCorrectionFactor,
        customLogoImg,
        logoSizeFactor,
        fontFamily,
        fontStyle
      );
    }
  };

  // Exportar el ticket completo optimizado para impresora térmica de 58mm en PDF
  const handleExportPDF = () => {
    try {
      let displayPlate = plate;
      if (isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId]) {
        const formatObj = patentFormats[selectedCountry].formats[selectedFormatId];
        displayPlate = formatObj.pattern(plate);
      }

      if (layoutMode === 'vertical') {
        // En modo vertical (referencia del PDF del usuario):
        // Cada columna mide colWidth = 58 / columns en mm.
        // Cada celda tiene una altura física de plateLengthMm en mm.
        // La patente se dibuja verticalmente (rotada 90º y en espejo).
        
        // 1. Crear un canvas de alta definición para una sola patente vertical
        const exportCanvas = document.createElement('canvas');
        const scale = 6; // Mayor resolución para impresión impecable
        
        // El tamaño de la celda de la patente individual:
        // - Ancho físico en PDF: plateHeightMm
        // - Alto físico en PDF: plateLengthMm
        const pxWidth = Math.round(plateHeightMm * 3.7795 * scale); // Convertir mm a píxeles
        const pxHeight = Math.round(plateLengthMm * 3.7795 * scale);

        exportCanvas.width = pxWidth;
        exportCanvas.height = pxHeight;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Renderizado del bloque usando el helper unificado
        drawSingleStencilInternal(
          ctx,
          pxWidth,
          pxHeight,
          scale,
          true,
          isMirrored,
          displayPlate,
          showBrandLogo,
          brandLogo,
          basePlateHeightMm,
          letterSpacing,
          fontHeightMm,
          fontCorrectionFactor,
          customLogoImg,
          logoSizeFactor,
          fontFamily,
          fontStyle
        );

        const plateImgData = exportCanvas.toDataURL('image/png');

        // 2. Calcular la altura dinámica del PDF
        const rows = Math.ceil(printCount / columns);
        const spacingBetween = showCutLines ? 8 : 4;
        const totalPdfHeight = (rows * plateLengthMm) + ((rows - 1) * spacingBetween) + 4;

        // 3. Crear el documento jsPDF con ancho 58mm y altura calculada
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [58, totalPdfHeight]
        });

        let stencilStartY = 2;

        // 4. Dibujar la cuadrícula de patentes
        for (let i = 0; i < printCount; i++) {
          const row = Math.floor(i / columns);
          const col = i % columns;
          
          const colWidth = 58 / columns;
          const colX = col * colWidth;
          const rowY = stencilStartY + row * (plateLengthMm + spacingBetween);

          // Centrar la tira de ancho plateHeightMm dentro del ancho de la columna
          const x = (colX + colWidth / 2) - (plateHeightMm / 2);
          const y = rowY;

          // Dibujar la imagen de la patente vertical
          doc.addImage(plateImgData, 'PNG', x, y, plateHeightMm, plateLengthMm);

          // Dibujar líneas de corte divisoras si corresponde
          if (showCutLines) {
            // Línea de corte horizontal entre filas
            if (col === 0 && row < rows - 1) {
              const lineY = rowY + plateLengthMm + (spacingBetween / 2);
              doc.saveGraphicsState();
              doc.setLineDashPattern([1, 1], 0);
              doc.setDrawColor(150, 150, 150);
              doc.setLineWidth(0.1);
              doc.line(2, lineY, 56, lineY);
              
              // Pequeño texto guía
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(5);
              doc.setTextColor(120, 120, 120);
              doc.text('- - - - ✂ - - - - Corte Horizontal - - - - ✂ - - - -', 29, lineY - 0.5, { align: 'center' });
              doc.restoreGraphicsState();
            }

            // Línea de corte vertical entre columnas
            if (columns > 1 && col < columns - 1) {
              const lineX = colX + colWidth;
              doc.saveGraphicsState();
              doc.setLineDashPattern([1, 1], 0);
              doc.setDrawColor(150, 150, 150);
              doc.setLineWidth(0.1);
              doc.line(lineX, rowY, lineX, rowY + plateLengthMm);
              doc.restoreGraphicsState();
            }
          }
        }

        // Guardar PDF
        const fileName = `plantilla_grabado_v_${plate.toLowerCase()}_${Date.now()}.pdf`;
        doc.save(fileName);
      } else {
        // Modo horizontal original
        // 1. Crear un canvas auxiliar para renderizar cada patente con la configuración elegida
        const exportCanvas = document.createElement('canvas');
        const scale = 6; // Mayor resolución para impresión impecable
        const plateWidthMm = 58; 
        
        const pxWidth = Math.round(plateWidthMm * 3.7795 * scale); // Convertir mm a píxeles
        const pxHeight = Math.round(plateHeightMm * 3.7795 * scale);

        exportCanvas.width = pxWidth;
        exportCanvas.height = pxHeight;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Renderizado del bloque usando el helper unificado
        drawSingleStencilInternal(
          ctx,
          pxWidth,
          pxHeight,
          scale,
          false,
          isMirrored,
          displayPlate,
          showBrandLogo,
          brandLogo,
          basePlateHeightMm,
          letterSpacing,
          fontHeightMm,
          fontCorrectionFactor,
          customLogoImg,
          logoSizeFactor,
          fontFamily,
          fontStyle
        );

        const plateImgData = exportCanvas.toDataURL('image/png');

        // 2. Calcular la altura dinámica del PDF
        const spacingBetween = showCutLines ? 8 : 4;
        const totalPdfHeight = (printCount * plateHeightMm) + ((printCount - 1) * spacingBetween) + 2;

        // 3. Crear el documento jsPDF con un ancho exacto de 58mm y altura calculada
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [58, totalPdfHeight]
        });

        let currentY = 1;

        // 4. Dibujar las plantillas de patente repetidas en el ticket con líneas de corte opcionales
        for (let i = 0; i < printCount; i++) {
          // Dibujar el recuadro de la patente de 58mm de ancho y plateHeightMm de alto
          doc.addImage(plateImgData, 'PNG', 0, currentY, 58, plateHeightMm);
          currentY += plateHeightMm;

          // Línea de corte punteada si corresponde y no es la última plantilla
          if (i < printCount - 1) {
            if (showCutLines) {
              currentY += 2;
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(100, 100, 100);
              doc.text('- - - - ✂ - - - - Corte Aquí - - - - ✂ - - - -', 29, currentY, { align: 'center' });
              doc.setTextColor(0, 0, 0);
              currentY += 6;
            } else {
              currentY += spacingBetween;
            }
          }
        }

        // Guardar PDF
        const fileName = `plantilla_grabado_${plate.toLowerCase()}_${Date.now()}.pdf`;
        doc.save(fileName);
      }
    } catch (error) {
      console.error("Error al exportar plantilla de grabado de vidrios:", error);
      alert("Hubo un error al generar el PDF de grabado de vidrios.");
    }
  };

  // Imprimir directamente en impresora térmica de 58mm (Solo patentes a ser grabadas, sin membrete ni marcas de corte)
  const handlePrintThermalDirect = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=450,height=700');
    if (!win) {
      alert('Por favor permite ventanas emergentes para imprimir el ticket térmico.');
      return;
    }

    let displayPlate = plate;
    if (isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId]) {
      const formatObj = patentFormats[selectedCountry].formats[selectedFormatId];
      displayPlate = formatObj.pattern(plate);
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket Grabado ${displayPlate}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 58mm;
              background: #ffffff;
              color: #000000;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .stencil-container {
              width: 100%;
              margin: 0 auto;
              padding: 0;
            }
            .stencil-img {
              width: 100%;
              height: auto;
              display: block;
              margin: ${showCutLines ? '3mm 0' : '1mm 0'};
            }
            .cut-line {
              border-top: 1px dashed #000;
              font-size: 8px;
              margin: 2mm 0;
              padding-top: 1mm;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="stencil-container">
            ${Array.from({ length: printCount }).map((_, idx) => `
              <img src="${dataUrl}" class="stencil-img" alt="Stencil ${idx + 1}" />
              ${showCutLines && idx < printCount - 1 ? '<div class="cut-line">- - - - ✂ - - - -</div>' : ''}
            `).join('')}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Scissors className="w-5 h-5" />
            </span>
            <span>Grabado de Vidrios & Patentes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Crea e imprime plantillas en espejo para tallado o grabado de vidrios de automóviles en tiras térmicas de 58mm.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Configuración Izquierdo */}
        <div className="lg:col-span-5 space-y-5 bg-slate-900 border border-slate-800/60 p-6 rounded-2xl">
          <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 mb-4 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-indigo-400" />
            Parámetros de Diseño
          </h3>

          {/* Región y Formato de Patente */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
                Región & Formato de Patente
              </label>
              <button
                type="button"
                onClick={() => setIsFormatEnabled(!isFormatEnabled)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer uppercase ${
                  isFormatEnabled 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                {isFormatEnabled ? 'Formato: ON ✓' : 'Formato: OFF'}
              </button>
            </div>

            {isFormatEnabled && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">País</span>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      const country = e.target.value;
                      setSelectedCountry(country);
                      const defaultFmt = patentFormats[country]?.defaultFormat || '1';
                      setSelectedFormatId(defaultFmt);
                      const maxLen = patentFormats[country]?.formats[defaultFmt]?.inputLength || 15;
                      setPlate(prev => prev.substring(0, maxLen));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    {Object.keys(patentFormats).map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Patrón</span>
                  <select
                    value={selectedFormatId}
                    onChange={(e) => {
                      setSelectedFormatId(e.target.value);
                      const maxLen = patentFormats[selectedCountry]?.formats[e.target.value]?.inputLength || 15;
                      setPlate(prev => prev.substring(0, maxLen));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    {Object.entries(patentFormats[selectedCountry]?.formats || {}).map(([id, formatObj]) => (
                      <option key={id} value={id}>
                        {formatObj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Patente input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Texto de Patente / Matrícula
            </label>
            <input
              type="text"
              value={plate}
              onChange={(e) => {
                const maxLen = isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId]
                  ? patentFormats[selectedCountry].formats[selectedFormatId].inputLength
                  : 15;
                setPlate(e.target.value.toUpperCase().slice(0, maxLen));
              }}
              placeholder={isFormatEnabled && patentFormats[selectedCountry]?.placeholder
                ? patentFormats[selectedCountry].placeholder
                : "ABCD-12"
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all font-mono font-bold tracking-widest text-center"
            />
            <p className="text-[10px] text-slate-500 font-medium">
              {isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId]
                ? `Formato activo: Enmascarado automático para ${selectedCountry} (máx. ${patentFormats[selectedCountry].formats[selectedFormatId].inputLength} caracteres).`
                : 'Soporta hasta 15 caracteres personalizados.'
              }
            </p>
          </div>

          {/* Logo de la Marca del Vehículo */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
                Logo de Marca / Custom Logo
              </label>
              <button
                type="button"
                onClick={() => setShowBrandLogo(!showBrandLogo)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer uppercase ${
                  showBrandLogo 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                {showBrandLogo ? 'Habilitado ✓' : 'Deshabilitado'}
              </button>
            </div>

            {showBrandLogo && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* Selector Dropdown General */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Listado General</span>
                    <select
                      value={brandLogo === 'CUSTOM' ? 'CUSTOM' : brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                    >
                      <optgroup label="Símbolos Integrados">
                        {['KIA', 'TOYOTA', 'HYUNDAI', 'CHEVROLET', 'FORD', 'SUZUKI', 'NISSAN', 'VOLKSWAGEN', 'HONDA', 'BMW', 'AUDI', 'MAZDA', 'MERCEDES BENZ', 'MITSUBISHI', 'RENAULT', 'VOLVO', 'JEEP'].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </optgroup>
                      {customLogoImg && (
                        <optgroup label="Cargados">
                          <option value="CUSTOM">Imagen Propia 📁</option>
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Cargar Logo Propio</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              setCustomLogoImg(img);
                              setBrandLogo('CUSTOM');
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[10px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Grid Rápido de Marcas Populares */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none">Quick Select (Populares)</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['KIA', 'TOYOTA', 'HYUNDAI', 'CHEVROLET', 'FORD', 'SUZUKI', 'NISSAN', 'VOLKSWAGEN', 'AUDI', 'RENAULT'].map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setBrandLogo(brand)}
                        className={`py-1.5 px-1 rounded-lg border text-[9px] font-bold transition-all text-center cursor-pointer ${
                          brandLogo === brand && showBrandLogo
                            ? 'bg-indigo-600 border-indigo-500 text-white font-black shadow'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider de Tamaño de Logo (sizeSlider de mipatente.cl) */}
                <div className="space-y-1.5 border-t border-slate-800/60 pt-2.5">
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                    <span>Tamaño del Logotipo</span>
                    <span className="text-indigo-400 font-mono">{Math.round(logoSizeFactor * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={logoSizeFactor}
                    onChange={(e) => setLogoSizeFactor(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tipografía & Estilo de Letra */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
              Tipografía & Estilo
            </span>
            <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Fuente</span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                >
                  <option value="Courier New">Courier New (F-Schrift)</option>
                  <option value="Roboto Condensed">Roboto Condensed</option>
                  <option value="Arial">Arial (Sencilla)</option>
                  <option value="monospace">Monospace</option>
                  <option value="Georgia">Serif (Elegante)</option>
                  <option value="Poppins">Poppins (Moderna)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Grosor / Estilo</span>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as 'normal' | 'bold')}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                >
                  <option value="bold">Negritas (Bold)</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Formato / Orientación de Impresión */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Formato / Orientación de Impresión
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode('vertical')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  layoutMode === 'vertical'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layout className="w-3.5 h-3.5 rotate-90" />
                <span>Vertical (Rotado)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('horizontal')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  layoutMode === 'horizontal'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Horizontal</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              {layoutMode === 'vertical'
                ? 'Recomendado: Rotado 90º para stencils grandes impresos a lo largo del rollo térmico, optimizando espacio en columnas.'
                : 'Tradicional: Impresión horizontal en un solo renglón limitada al ancho físico de 58mm.'}
            </p>
          </div>

          {/* Opciones adicionales para formato vertical */}
          {layoutMode === 'vertical' && (
            <div className="space-y-4 border-t border-slate-800/80 pt-4 animate-in fade-in duration-300">
              {/* Selector de columnas */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Columnas en Ancho de 58mm
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setColumns(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        columns === num
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      {num} {num === 1 ? 'Col' : 'Cols'}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500">
                  {columns === 3 ? 'Apto para stencils finos de hasta 12mm de alto (ideal moto/patente).' :
                   columns === 2 ? 'Equilibrado: stencils de hasta 20mm de alto (ideal para autos).' :
                   'Gigante: stencils de hasta 24mm de alto utilizando el ancho completo.'}
                </p>
              </div>

              {/* Slider largo de stencil */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Largo del Stencil / Tira</span>
                  <span className="text-indigo-400 font-mono">{plateLengthMm} mm</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  step="5"
                  value={plateLengthMm}
                  onChange={(e) => setPlateLengthMm(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
                <p className="text-[9px] text-slate-500">
                  Define la longitud física que tendrá cada tira sobre el vidrio (ej. 100mm = 10cm).
                </p>
              </div>
            </div>
          )}

          {/* Tamaño de letra Slider */}
          <div className="space-y-1.5 border-t border-slate-800/80 pt-4">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Altura Real de la Letra</span>
              <span className="text-indigo-400 font-mono">{fontHeightMm} mm</span>
            </div>
            <input
              type="range"
              min="4"
              max="24"
              step="0.5"
              value={fontHeightMm}
              onChange={(e) => setFontHeightMm(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
            <p className="text-[9px] text-slate-500 font-medium">
              Ajusta la altura real de la letra impresa. Autocalibrado para compensar la escala de la impresora.
            </p>
          </div>

          {/* Espaciado de letras Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Espaciado entre Caracteres</span>
              <span className="text-indigo-400 font-mono">{letterSpacing} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              step="0.5"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Modo Espejo</span>
              <button
                type="button"
                onClick={() => setIsMirrored(!isMirrored)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isMirrored 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/40' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isMirrored ? 'animate-spin-slow' : ''}`} />
                {isMirrored ? 'Activo (Espejo)' : 'Desactivado'}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Líneas de Corte</span>
              <button
                type="button"
                onClick={() => setShowCutLines(!showCutLines)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  showCutLines 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/40' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                {showCutLines ? 'Con Líneas ✂' : 'Sin Líneas'}
              </button>
            </div>
          </div>

          {/* Cantidad de impresiones */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Cantidad de Impresiones en Ticket (Máx 10)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 4, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPrintCount(num)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                    printCount === num
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 font-medium">
              Por ejemplo: 6 copias cubren todos los vidrios laterales, parabrisas delantero y luneta trasera.
            </p>
          </div>



          {/* Acciones principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={handlePrintThermalDirect}
              className="w-full py-3.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              Imprimir Térmico Directo
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full py-3.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/30 border border-indigo-500/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              Exportar PDF 58mm
            </button>
          </div>
        </div>

        {/* Panel de Vista Previa Derecho */}
        <div className="lg:col-span-7 space-y-6">
          {/* Vista previa de plantilla de grabado */}
          <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                Vista Previa Física de la Plantilla
              </span>
              <span className="text-[9px] bg-indigo-950 border border-indigo-900/40 px-2 py-0.5 rounded-full text-indigo-300 font-semibold uppercase tracking-wider">
                {layoutMode === 'vertical' 
                  ? `Recuadro Real 58mm x ${plateLengthMm}mm`
                  : `Recuadro Real 58mm x ${plateHeightMm}mm`}
              </span>
            </h3>

            {/* Canvas contenedor render */}
            <div className="flex flex-col items-center justify-center py-10 bg-slate-950 rounded-2xl border border-slate-800/60 relative">
              <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-600">
                Visualización de grabado de vidrios (impresión a escala real)
              </div>
              
              {/* Recuadro simulado real */}
              <div className="relative group">
                <canvas 
                  ref={canvasRef} 
                  className="rounded shadow-2xl border border-slate-800 max-w-full"
                  style={{ 
                    width: '220px', 
                    height: layoutMode === 'vertical'
                      ? `${Math.round(plateLengthMm * 3.793)}px`
                      : `${Math.round(plateHeightMm * 3.8)}px`
                  }} // Escala para simular los mm exactos en pantalla
                />
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[8px] font-mono text-slate-500 px-1">
                  <span>58mm de Ancho</span>
                  <span>
                    {layoutMode === 'vertical' 
                      ? `${plateLengthMm}mm de Largo (${columns} Col.)` 
                      : `${plateHeightMm}mm de Alto`}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-slate-400 text-[11px] leading-relaxed">
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
                <span className="font-bold text-slate-300 block">💡 Tipografía F Schrift:</span>
                Optimizado para corte preciso con vinilo autoadhesivo o impresión térmica de alta legibilidad para grabado químico o con micropuente.
              </div>
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
                <span className="font-bold text-slate-300 block">↩️ Efecto Espejo (Mirror):</span>
                Obligatorio para que al pegar la plantilla por dentro del vidrio, la patente sea perfectamente legible desde el exterior.
              </div>
            </div>
          </div>

          {/* Vista previa de cómo lucirá el ticket de 58mm completo */}
          {(() => {
            const includeServiceBoleta = false;
            const garageName = "ESTACIONAMIENTO BAMO GARAGE";
            const garageRut = "78.084.649-6";
            const garagePhone = "+569 9 393 9952";
            const controlNum = "CTL-001";
            const clientRut = "";
            const clientName = "";
            const clientPhone = "";
            const vehicleDetails = "";
            const entryDate = new Date().toLocaleDateString('es-CL');
            const entryTime = new Date().toLocaleTimeString('es-CL');
            const scheduleText = "LUN A DOM: 08:00 - 20:00 HRS";
            const rateText = "TARIFA DE ESTACIONAMIENTO VIGENTE";
            const paymentText = "EFECTIVO / DÉBITO / CRÉDITO";
            const footerBannerText = "BOLETA DE SERVICIO";

            return (
              <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Vista Previa de Boleta Térmica Completa
                </h3>

                {/* Simulación del recibo térmico de 58mm */}
                <div className="max-w-[280px] mx-auto bg-white text-black p-4 rounded-lg shadow-2xl border border-zinc-300 font-mono text-[9px] leading-tight space-y-3">
                  {/* Boleta Comercial Header BAMO GARAGE */}
                  {includeServiceBoleta && (
                    <div className="border-b border-zinc-200 pb-3 mb-3 text-black text-left space-y-3 select-none">
                      {/* Empresa Cabecera Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GarageLogoSimulation />
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[9.5px] uppercase text-zinc-950 leading-tight">
                              {garageName}
                            </span>
                            <span className="text-[7.5px] text-zinc-500 font-bold leading-none mt-1">
                              RUT: {garageRut}
                            </span>
                            <span className="text-[7.5px] text-zinc-500 font-medium leading-none mt-1">
                              {garagePhone}
                            </span>
                          </div>
                        </div>
                        {/* Barcode + Control */}
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-[6px] text-zinc-400 font-bold leading-none mb-1">Control:</span>
                          <BarcodeSimulation code={controlNum} />
                          <span className="text-[7px] text-zinc-600 font-bold mt-0.5 tracking-wider">*{controlNum}*</span>
                        </div>
                      </div>

                      {/* Sección Cliente */}
                      <div className="rounded border border-zinc-200 overflow-hidden">
                        <div className="bg-zinc-800 text-white font-bold text-[7.5px] px-1.5 py-0.5 uppercase tracking-wide">
                          Cliente
                        </div>
                        <div className="p-1.5 text-[7px] grid grid-cols-2 gap-x-2 gap-y-1 bg-white">
                          <div>
                            <span className="text-zinc-500">RUT: </span>
                            <span className="font-bold text-zinc-900">{clientRut || '-'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Nombre: </span>
                            <span className="font-bold text-zinc-900 truncate max-w-[80px] inline-block align-bottom">{clientName || '-'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-zinc-500">Teléfono: </span>
                            <span className="font-bold text-zinc-900">{clientPhone || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sección Vehículo */}
                      <div className="rounded border border-zinc-200 overflow-hidden">
                        <div className="bg-zinc-800 text-white font-bold text-[7.5px] px-1.5 py-0.5 uppercase tracking-wide">
                          Vehículo:
                        </div>
                        <div className="p-1.5 text-[7px] grid grid-cols-2 gap-x-2 gap-y-1 bg-white">
                          <div>
                            <span className="text-zinc-500">Patente: </span>
                            <span className="font-bold text-zinc-900">{isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId] ? patentFormats[selectedCountry].formats[selectedFormatId].pattern(plate) : plate}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-zinc-500">Marca/modelo/color/año: </span>
                            <span className="font-bold text-zinc-900 block mt-0.5">{vehicleDetails || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sección Servicio */}
                      <div className="rounded border border-zinc-200 overflow-hidden">
                        <div className="bg-zinc-800 text-white font-bold text-[7.5px] px-1.5 py-0.5 uppercase tracking-wide">
                          Servicio (Estacionamiento)
                        </div>
                        <div className="bg-zinc-100 text-center py-0.5 border-b border-zinc-200 font-bold text-[7px] text-zinc-600">
                          Ingreso:
                        </div>
                        <div className="p-1.5 text-[7px] grid grid-cols-2 text-center bg-white">
                          <div className="border-r border-zinc-100">
                            <span className="text-zinc-500 block text-[6px]">Fecha</span>
                            <span className="font-bold text-zinc-900 text-[8px]">{entryDate}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[6px]">Hora:</span>
                            <span className="font-bold text-zinc-900 text-[8px]">{entryTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tarifas */}
                      <div className="text-center font-bold text-[8px] space-y-0.5 text-zinc-950 py-1.5 leading-snug">
                        <p className="tracking-wide">{scheduleText}</p>
                        <p className="text-[8.5px] font-black text-zinc-900">{rateText}</p>
                        <p className="tracking-wider">{paymentText}</p>
                      </div>

                      {/* Banner Boleta */}
                      <div className="bg-zinc-800 text-amber-500 font-black text-center py-1 text-[8.5px] rounded tracking-widest uppercase">
                        {footerBannerText}
                      </div>
                    </div>
                  )}

              {layoutMode === 'vertical' ? (
                // Simulación del ticket vertical con columnas
                <div className="space-y-4 py-2">
                  <div className="text-center text-[8px] text-zinc-400 italic mb-2 border-b border-dashed border-zinc-200 pb-1">
                    [Rollo Térmico 58mm - Impresión Vertical]
                  </div>
                  {/* Filas */}
                  {Array.from({ length: Math.ceil(Math.min(6, printCount) / columns) }).map((_, rowIdx) => (
                    <div key={rowIdx} className="space-y-3">
                      <div className="flex justify-around items-center w-full py-6 bg-zinc-50 border border-dashed border-zinc-200 rounded relative">
                        {Array.from({ length: columns }).map((_, colIdx) => {
                          const itemIndex = rowIdx * columns + colIdx;
                          if (itemIndex >= printCount) return <div key={colIdx} className="flex-1" />;
                          return (
                            <div 
                              key={colIdx} 
                              className="flex flex-col items-center justify-center font-bold relative"
                              style={{
                                height: `${Math.round(plateLengthMm * 0.7)}px`, // Escala reducida de previsualización
                                width: `${Math.round((58 / columns) * 1.5)}px`,
                                borderLeft: colIdx > 0 ? '1.5px dashed #94a3b8' : 'none',
                              }}
                            >
                              <div 
                                className="whitespace-nowrap uppercase tracking-wider font-black flex items-center gap-1.5"
                                style={{
                                  transform: `rotate(-90deg) ${isMirrored ? 'scaleY(-1)' : ''}`,
                                  fontSize: `${Math.min(13, fontHeightMm * 0.8 + 2)}px`,
                                }}
                              >
                                {showBrandLogo && (
                                  <span className="text-[7px] border border-black rounded px-1 scale-90 font-sans tracking-tight font-bold bg-zinc-100">
                                    {brandLogo}
                                  </span>
                                )}
                                <span>{isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId] ? patentFormats[selectedCountry].formats[selectedFormatId].pattern(plate) : plate}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {showCutLines && rowIdx < Math.ceil(printCount / columns) - 1 && (
                        <div className="text-[7px] text-zinc-500 text-center border-t border-dashed border-zinc-300 pt-1 mt-1 font-sans font-bold">
                          - - - - ✂ - - - - CORTE HORIZONTAL - - - - ✂ - - - -
                        </div>
                      )}
                    </div>
                  ))}
                  {printCount > columns * 3 && (
                    <div className="text-center text-[7px] text-zinc-400 italic pt-1 border-t border-dashed border-zinc-200">
                      [...+{printCount - columns * 3} plantillas adicionales en el ticket real]
                    </div>
                  )}
                </div>
              ) : (
                // Simulación del ticket horizontal tradicional
                <div className="space-y-3 py-1">
                  {Array.from({ length: Math.min(4, printCount) }).map((_, idx) => (
                    <div key={idx} className="space-y-2 border-b border-dashed border-zinc-100 pb-2">
                      {/* Dibujo de marca simulada arriba */}
                      {showBrandLogo && (
                        <div 
                          className="text-center font-sans font-bold text-[7px] border border-black rounded px-1.5 py-0.2 max-w-fit mx-auto bg-zinc-50 scale-90"
                          style={{ 
                            transform: isMirrored ? 'scaleX(-1)' : 'none'
                          }}
                        >
                          {brandLogo}
                        </div>
                      )}
                      {/* Dibujo de patente simulada en espejo en el recibo de papel */}
                      <div 
                        className="py-1 px-1 text-center font-bold select-none uppercase tracking-widest relative" 
                        style={{ 
                          transform: isMirrored ? 'scaleX(-1)' : 'none',
                          fontSize: `${Math.min(14, fontHeightMm + 2)}px`
                        }}
                      >
                        {isFormatEnabled && patentFormats[selectedCountry]?.formats[selectedFormatId] ? patentFormats[selectedCountry].formats[selectedFormatId].pattern(plate) : plate}
                      </div>
                      {showCutLines && idx < printCount - 1 && idx < 3 && (
                        <div className="text-[7px] text-zinc-500 text-center border-t border-dashed border-zinc-300 pt-1.5 mt-1.5 font-sans font-bold">
                          - - - - ✂ - - - - CORTE AQUÍ - - - - ✂ - - - -
                        </div>
                      )}
                    </div>
                  ))}
                  {printCount > 4 && (
                    <div className="text-center text-[7px] text-zinc-400 italic pt-1">
                      [...+{printCount - 4} plantillas adicionales en el ticket real]
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      </div>
    </div>
    </div>
  );
}
