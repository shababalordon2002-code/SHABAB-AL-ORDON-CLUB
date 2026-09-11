'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Scan,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crosshair,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { PERIOD_BASE_SECONDS } from './BotoneraStopwatch';

import Tesseract from 'tesseract.js';

interface OCRClockScannerModalProps {
  videoElement: HTMLVideoElement | null;
  iframeElement: HTMLIFrameElement | null;
  currentPeriod: number;
  currentVideoTime: number;
  onApplySync: (period: number, matchTimeSeconds: number, videoTimeSeconds: number) => void;
  onClose: () => void;
}

export interface PresetCropRegion {
  id: string;
  name: string;
  xPct: number; // percentage from left 0..100
  yPct: number; // percentage from top 0..100
  wPct: number; // width percentage 0..100
  hPct: number; // height percentage 0..100
}

const PRESET_CROPS: PresetCropRegion[] = [
  { id: 'top_left', name: 'Esquina Superior Izquierda (TV)', xPct: 2, yPct: 2, wPct: 24, hPct: 12 },
  { id: 'top_center', name: 'Barra Superior Central', xPct: 35, yPct: 1, wPct: 30, hPct: 10 },
  { id: 'top_right', name: 'Esquina Superior Derecha', xPct: 74, yPct: 2, wPct: 24, hPct: 12 },
  { id: 'custom', name: 'Recorte Personalizado', xPct: 5, yPct: 5, wPct: 30, hPct: 15 },
];

/**
 * Preprocesses a canvas crop region to enhance high-contrast digital text (white/yellow numbers on dark background)
 */
function processCanvasFrame(canvas: HTMLCanvasElement): {
  processedDataUrl: string;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    return { processedDataUrl: '' };
  }

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Calculate min, max, average luminance for adaptive contrast thresholding
  let sumLum = 0;
  let minLum = 255;
  let maxLum = 0;
  const pixelCount = w * h;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    sumLum += lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // Adaptive threshold calculated dynamically per frame
  const threshold = Math.max(80, Math.min(185, (minLum + maxLum) * 0.52));

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const isBright = lum >= threshold;
    const val = isBright ? 255 : 0;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
  }

  // Scale up 2x for Tesseract digit engine clarity
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = w * 2;
  scaledCanvas.height = h * 2;
  const scaledCtx = scaledCanvas.getContext('2d');
  if (scaledCtx) {
    scaledCtx.imageSmoothingEnabled = false;
    scaledCtx.putImageData(imgData, 0, 0);
    scaledCtx.drawImage(canvas, 0, 0, w, h, 0, 0, w * 2, h * 2);
    return { processedDataUrl: scaledCanvas.toDataURL('image/png') };
  }

  ctx.putImageData(imgData, 0, 0);
  return { processedDataUrl: canvas.toDataURL('image/png') };
}

/**
 * Parses time strings formatted as mm:ss, m:ss, hh:mm:ss, or mm.ss
 */
function parseTimeStringToSeconds(inputStr: string): number | null {
  const cleaned = inputStr.trim().replace('.', ':').replace(',', ':');
  if (!cleaned) return null;

  const hms = cleaned.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
  if (hms) {
    return parseInt(hms[1], 10) * 3600 + parseInt(hms[2], 10) * 60 + parseInt(hms[3], 10);
  }

  const ms = cleaned.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (ms) {
    return parseInt(ms[1], 10) * 60 + parseInt(ms[2], 10);
  }

  if (/^\d+$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    return num <= 120 ? num * 60 : num;
  }

  return null;
}

