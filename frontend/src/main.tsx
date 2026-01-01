import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastHost } from './components/Feedback/ToastHost';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
        <ToastHost />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
