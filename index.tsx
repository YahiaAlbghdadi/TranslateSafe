import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Intercept popup-save before React mounts — sends BroadcastChannel message
// to the already-open TranslateSafe tab and closes the window in ~50ms.
if (window.name === 'ts-save') {
  const params = new URLSearchParams(location.search);
  const raw = params.get('ts_save');
  if (raw) {
    try {
      const card = JSON.parse(decodeURIComponent(raw));
      const bc = new BroadcastChannel('ts-save');
      bc.postMessage({ type: 'save', card });
      setTimeout(() => { bc.close(); window.close(); }, 50);
    } catch {
      window.close();
    }
  } else {
    window.close();
  }
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Could not find root element to mount to');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
