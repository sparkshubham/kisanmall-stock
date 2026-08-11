import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const F = Html5QrcodeSupportedFormats;

const BARCODE_TYPES = [
  {
    id: 'all',
    label: 'All barcodes',
    formats: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.QR_CODE],
  },
  { id: 'ean', label: 'EAN-13', formats: [F.EAN_13, F.EAN_8] },
  { id: 'code128', label: 'Code 128', formats: [F.CODE_128, F.CODE_39] },
  { id: 'upc', label: 'UPC', formats: [F.UPC_A, F.UPC_E] },
  { id: 'qr', label: 'QR code', formats: [F.QR_CODE] },
];

const CAMERA_KEY = 'kisan-scan-camera';
const TYPE_KEY = 'kisan-scan-type';

async function stopScanner(scanner) {
  if (!scanner) return;
  try {
    const state = scanner.getState?.();
    if (state === 2 || state === 3) await scanner.stop();
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
    return 'Camera needs HTTPS. Open the site on your phone using the https link.';
  }
  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(msg)) {
    return 'Camera blocked. Tap the lock icon → Allow Camera → Retry.';
  }
  if (name === 'NotFoundError' || /requested device not found|no camera|notfound/i.test(msg)) {
    return 'No camera found. Use a phone, or tap Scan photo.';
  }
  if (name === 'NotReadableError' || /could not start video|in use|notreadable/i.test(msg)) {
    return 'Camera is busy. Close other camera apps and retry.';
  }
  return msg ? `Camera error: ${msg}` : 'Camera unavailable. Try Scan photo or type the barcode.';
}

function rankCameras(cameras) {
  return [...cameras].sort((a, b) => {
    const score = (c) => (/back|rear|environment|world/i.test(c.label || '') ? 0 : 1);
    return score(a) - score(b);
  });
}

function formatsFor(typeId) {
  return BARCODE_TYPES.find((t) => t.id === typeId)?.formats || BARCODE_TYPES[0].formats;
}

