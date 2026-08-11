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

const CAMERA_KEY = 'kisan-scan-camera';

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

function rankCameras(cameras) {
  return [...cameras].sort((a, b) => {
    const score = (c) => (/back|rear|environment|world/i.test(c.label || '') ? 0 : 1);
    return score(a) - score(b);
  });
}

export default function BarcodeCameraScanner({ onDetected, active = true }) {
  const reactId = useId().replace(/:/g, '');
  const elementId = `barcode-reader-${reactId}`;
  const scannerRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Tap Open Camera to scan');
  const [detail, setDetail] = useState('');
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(() => localStorage.getItem(CAMERA_KEY) || '');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState(null);

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
      setTorchOn(false);
    }
  }, [active]);

  const readCapabilities = useCallback(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const caps = scanner.getRunningTrackCapabilities?.() || {};
      const settings = scanner.getRunningTrackSettings?.() || {};
      const torchOk = Boolean(caps.torch);
      setTorchSupported(torchOk);
      if (caps.zoom && typeof caps.zoom.min === 'number') {
        setZoomRange({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
        });
        setZoom(Number(settings.zoom) || caps.zoom.min || 1);
      } else {
        setZoomRange(null);
      }
    } catch {
      setTorchSupported(false);
      setZoomRange(null);
    }
  }, []);

  const applyConstraint = useCallback(async (partial) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints(partial);
    } catch {
      /* some browsers reject advanced constraints */
    }
  }, []);

  const startWithCamera = useCallback(
    async (preferredId) => {
      if (!active || startingRef.current) return;
      startingRef.current = true;

      setStatus('starting');
      setMessage('Requesting camera permission…');
      setDetail('');
      setTorchOn(false);
      lockRef.current = false;

      await stopScanner(scannerRef.current);
      scannerRef.current = null;

      await new Promise((r) => setTimeout(r, 60));
      if (!document.getElementById(elementId)) {
        startingRef.current = false;
        setStatus('error');
        setMessage('Scanner area not ready. Tap Retry.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        startingRef.current = false;
        setStatus('error');
        setMessage('This browser does not support camera access.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        startingRef.current = false;
        setStatus('error');
        setMessage(explainError(err));
        setDetail(`URL: ${window.location.origin}`);
        return;
      }

      let available = [];
      try {
        available = rankCameras(await Html5Qrcode.getCameras());
        if (mountedRef.current) setCameras(available);
      } catch {
        available = [];
      }

      const saved = preferredId || localStorage.getItem(CAMERA_KEY) || '';
      const targets = [];
      if (saved && available.some((c) => c.id === saved)) targets.push(saved);
      available.forEach((c) => {
        if (!targets.includes(c.id)) targets.push(c.id);
      });
      targets.push({ facingMode: 'environment' }, { facingMode: 'user' });

      const config = {
        fps: 12,
        qrbox: (w, h) => ({
          width: Math.max(180, Math.min(300, Math.floor(w * 0.88))),
          height: Math.max(70, Math.min(120, Math.floor(h * 0.3))),
        }),
        rememberLastUsedCamera: true,
        aspectRatio: 3 / 4,
      };

      const onSuccess = (decodedText) => {
        if (!mountedRef.current || lockRef.current) return;
        const code = String(decodedText || '').trim();
        if (!code) return;
        lockRef.current = true;
        onDetectedRef.current?.(code);
      };

      let lastError = null;
      for (const target of targets) {
        if (!mountedRef.current) {
          startingRef.current = false;
          return;
        }
        await stopScanner(scannerRef.current);
        scannerRef.current = null;
        if (!document.getElementById(elementId)) break;

        try {
          const scanner = new Html5Qrcode(elementId, {
            formatsToSupport: BARCODE_FORMATS,
            verbose: false,
          });
          scannerRef.current = scanner;
          await scanner.start(target, config, onSuccess, () => {});
          if (!mountedRef.current) {
            await stopScanner(scanner);
            startingRef.current = false;
            return;
          }
          const usedId = typeof target === 'string' ? target : scanner.getRunningTrackSettings?.()?.deviceId;
          if (usedId) {
            setCameraId(usedId);
            localStorage.setItem(CAMERA_KEY, usedId);
          }
          setStatus('ready');
          setMessage('Point camera at product barcode');
          setDetail('');
          readCapabilities();
          startingRef.current = false;
          return;
        } catch (err) {
          lastError = err;
        }
      }

      startingRef.current = false;
      if (!mountedRef.current) return;
      setStatus('error');
      setMessage(explainError(lastError));
      setDetail(`Tried ${targets.length} camera option(s).`);
    },
    [active, elementId, readCapabilities]
  );

  const switchCamera = useCallback(
    async (nextId) => {
      if (!nextId || nextId === cameraId) return;
      localStorage.setItem(CAMERA_KEY, nextId);
      setCameraId(nextId);
      await startWithCamera(nextId);
    },
    [cameraId, startWithCamera]
  );

  const flipCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === cameraId);
    const next = cameras[(idx + 1) % cameras.length];
    if (next) await switchCamera(next.id);
  }, [cameras, cameraId, switchCamera]);

  const toggleTorch = useCallback(async () => {
    const next = !torchOn;
    setTorchOn(next);
    await applyConstraint({ advanced: [{ torch: next }] });
  }, [torchOn, applyConstraint]);

  const changeZoom = useCallback(
    async (value) => {
      const next = Number(value);
      setZoom(next);
      await applyConstraint({ advanced: [{ zoom: next }] });
    },
    [applyConstraint]
  );

  if (!active) return null;

  return (
    <div className="barcode-scanner">
      <div className={`scan-frame ${status === 'ready' ? 'is-live' : ''}`}>
        <div id={elementId} className="barcode-reader-el" />
        {status !== 'ready' && (
          <div className="scan-overlay-msg">
            <div>{status === 'starting' ? 'Opening camera…' : message}</div>
            {status === 'idle' && (
              <button type="button" className="btn" style={{ marginTop: '1rem' }} onClick={() => startWithCamera()}>
                Open Camera
              </button>
            )}
          </div>
        )}
        {status === 'ready' && <div className="scan-guide" aria-hidden />}

        {status === 'ready' && (
          <div className="camera-controls">
            <div className="camera-controls-row">
              {cameras.length > 1 && (
                <button type="button" className="camera-chip" onClick={flipCamera}>
                  Flip camera
                </button>
              )}
              {torchSupported && (
                <button
                  type="button"
                  className={`camera-chip ${torchOn ? 'is-on' : ''}`}
                  onClick={toggleTorch}
                >
                  {torchOn ? 'Light on' : 'Light'}
                </button>
              )}
            </div>
            {zoomRange && (
              <label className="camera-zoom">
                Zoom
                <input
                  type="range"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  value={zoom}
                  onChange={(e) => changeZoom(e.target.value)}
                />
              </label>
            )}
          </div>
        )}
      </div>

      {status === 'ready' && cameras.length > 0 && (
        <label className="camera-select">
          Camera
          <select value={cameraId} onChange={(e) => switchCamera(e.target.value)}>
            {cameras.map((cam, i) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

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
        <button type="button" className="btn block" onClick={() => startWithCamera()}>
          {status === 'error' ? 'Retry Camera' : 'Open Camera'}
        </button>
      )}
    </div>
  );
}

export { stopScanner };
