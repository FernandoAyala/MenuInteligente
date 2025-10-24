import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

// Importar el componente correcto según el modo
const isAdmin = import.meta.env.MODE === "admin";

// Cargar dinámicamente el componente correcto
if (isAdmin) {
  import('./commandpage/App.tsx').then(({ default: AdminApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AdminApp />
      </StrictMode>,
    );
  });
} else {
  import('./App.tsx').then(({ default: ClientApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ClientApp />
      </StrictMode>,
    );
  });
}