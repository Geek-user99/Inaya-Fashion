import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 560, margin: '3rem auto' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Inaya Fashion</h1>
          <p style={{ marginTop: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
            Something went wrong while loading the page. Please refresh your browser.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
