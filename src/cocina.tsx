/**
 * Entry point para la aplicación de COCINA (pantalla de comandas)
 * Esta aplicación se despliega en la pantalla de la brigada de cocina
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import CommandApp from './commandpage/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommandApp />
  </StrictMode>,
);
