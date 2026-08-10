import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

async function stopScanner(scanner) {
  if (!scanner) return;
  try {
    const state = scanner.getState?.();
    if (state === 2 || state === 3) {
      await scanner.stop();
    }
  } catch {
    /* ignore */
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

function explainError(err) {
  const msg = String(err?.message || err || '');
  const name = String(err?.name || '');

  if (!window.isSecureContext) {
    return 'Camera needs HTTPS or localhost. Open https://localhost:5173 (accept the certificate warning).';
  }
  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(msg)) {
    return 'Camera permission denied. Tap the lock icon in the address bar → allow Camera → Retry.';
  }
  if (name === 'NotFoundError' || /requested device not found|no camera|notfound/i.test(msg)) {
    return 'No camera found on this device. Use a phone, or plug in a webcam.';
  }
  if (name === 'NotReadableError' || /could not start video|in use|notreadable/i.test(msg)) {
    return 'Camera is busy (used by another app). Close Zoom/Teams/other camera apps and retry.';
  }
  return msg ? `Camera error: ${msg}` : 'Camera unavailable. Use manual entry or Retry.';
}

export default function BarcodeCameraScanner({ onDetected, active = true }) {
  const reactId = useId().replace(/:/g, '');
  const elementId = `barcode-reader-${reactId}`;
  const scannerRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Tap Open Camera to scan');
  const [detail, setDetail] = useState('');

  onDetectedRef.current = onDetected;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      stopScanner(s);
    };
  }, []);

  useEffect(() => {
    if (!active && scannerRef.current) {
      const s = scannerRef.current;
      scannerRef.current = null;
      stopScanner(s);
      setStatus('idle');
      setMessage('Tap Open Camera to scan');
    }
  }, [active]);

  const startCamera = useCallback(async () => {
    if (!active) return;

    setStatus('starting');
    setMessage('Requesting camera permission…');
    setDetail('');
    lockRef.current = false;

    await stopScanner(scannerRef.current);
    scannerRef.current = null;

    await new Promise((r) => setTimeout(r, 80));
    if (!document.getElementById(elementId)) {
      setStatus('error');
      setMessage('Scanner area not ready. Tap Retry.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setMessage('This browser does not support camera access.');
      return;
    }

    // Unlock permission under user tap
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      setStatus('error');
      setMessage(explainError(err));
      setDetail(`URL: ${window.location.origin}`);
      return;
    }

    const config = {
      fps: 10,
      qrbox: (w, h) => ({
        width: Math.max(180, Math.min(280, Math.floor(w * 0.85))),
        height: Math.max(70, Math.min(110, Math.floor(h * 0.28))),
      }),
      rememberLastUsedCamera: true,
    };

    const onSuccess = (decodedText) => {
      if (!mountedRef.current || lockRef.current) return;
      const code = String(decodedText || '').trim();
      if (!code) return;
      lockRef.current = true;
      onDetectedRef.current?.(code);
    };

    const cameraTargets = [];
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras?.length) {
        const ranked = [...cameras].sort((a, b) => {
          const score = (c) => (/back|rear|environment|world/i.test(c.label || '') ? 0 : 1);
          return score(a) - score(b);
        });
        ranked.forEach((c) => cameraTargets.push(c.id));
      }
    } catch {
      /* ignore */
    }
    cameraTargets.push({ facingMode: 'environment' }, { facingMode: 'user' });

    let lastError = null;
    for (const target of cameraTargets) {
      if (!mountedRef.current) return;
      await stopScanner(scannerRef.current);
      scannerRef.current = null;

      if (!document.getElementById(elementId)) {
        lastError = new Error('Scanner element missing');
        break;
      }

      try {
        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: BARCODE_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(target, config, onSuccess, () => {});
        if (!mountedRef.current) {
          await stopScanner(scanner);
          return;
        }
        setStatus('ready');
        setMessage('Point camera at product barcode');
        setDetail('');
        return;
      } catch (err) {
        lastError = err;
      }
    }

    if (!mountedRef.current) return;
    setStatus('error');
    setMessage(explainError(lastError));
    setDetail(`Tried ${cameraTargets.length} camera option(s). URL: ${window.location.origin}`);
  }, [active, elementId]);

  if (!active) return null;

  return (
    <div className="barcode-scanner">
      <div className={`scan-frame ${status === 'ready' ? 'is-live' : ''}`}>
        <div id={elementId} className="barcode-reader-el" />
        {status !== 'ready' && (
          <div className="scan-overlay-msg">
            <div>{status === 'starting' ? 'Opening camera…' : message}</div>
            {status === 'idle' && (
              <button type="button" className="btn" style={{ marginTop: '1rem' }} onClick={startCamera}>
                Open Camera
              </button>
            )}
          </div>
        )}
        {status === 'ready' && <div className="scan-guide" aria-hidden />}
      </div>

      <p className="scan-hint">
        {status === 'ready'
          ? message
          : status === 'starting'
            ? 'Please allow camera access when prompted…'
            : message}
      </p>
      {detail && (
        <p className="scan-hint" style={{ fontSize: '0.8rem' }}>
          {detail}
        </p>
      )}

      {(status === 'error' || status === 'idle') && (
        <button type="button" className="btn block" onClick={startCamera}>
          {status === 'error' ? 'Retry Camera' : 'Open Camera'}
        </button>
      )}
    </div>
  );
}

export { stopScanner };
