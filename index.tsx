import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './components/Toast';
import App from './App';

// Lazy load Vercel analytics to prevent errors when blocked by adblockers
const Analytics = lazy(() => 
  import('@vercel/analytics/react')
    .then(mod => ({ default: mod.Analytics }))
    .catch(() => ({ default: () => null }))
);

const SpeedInsights = lazy(() => 
  import('@vercel/speed-insights/react')
    .then(mod => ({ default: mod.SpeedInsights }))
    .catch(() => ({ default: () => null }))
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <ToastProvider>
      <App />
      </ToastProvider>
    </SettingsProvider>
    <Suspense fallback={null}>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  </React.StrictMode>
);
