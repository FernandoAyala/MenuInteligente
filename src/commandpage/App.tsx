import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Prueba from './componentsCommand/Prueba';

// Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function Admin() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="admin">
        <Prueba />
      </div>
    </QueryClientProvider>
  );
}

export default Admin;