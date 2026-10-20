import { Component, lazy, Suspense } from 'react';

const Scanner = lazy(() => import('./BarcodeScanner'));

// Keep Billing and its cart mounted even if the optional camera chunk fails to load.
class ScannerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('[SCANNER_LOAD_ERROR]', error.name); }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function LazyBarcodeScanner(props) {
  const fallback = message => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Barcode scanner">
      <div className="rounded-xl bg-white p-6 text-slate-600">
        <p role="status">{message}</p>
        <button type="button" className="mt-4 underline" onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
  return (
    <ScannerBoundary fallback={fallback('Camera scanner could not load. Close this window and use barcode entry.')}>
      <Suspense fallback={fallback('Loading camera scanner...')}><Scanner {...props} /></Suspense>
    </ScannerBoundary>
  );
}
