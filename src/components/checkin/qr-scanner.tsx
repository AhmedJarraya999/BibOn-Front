'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { createPortal } from 'react-dom';

function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface Props {
  onScan: (value: string) => void;
  onClose?: () => void;
}

function ScannerModal({ onScan, onClose }: Props) {
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const init = async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-modal-reader');
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            onScan(decoded);
            handleClose();
          },
          undefined,
        );
        setReady(true);
      } catch {
        setError('Camera access denied. Please allow camera and try again.');
      }
    };

    init();

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleClose = () => {
    scannerRef.current?.stop().catch(() => {});
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 z-10">
        <div className="flex items-center gap-2 text-white">
          <Camera className="h-5 w-5" />
          <span className="font-semibold text-lg">Scan QR Code</span>
        </div>
        <button
          onClick={handleClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Camera view */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
        <div
          id="qr-modal-reader"
          className="w-full h-full"
          style={{ maxHeight: '100vh' }}
        />

        {/* Targeting overlay */}
        {ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-red-400 opacity-80 animate-scan" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 flex flex-col items-center gap-2">
        {error ? (
          <p className="text-red-400 text-sm font-medium">{error}</p>
        ) : (
          <p className="text-white/60 text-sm">Point the camera at the participant's QR code</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function QrScanner({ onScan, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const mounted = useIsMounted();

  if (!open || !mounted) return null;

  return (
    <ScannerModal
      onScan={onScan}
      onClose={() => { setOpen(false); onClose?.(); }}
    />
  );
}