export default function BarcodeCameraScanner({ onDetected, active = true }) {
  const reactId = useId().replace(/:/g, '');
  const elementId = `barcode-reader-${reactId}`;
  const fileRef = useRef(null);
  const scannerRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Tap Open Camera, or Scan photo');
  const [detail, setDetail] = useState('');
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(() => localStorage.getItem(CAMERA_KEY) || '');
  const [barcodeType, setBarcodeType] = useState(() => localStorage.getItem(TYPE_KEY) || 'ean');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoom, setZoom] = useState(1.6);

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
      setMessage('Tap Open Camera, or Scan photo');
      setTorchOn(false);
    }
  }, [active]);

  const emitCode = useCallback((decodedText) => {
    if (!mountedRef.current || lockRef.current) return;
    const code = String(decodedText || '').trim();
    if (!code) return;
    lockRef.current = true;
    onDetectedRef.current?.(code);
  }, []);

  const readCapabilities = useCallback(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const caps = scanner.getRunningTrackCapabilities?.() || {};
      setTorchSupported(Boolean(caps.torch));
    } catch {
      setTorchSupported(false);
    }
  }, []);

  const startWithCamera = useCallback(
    async (preferredId, typeId = barcodeType) => {
      if (!active || startingRef.current) return;
      startingRef.current = true;
      setStatus('starting');
      setMessage('Requesting camera permission…');
      setDetail('');
      setTorchOn(false);
      lockRef.current = false;

      await stopScanner(scannerRef.current);
      scannerRef.current = null;
      await new Promise((r) => setTimeout(r, 50));

      if (!document.getElementById(elementId) || !navigator.mediaDevices?.getUserMedia) {
        startingRef.current = false;
        setStatus('error');
        setMessage('This browser cannot open the camera. Use Scan photo instead.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        startingRef.current = false;
        setStatus('error');
        setMessage(explainError(err));
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
        fps: 16,
        qrbox: (w, h) => ({
          width: Math.max(220, Math.min(Math.floor(w * 0.92), 360)),
          height: Math.max(90, Math.min(Math.floor(h * 0.34), 150)),
        }),
        aspectRatio: 3 / 4,
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
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
            formatsToSupport: formatsFor(typeId),
            verbose: false,
          });
          scannerRef.current = scanner;
          await scanner.start(target, config, emitCode, () => {});
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
          setMessage('Hold barcode inside the box. Use zoom if it is small.');
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
      setDetail('If live camera fails, tap Scan photo — that works on most phones.');
    },
    [active, barcodeType, elementId, emitCode, readCapabilities]
  );

  const changeType = useCallback(
    async (nextType) => {
      setBarcodeType(nextType);
      localStorage.setItem(TYPE_KEY, nextType);
      if (status === 'ready') {
        await startWithCamera(cameraId, nextType);
      }
    },
    [status, cameraId, startWithCamera]
  );

  const switchCamera = useCallback(
    async (nextId) => {
      if (!nextId || nextId === cameraId) return;
      localStorage.setItem(CAMERA_KEY, nextId);
      setCameraId(nextId);
      await startWithCamera(nextId, barcodeType);
    },
    [cameraId, barcodeType, startWithCamera]
  );

  const flipCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const idx = Math.max(0, cameras.findIndex((c) => c.id === cameraId));
    await switchCamera(cameras[(idx + 1) % cameras.length].id);
  }, [cameras, cameraId, switchCamera]);

  const toggleTorch = useCallback(async () => {
    const next = !torchOn;
    setTorchOn(next);
    try {
      await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: next }] });
    } catch {
      setTorchOn(!next);
    }
  }, [torchOn]);

  const scanPhoto = useCallback(
    async (file) => {
      if (!file) return;
      setStatus('starting');
      setMessage('Reading barcode from photo…');
      setDetail('');
      lockRef.current = false;
      await stopScanner(scannerRef.current);
      scannerRef.current = null;

      try {
        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: formatsFor(barcodeType),
          verbose: false,
        });
        scannerRef.current = scanner;
        const result = await scanner.scanFileV2(file, true);
        const text = result?.decodedText || result;
        if (!text) throw new Error('No barcode found');
        emitCode(text);
      } catch (err) {
        setStatus('error');
        setMessage('No barcode found in that photo. Try a closer, brighter picture or another barcode type.');
        setDetail(String(err?.message || ''));
        await stopScanner(scannerRef.current);
        scannerRef.current = null;
      }
    },
    [barcodeType, elementId, emitCode]
  );

  if (!active) return null;

  return (
    <div className="barcode-scanner">
      <div className="barcode-type-row">
        {BARCODE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`camera-chip ${barcodeType === t.id ? 'is-on' : ''}`}
            onClick={() => changeType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`scan-frame ${status === 'ready' ? 'is-live' : ''}`}
        style={{ '--scan-zoom': zoom }}
      >
        <div id={elementId} className="barcode-reader-el" />
        {status !== 'ready' && (
          <div className="scan-overlay-msg">
            <div>{status === 'starting' ? 'Opening…' : message}</div>
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
                  Flip
                </button>
              )}
              {torchSupported && (
                <button type="button" className={`camera-chip ${torchOn ? 'is-on' : ''}`} onClick={toggleTorch}>
                  {torchOn ? 'Light on' : 'Light'}
                </button>
              )}
              <button type="button" className="camera-chip" onClick={() => setZoom((z) => Math.max(1, +(z - 0.3).toFixed(1)))}>
                −
              </button>
              <button type="button" className="camera-chip" onClick={() => setZoom((z) => Math.min(4, +(z + 0.3).toFixed(1)))}>
                +
              </button>
            </div>
            <label className="camera-zoom">
              Zoom {zoom.toFixed(1)}x
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
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

      <div className="camera-controls-row" style={{ marginTop: '0.65rem' }}>
        {(status === 'error' || status === 'idle') && (
          <button type="button" className="btn" onClick={() => startWithCamera()}>
            {status === 'error' ? 'Retry Camera' : 'Open Camera'}
          </button>
        )}
        <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>
          Scan photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) scanPhoto(file);
          }}
        />
      </div>

      <p className="scan-hint">
        {status === 'ready'
          ? message
          : status === 'starting'
            ? 'Allow camera when asked…'
            : message}
      </p>
      {detail && (
        <p className="scan-hint" style={{ fontSize: '0.8rem' }}>
          {detail}
        </p>
      )}
    </div>
  );
}

export { stopScanner };