export const OCRClockScannerModal: React.FC<OCRClockScannerModalProps> = ({
  videoElement,
  iframeElement,
  currentPeriod,
  currentVideoTime,
  onApplySync,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('top_left');
  const [cropRegion, setCropRegion] = useState<PresetCropRegion>(PRESET_CROPS[0]);
  const [targetPeriod, setTargetPeriod] = useState<number>(currentPeriod || 1);

  const formatSecToMinSec = (sec: number) => {
    const total = Math.max(0, Math.floor(sec));
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [detectedText, setDetectedText] = useState<string>('');
  const [manualTimeInput, setManualTimeInput] = useState<string>(formatSecToMinSec(currentVideoTime));
  const [processedImagePreview, setProcessedImagePreview] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isYouTubeMode, setIsYouTubeMode] = useState<boolean>(false);
  const [hasScreenCapture, setHasScreenCapture] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Clean up screen capture stream on unmount
  useEffect(() => {
    return () => {
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Request browser screen/tab capture for YouTube video stream
  const handleStartScreenCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('⚠️ Tu navegador no soporta la captura de pestaña para OCR en YouTube.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          selfBrowserSurface: 'include',
          preferCurrentTab: true,
          surfaceSwitching: 'include',
        } as any,
        audio: false,
      });

      displayStreamRef.current = stream;

      let screenVideo = screenVideoRef.current;
      if (!screenVideo) {
        screenVideo = document.createElement('video');
        screenVideo.autoplay = true;
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideoRef.current = screenVideo;
      }
      screenVideo.srcObject = stream;
      await screenVideo.play();

      setHasScreenCapture(true);
      setIsYouTubeMode(false);
      setStatusMessage('✨ Pestaña de vídeo vinculada. Capturando marcador de TV por OCR...');

      // Trigger frame capture once video stream is ready
      setTimeout(() => {
        captureAndScanFrame();
      }, 600);
    } catch (err) {
      console.warn('Captura de pantalla cancelada o denegada:', err);
    }
  };

  // Perform frame capture & OCR processing from REAL video pixels
  const captureAndScanFrame = useCallback(async () => {
    setIsScanning(true);

    const sourceVideoEl = videoElement || screenVideoRef.current;

    if (!sourceVideoEl) {
      setIsYouTubeMode(true);
      setProcessedImagePreview(null);
      setStatusMessage('ℹ️ Enlace YouTube: YouTube restringe la lectura directa de fotogramas por CORS. Haz clic en "Vincular Pestaña YouTube para OCR" o confirma abajo el minutaje visible.');
      setIsScanning(false);
      return;
    }

    setIsYouTubeMode(false);
    setStatusMessage('⌛ Capturando marcador del vídeo de televisión...');

    try {
      const canvas = canvasRef.current || document.createElement('canvas');

      let sourceWidth = sourceVideoEl.videoWidth || 1280;
      let sourceHeight = sourceVideoEl.videoHeight || 720;

      const cropX = Math.round((cropRegion.xPct / 100) * sourceWidth);
      const cropY = Math.round((cropRegion.yPct / 100) * sourceHeight);
      const cropW = Math.max(120, Math.round((cropRegion.wPct / 100) * sourceWidth));
      const cropH = Math.max(60, Math.round((cropRegion.hPct / 100) * sourceHeight));

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || sourceVideoEl.readyState < 1) {
        setStatusMessage('⚠️ Esperando transmisión del vídeo...');
        setIsScanning(false);
        return;
      }

      // Draw real video frame crop from TV broadcast
      ctx.drawImage(sourceVideoEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Raw video frame crop preview (shows real team names, logo & TV clock)
      const rawDataUrl = canvas.toDataURL('image/png');
      setProcessedImagePreview(rawDataUrl);

      // Prepare binarized copy for Tesseract OCR digit recognition
      const processed = processCanvasFrame(canvas);
      const dataUrlToScan = processed.processedDataUrl || rawDataUrl;

      // Run Tesseract OCR on the actual TV broadcast cropped scoreboard
      try {
        const ocrPromise = Tesseract.recognize(dataUrlToScan, 'eng');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout OCR')), 2500)
        );

        const res: any = await Promise.race([ocrPromise, timeoutPromise]);
        const txt = res?.data?.text || '';
        const match = txt.match(/\b(\d{1,2})[:.\s](\d{2})\b/);
        if (match) {
          const detectedStr = `${match[1].padStart(2, '0')}:${match[2]}`;
          setDetectedText(detectedStr);
          setManualTimeInput(detectedStr);
          setStatusMessage(`✨ Minuto detectado en el marcador del partido (TV): ${detectedStr}`);
          setIsScanning(false);
          return;
        }
      } catch {
        // Tesseract timeout or parse exception
      }

      setStatusMessage('✅ Fotograma del marcador capturado. Confirma o ajusta los dígitos MM:SS abajo.');
    } catch (err: any) {
      console.warn('Error escaneando fotograma de vídeo:', err);
      setStatusMessage('ℹ️ Ingresa o confirma el minutaje visible en el reloj TV.');
    } finally {
      setIsScanning(false);
    }
  }, [videoElement, cropRegion]);

  useEffect(() => {
    captureAndScanFrame();
  }, [captureAndScanFrame]);

  // Auto-scan interval setup
  useEffect(() => {
    const activeVideo = videoElement || screenVideoRef.current;
    if (isAutoScanActive && activeVideo) {
      autoScanIntervalRef.current = setInterval(() => {
        captureAndScanFrame();
      }, 2500);
    } else if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
    }
    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [isAutoScanActive, videoElement, captureAndScanFrame]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = PRESET_CROPS.find((p) => p.id === presetId);
    if (found) {
      setCropRegion(found);
      setTimeout(captureAndScanFrame, 100);
    }
  };

  const handleAdjustSeconds = (deltaSecs: number) => {
    const currentSecs = parseTimeStringToSeconds(manualTimeInput) ?? 0;
    const newSecs = Math.max(0, currentSecs + deltaSecs);
    setManualTimeInput(formatSecToMinSec(newSecs));
  };

  const handleConfirmSync = () => {
    const parsedSeconds = parseTimeStringToSeconds(manualTimeInput);
    if (parsedSeconds === null) {
      alert('⚠️ Por favor ingresa un formato de tiempo válido (ej. 26:17 o 39:22).');
      return;
    }

    onApplySync(targetPeriod, parsedSeconds, currentVideoTime);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md p-3 sm:p-4 pointer-events-none flex flex-col justify-center animate-fade-in">
      <div className="pointer-events-auto relative w-full bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/40 rounded-3xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Visor OCR Cronómetro TV</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono">
                  BETA VISION
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lector de minutos y segundos en pantalla broadcast con sincronización automática.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-200">
          {/* Step 1: Period Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>1. Selecciona el Periodo Actual del Partido</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 1, label: '1ª Parte', desc: '00:00 - 45:00' },
                { id: 2, label: '2ª Parte', desc: '45:00 - 90:00' },
                { id: 3, label: 'Prórroga 1ª', desc: '90:00 - 105:00' },
                { id: 4, label: 'Prórroga 2ª', desc: '105:00 - 120:00' },
              ].map((p) => {
                const isSelected = targetPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargetPeriod(p.id)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-white ring-2 ring-emerald-500/40 font-extrabold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black">{p.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Presets for Scoreboard crop location */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>2. Posición del Marcador en la Pantalla del Partido</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_CROPS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-2.5 px-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span>{preset.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom crop slider controls when 'custom' is selected */}
            {selectedPreset === 'custom' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-sky-500/30 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Izquierda (%): {cropRegion.xPct}%</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={cropRegion.xPct}
                    onChange={(e) => setCropRegion((r) => ({ ...r, xPct: Number(e.target.value) }))}
                    className="w-full accent-sky-400"
                  />
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Superior (%): {cropRegion.yPct}%</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={cropRegion.yPct}
                    onChange={(e) => setCropRegion((r) => ({ ...r, yPct: Number(e.target.value) }))}
                    className="w-full accent-sky-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Scan Preview Canvas & Manual Digit Correction */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Fotograma Real del Marcador TV</span>
              </span>

              <div className="flex items-center gap-2">
                {isYouTubeMode && !hasScreenCapture && (
                  <button
                    type="button"
                    onClick={handleStartScreenCapture}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-950/50"
                    title="Vincular la pestaña del navegador donde tienes abierto el vídeo para lectura OCR automática"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Vincular Pestaña YouTube para OCR</span>
                  </button>
                )}

                {(videoElement || hasScreenCapture) && (
                  <button
                    type="button"
                    onClick={captureAndScanFrame}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>Re-escanear Marcador</span>
                  </button>
                )}
              </div>
            </div>

            {/* Display Processed Real Video Frame Crop Preview */}
            <div className="relative aspect-video bg-black rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
              {processedImagePreview ? (
                <img
                  src={processedImagePreview}
                  alt="Fotograma Marcador TV"
                  className="max-h-full max-w-full object-contain filter contrast-110 rounded border border-slate-700 shadow-md"
                />
              ) : isYouTubeMode ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400 p-4 text-center">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-amber-300 block">Modo Vídeo YouTube Incrustado</span>
                    <span className="text-[11px] text-slate-300 max-w-md block leading-relaxed">
                      En la ventana emergente de Chrome, haz clic arriba en la <strong className="text-amber-300">2ª opción: "Ventana"</strong> o <strong className="text-amber-300">3ª opción: "Toda la pantalla"</strong> para seleccionar tu navegador y compartir el fotograma de YouTube.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartScreenCapture}
                    className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer hover:brightness-110 transition"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Seleccionar "Ventana" para Vincular OCR</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                  <span className="text-xs font-medium">Capturando marcador del vídeo...</span>
                </div>
              )}
            </div>

            {statusMessage && (
              <p className="text-[11px] text-slate-300 font-mono text-center bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                {statusMessage}
              </p>
            )}

            {/* Step 4: Minutaje Identificado / Confirmado */}
            <div className="pt-3 space-y-3 border-t border-slate-800/80">
              <label className="block text-xs font-black uppercase tracking-wider text-amber-300 text-center">
                MINUTAJE EN PANTALLA (TV) — CONFIRMA MM:SS
              </label>

              <div className="flex flex-col items-center gap-2">
                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    value={manualTimeInput}
                    onChange={(e) => setManualTimeInput(e.target.value)}
                    placeholder="18:55"
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 border-2 border-amber-500/60 font-mono text-3xl font-black text-amber-400 text-center tracking-widest focus:outline-none focus:border-amber-400 shadow-lg shadow-amber-950/40"
                  />
                  <Clock className="w-5 h-5 text-amber-400 absolute right-4 top-1/2 -translate-y-1/2 opacity-70" />
                </div>

                {/* Quick adjustment controls */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAdjustSeconds(-60)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    -1m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustSeconds(-10)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    -10s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustSeconds(10)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    +10s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustSeconds(60)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    +1m
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {(videoElement || hasScreenCapture) ? (
            <button
              type="button"
              onClick={() => setIsAutoScanActive(!isAutoScanActive)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isAutoScanActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Escanear continuamente cada 2.5 segundos para auto-corregir desvíos"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isAutoScanActive ? 'Auto-Escáner Activo (2.5s)' : 'Activar Auto-Escáner'}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic">Sincronización por minutaje TV</div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSync}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/50 transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Sincronizar Cronómetro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
