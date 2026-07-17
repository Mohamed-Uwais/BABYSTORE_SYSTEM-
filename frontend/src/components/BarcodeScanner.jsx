import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Standard 1D product barcodes + QR. Restricting formats speeds up decoding and
// avoids false reads from formats we don't use.
const SUPPORTED_FORMATS = [
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

const REGION_ID = 'barcode-scanner-region';

/**
 * Full-control camera barcode scanner in a design-system modal.
 * Props:
 *   title       - modal heading
 *   hint        - small helper line under the title
 *   onDetected  - (decodedText) => void. Called once per successful scan.
 *   onClose     - () => void
 *
 * The parent stays mounted and decides what to do on each scan (add to cart,
 * fill a field, etc.) and whether to keep the modal open for more scans.
 */
export default function BarcodeScanner({ title = 'Scan barcode', hint, onDetected, onClose, children }) {
  const scannerRef = useRef(null);
  const runningRef = useRef(false);
  const lastScanRef = useRef({ text: '', at: 0 });

  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState('');
  const [status, setStatus] = useState('starting'); // starting | scanning | denied | error | no-camera
  const [errorMsg, setErrorMsg] = useState('');
  const [lastRead, setLastRead] = useState(''); // last raw decoded value - helps confirm the decoder is working

  // Enumerate cameras once (this call also triggers the permission prompt).
  useEffect(() => {
    let cancelled = false;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (cancelled) return;
        if (!devices || devices.length === 0) {
          setStatus('no-camera');
          return;
        }
        setCameras(devices);
        // Prefer a back/environment camera when present (some touch laptops have two).
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        setActiveCamera((back || devices[devices.length - 1]).id);
      })
      .catch((err) => {
        if (cancelled) return;
        const denied = /permission|NotAllowed|denied/i.test(err?.message || String(err));
        setStatus(denied ? 'denied' : 'error');
        setErrorMsg(denied ? '' : err?.message || 'Could not access the camera');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Start/stop the stream whenever the chosen camera changes.
  useEffect(() => {
    if (!activeCamera) return undefined;
    let stopped = false;

    const scanOpts = { formatsToSupport: SUPPORTED_FORMATS, verbose: false };

    const config = {
      fps: 10,
      qrbox: (viewW, viewH) => {
        const width = Math.floor(viewW * 0.92);
        const height = Math.floor(Math.min(viewH * 0.55, 200));
        return { width, height };
      },
    };

    function handleSuccess(decodedText) {
      setLastRead(decodedText);
      const now = Date.now();
      if (decodedText === lastScanRef.current.text && now - lastScanRef.current.at < 1500) return;
      lastScanRef.current = { text: decodedText, at: now };
      onDetected?.(decodedText);
    }

    // Each attempt gets a FRESH Html5Qrcode instance because a failed start()
    // leaves the internal state machine stuck in "transitioning" and rejects
    // any subsequent start() on the same object.
    const startAttempts = [
      { deviceId: { exact: activeCamera }, width: { ideal: 1280 }, height: { ideal: 720 } },
      activeCamera,
      { facingMode: 'user' },
      { facingMode: 'environment' },
    ];

    async function begin() {
      for (let i = 0; i < startAttempts.length; i++) {
        if (stopped) return;
        const s = new Html5Qrcode(REGION_ID, scanOpts);
        try {
          await s.start(startAttempts[i], config, handleSuccess, undefined);
          if (stopped) {
            s.stop().catch(() => {});
            return;
          }
          scannerRef.current = s;
          runningRef.current = true;
          setStatus('scanning');
          return;
        } catch (err) {
          // Clean up the failed instance's DOM before creating the next one.
          try { s.clear(); } catch (_) {}
          if (stopped) return;
          const denied = /permission|NotAllowed|denied/i.test(err?.message || String(err));
          if (denied) {
            setStatus('denied');
            return;
          }
          if (i === startAttempts.length - 1) {
            setStatus('error');
            setErrorMsg(`Camera failed: ${err?.message || String(err)}`);
          }
        }
      }
    }

    begin();

    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s && runningRef.current) {
        runningRef.current = false;
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [activeCamera, onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* Camera viewport - html5-qrcode injects the <video> here. Fixed min-height so
              status/error text is always visible even before any video is mounted. */}
          <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-slate-900">
            <div id={REGION_ID} className="w-full [&_video]:!w-full [&_video]:!rounded-xl" />

            {status !== 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                {status === 'starting' && (
                  <p className="text-sm text-slate-300">Requesting camera access…</p>
                )}
                {status === 'denied' && (
                  <p className="text-sm text-slate-200">
                    Camera permission was blocked. Allow camera access in your browser, or just close this and
                    use manual search instead.
                  </p>
                )}
                {status === 'no-camera' && (
                  <p className="text-sm text-slate-200">No camera found on this device. Use manual search instead.</p>
                )}
                {status === 'error' && (
                  <p className="text-sm text-slate-200">{errorMsg || 'Camera error.'} You can still use manual search.</p>
                )}
              </div>
            )}
          </div>

          {status === 'scanning' && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Hold the barcode flat and steady, filling the box. Good light helps.
            </p>
          )}

          {lastRead && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Last read: <span className="font-mono text-slate-600">{lastRead}</span>
            </p>
          )}

          {/* Per-context feedback (e.g. "Added to cart" / "Not recognized") */}
          {children}

          {cameras.length > 1 && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-500">Camera</label>
              <select
                value={activeCamera}
                onChange={(e) => setActiveCamera(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
              >
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
