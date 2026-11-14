// Streepjescode scannen met de camera. Gebruikt de ingebouwde BarcodeDetector (Chrome/Android)
// en valt terug op ZXing. Camera werkt alleen via https of localhost.

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  }
}

export function Scanner({ onResult }: { onResult: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopZxing: (() => void) | null = null;
    let cancelled = false; // scherm al gesloten terwijl de camera nog opstartte
    const finish = (code: string) => {
      if (done.current) return;
      done.current = true;
      navigator.vibrate?.(40);
      onResult(code);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera niet beschikbaar. Open de app via https (of localhost) en geef cameratoegang.');
        return;
      }
      try {
        if (window.BarcodeDetector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          const v = video.current!;
          v.srcObject = stream;
          await v.play();
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] });
          const loop = async () => {
            if (done.current) return;
            try {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) return finish(codes[0].rawValue);
            } catch {
              /* frame nog niet klaar */
            }
            raf = requestAnimationFrame(loop);
          };
          loop();
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (res) => {
            if (res) finish(res.getText());
          });
          stopZxing = () => controls.stop();
          if (cancelled) controls.stop();
        }
      } catch (e) {
        setError((e as Error).name === 'NotAllowedError' ? 'Geen toestemming voor de camera. Sta het toe in je browserinstellingen.' : 'Camera starten lukte niet.');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      stopZxing?.();
    };
  }, [onResult]);

  if (error) return <p className="banner">{error}</p>;
  return (
    <div className="video-frame">
      <video ref={video} muted playsInline />
      <div className="aim" aria-hidden />
    </div>
  );
}
