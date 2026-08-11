"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Zap,
  RefreshCw,
  Search,
  Wifi,
  Camera,
  Send,
} from "lucide-react";
import { extractMedicineNameFromImage } from "@/lib/medicineOcr";

function RemoteScanClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";

  const [paired, setPaired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  // display: what's shown to the user. sendValue: what actually gets transmitted —
  // must always stay in the safe "barcode | name" pipe format, never the
  // parenthesized display format, or the desktop-side parser corrupts the barcode.
  const [scannedPreview, setScannedPreview] = useState<{ type: "barcode" | "medicine"; display: string; sendValue: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);

  const lastScannedRef = useRef<string>("");
  const isSendingRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);

  const PENDING_CAPTURE_KEY = "medtrack_pending_capture";

  // Some Android browsers reclaim/reload this tab while the native camera app
  // (or gallery picker) is open in the foreground. When that happens, the
  // page comes back fresh with no error and no photo — it just looks like
  // nothing happened. Detect that case on mount and tell the user plainly,
  // instead of leaving them staring at a reset page with no explanation.
  useEffect(() => {
    try {
      const marker = sessionStorage.getItem(PENDING_CAPTURE_KEY);
      if (marker) {
        const ts = parseInt(marker, 10);
        if (!isNaN(ts) && Date.now() - ts < 3 * 60 * 1000) {
          setCaptureError(
            "Your last photo didn't come back — some phones reset this page while the camera app is open. Please try again, or use 'Choose from Gallery' after taking the photo instead."
          );
        }
        sessionStorage.removeItem(PENDING_CAPTURE_KEY);
      }
    } catch (e) { }
  }, []);

  // Pair with desktop on mount
  useEffect(() => {
    if (!sessionId) {
      setErrorMsg("Missing pairing session token. Please scan the QR code on your Desktop screen.");
      return;
    }

    const topic = `medtrack_session_${sessionId.toLowerCase()}`;

    const pairWithDesktop = async () => {
      try {
        fetch(`https://ntfy.sh/${topic}`, {
          method: "POST",
          body: "PAIRED",
        }).catch(() => { });

        fetch("/api/scanner/remote-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action: "pair" }),
        }).catch(() => { });

        setPaired(true);
      } catch (err) {
        setPaired(true);
      }
    };

    pairWithDesktop();
  }, [sessionId]);

  function isValidEAN13(code: string): boolean {
    const clean = code.trim();
    if (!/^\d{13}$/.test(clean)) return true;

    const prefix3 = parseInt(clean.slice(0, 3));
    if (prefix3 >= 990 && prefix3 <= 999) {
      return false;
    }

    const digits = clean.split("").map(Number);
    const checkDigit = digits.pop()!;
    const sum = digits.reduce((acc, digit, idx) => {
      return acc + digit * (idx % 2 === 0 ? 1 : 3);
    }, 0);
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheck;
  }

  // Handle sending barcode or extracted medicine name to Desktop POS
  const handlePhoneScan = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || !sessionId) return;

    if (/^\d{13}$/.test(cleanCode) && !isValidEAN13(cleanCode)) {
      return;
    }

    if (Date.now() - lastTimeRef.current < 800 && lastScannedRef.current === cleanCode) {
      return;
    }
    lastTimeRef.current = Date.now();
    lastScannedRef.current = cleanCode;

    // Haptic feedback vibration on phone
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(120);
      } catch (e) { }
    }

    setLoading(true);
    setErrorMsg("");

    const topic = `medtrack_session_${sessionId.toLowerCase()}`;

    try {
      // 1. Send instant real-time transmission via SSE stream
      await fetch(`https://ntfy.sh/${topic}`, {
        method: "POST",
        body: cleanCode,
      }).catch(() => { });

      // 2. Send via backend API endpoint for desktop polling fallback
      await fetch("/api/scanner/remote-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, barcode: cleanCode }),
      }).catch(() => { });

      setLastScanned(cleanCode);
    } catch (err) {
      setLastScanned(cleanCode);
    } finally {
      setLoading(false);
    }
  };

  const decodeImageFileAndHandle = async (file: File): Promise<string | null> => {
    const scratchId = "still-photo-decoder-scratch";
    let scratchEl = document.getElementById(scratchId);
    if (!scratchEl) {
      scratchEl = document.createElement("div");
      scratchEl.id = scratchId;
      scratchEl.style.display = "none";
      document.body.appendChild(scratchEl);
    }
    const decoder = new Html5Qrcode(scratchId);
    try {
      const decodedText = await decoder.scanFile(file, false);
      return decodedText || null;
    } catch (e) {
      return null;
    } finally {
      try { await decoder.clear(); } catch (e) { }
    }
  };

  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    try { sessionStorage.removeItem(PENDING_CAPTURE_KEY); } catch (err) { }
    if (!file) return;
    setCaptureError(null);
    setCapturingPhoto(true);
    setOcrProgressMsg("Scanning barcode from photo...");
    try {
      const decodedBarcode = await decodeImageFileAndHandle(file);
      if (decodedBarcode) {
        setOcrProgressMsg("");
        setScannedPreview({ type: "barcode", display: decodedBarcode, sendValue: decodedBarcode });
        // Only updates mobile UI card preview. Does NOT send to desktop until user taps "Send to Desktop POS"
      } else {
        setCaptureError("Couldn't read a barcode in that photo. Please ensure the barcode is clear and well-lit.");
      }
    } catch (err) {
      setCaptureError("Error scanning photo — try again with a clearer photo.");
    } finally {
      setCapturingPhoto(false);
      setOcrProgressMsg("");
    }
  };



  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col justify-between p-3 sm:p-4 font-sans select-none overflow-x-hidden">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between space-y-3">
        {/* Top Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-black text-xs text-white tracking-wide">MedTrack Wireless Scanner</h1>
                <p className="text-[10px] text-slate-400 font-medium">
                  {sessionId ? `Session #${sessionId}` : "Not Connected"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold">
              <Wifi className="w-3 h-3 animate-pulse text-teal-400" />
              <span>{paired ? "CONNECTED TO DESKTOP" : "CONNECTING..."}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Main Camera & Photo Scanner Area */}
        <div className="flex-1 my-2 flex flex-col justify-center items-center w-full space-y-3">
          <div className="w-full p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-xs font-bold text-teal-400">Mobile Photo Scanner</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Auto Barcode & AI OCR</span>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePickedFile}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickedFile}
              />
              <button
                type="button"
                onClick={() => {
                  try { sessionStorage.setItem(PENDING_CAPTURE_KEY, Date.now().toString()); } catch (err) { }
                  nativeCameraInputRef.current?.click();
                }}
                disabled={capturingPhoto}
                className="py-4 px-3 bg-teal-600 hover:bg-teal-500 border border-teal-500/50 text-white text-xs font-extrabold rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 shadow-lg"
              >
                <Camera className="w-6 h-6 text-white" />
                <span>Phone Camera App</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try { sessionStorage.setItem(PENDING_CAPTURE_KEY, Date.now().toString()); } catch (err) { }
                  galleryInputRef.current?.click();
                }}
                disabled={capturingPhoto}
                className="py-4 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-extrabold rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 shadow-lg"
              >
                <QrCode className="w-6 h-6 text-teal-400" />
                <span>Choose from Gallery</span>
              </button>
            </div>

            {ocrProgressMsg && (
              <div className="p-3 rounded-xl bg-teal-950/80 border border-teal-700/60 text-teal-300 text-xs font-semibold text-center animate-pulse flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span>{ocrProgressMsg}</span>
              </div>
            )}

            {captureError && (
              <p className="text-[11px] text-rose-400 font-medium text-center">{captureError}</p>
            )}
          </div>

          {/* Scanned Result Preview & Direct Send to Dashboard Button */}
          {scannedPreview && (
            <div className="w-full p-4 rounded-3xl bg-teal-950/90 border border-teal-500/50 space-y-3 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal-300 font-bold">
                  {scannedPreview.type === "barcode" ? "BARCODE DETECTED" : "MEDICINE NAME EXTRACTED"}
                </span>
                <span className="text-[10px] bg-teal-800/80 text-teal-200 px-2 py-0.5 rounded-full font-mono">
                  Ready to send
                </span>
              </div>

              <div className="p-3 bg-slate-900/90 border border-teal-800/80 rounded-2xl font-mono text-sm text-teal-200 font-extrabold truncate">
                {scannedPreview.display}
              </div>

              <button
                type="button"
                onClick={() => handlePhoneScan(scannedPreview.sendValue)}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>🚀 Send to Desktop POS / Dashboard</span>
              </button>
            </div>
          )}

          {/* Sent Confirmation Status Box */}
          <div className="w-full h-12 mt-2 flex items-center justify-center">
            {lastScanned ? (
              <div className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-2xl border border-emerald-400 shadow-xl flex items-center justify-between text-xs transition-all">
                <div className="flex items-center gap-2 font-mono font-bold truncate">
                  <Zap className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                  <span className="truncate">Sent to Desktop: {lastScanned}</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                <span>Take photo or scan to send item to Desktop POS</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Barcode Entry Section */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Manual Barcode Entry
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter barcode e.g. 8901296060667..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (manualCode.trim()) {
                    setScannedPreview({ type: "barcode", display: manualCode.trim(), sendValue: manualCode.trim() });
                    handlePhoneScan(manualCode);
                    setManualCode("");
                  }
                }
              }}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  setScannedPreview({ type: "barcode", display: manualCode.trim(), sendValue: manualCode.trim() });
                  handlePhoneScan(manualCode);
                  setManualCode("");
                }
              }}
              disabled={loading || !manualCode.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemoteScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
            <span className="text-xs font-bold">Loading MedTrack Scanner...</span>
          </div>
        </div>
      }
    >
      <RemoteScanClient />
    </Suspense>
  );
}