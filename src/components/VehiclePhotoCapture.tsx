/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, Eye, X, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface VehiclePhotoCaptureProps {
  photo?: string; // base64 representation of the image
  label: string; // e.g., "Foto de Ingreso" or "Foto de Salida"
  onPhotoCaptured: (base64: string) => void;
  onPhotoRemoved: () => void;
}

export default function VehiclePhotoCapture({
  photo,
  label,
  onPhotoCaptured,
  onPhotoRemoved
}: VehiclePhotoCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks when component unmounts or camera is deactivated
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Activate device camera
  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError(null);
    
    try {
      // Prefer environment (back) camera for capturing vehicles
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("No se pudo activar la cámara web:", err);
      setCameraError(
        "No se pudo acceder a la cámara. Puede usar el botón de subir imagen para seleccionar un archivo o usar la cámara del dispositivo móvil."
      );
      setIsCameraActive(false);
    }
  };

  // Capture frame from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 jpeg with compression (0.7) to save localStorage space
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      onPhotoCaptured(base64);
      stopCamera();
    }
  };

  // Handle file input upload (native camera or gallery fallback)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Compress image using canvas before saving to optimize space
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max size of 1000px on either side to be gentle on storage
          const MAX_SIZE = 1000;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            onPhotoCaptured(compressedBase64);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        {photo && (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Registrada
          </span>
        )}
      </div>

      {/* PHOTO PREVIEW / EMPTY STATE / CAMERA LIVE CONTAINER */}
      <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center group transition-all duration-300">
        
        {/* State 1: Active camera preview */}
        {isCameraActive && (
          <div className="absolute inset-0 flex flex-col justify-between bg-black z-10">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 px-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3 rounded-full flex items-center justify-center shadow-lg transition-all border border-emerald-500 cursor-pointer"
                title="Tomar Foto"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-900/90 hover:bg-slate-800/90 text-slate-400 border border-slate-700/60 p-3 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer"
                title="Cancelar cámara"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* State 2: Existing captured photo */}
        {photo && !isCameraActive && (
          <div className="absolute inset-0">
            <img 
              src={photo} 
              alt={label} 
              className="w-full h-full object-cover"
            />
            {/* Quick overlay controls */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="p-2 bg-blue-600/90 hover:bg-blue-500/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Ampliar
              </button>
              <button
                type="button"
                onClick={onPhotoRemoved}
                className="p-2 bg-rose-600/90 hover:bg-rose-500/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* State 3: Empty state - prompt choices */}
        {!photo && !isCameraActive && (
          <div className="p-4 text-center space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-6 h-6 text-slate-500" />
            </div>
            
            <div className="space-y-1">
              <p className="text-slate-300 font-bold text-xs">Sin imagen de evidencia</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                Fotografíe el estado del auto al ingresar y salir para evitar reclamos.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                Usar Cámara
              </button>
              <button
                type="button"
                onClick={triggerFileSelect}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Subir Foto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for native camera fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment" // Forces back camera on mobile phones
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera Access Error Message */}
      {cameraError && (
        <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-xl text-[10px] leading-relaxed flex gap-1.5 items-start">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* FULL-SCREEN IMAGE MODAL PREVIEW */}
      {showFullPreview && photo && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 animate-fade-in backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              {label} - Evidencia Inspección
            </h4>
            <button
              onClick={() => setShowFullPreview(false)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-h-[75vh] overflow-hidden my-4">
            <img
              src={photo}
              alt={label}
              className="max-w-full max-h-full object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                onPhotoRemoved();
                setShowFullPreview(false);
              }}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Trash2 className="w-4 h-4" /> Eliminar y Volver a Tomar
            </button>
            <button
              onClick={() => setShowFullPreview(false)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
