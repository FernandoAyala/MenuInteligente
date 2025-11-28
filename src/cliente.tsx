/**
 * Entry point para la aplicación de CLIENTES (tablets de mesas)
 * Esta aplicación se despliega en las tablets que usan los comensales
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
