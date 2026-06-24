'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onScan: (value: string) => void;
}

export function QrScanner({ onScan }: Props) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5Qrcode']> | null>(null);

  const start = async () => {
    setError('');
    const { Html5Qrcode } = await import('html5-qrcode');
    if (!containerRef.current) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stop();
        },
        undefined,
      );
      setActive(true);
    } catch {
      setError('Camera access denied or not available.');
      setActive(false);
    }
  };

  const stop = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setActive(false);
  };

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="space-y-3">
      <div
        id="qr-reader"
        ref={containerRef}
        className={active ? 'overflow-hidden rounded-lg border border-gray-200' : 'hidden'}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        type="button"
        variant={active ? 'outline' : 'default'}
        className="w-full"
        onClick={active ? stop : start}
      >
        {active ? (
          <><CameraOff className="mr-2 h-4 w-4" /> Stop Camera</>
        ) : (
          <><Camera className="mr-2 h-4 w-4" /> Scan QR Code</>
        )}
      </Button>
    </div>
  );
}
