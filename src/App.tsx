import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatContainer from './components/ChatContainer';
import './styles/globals.css';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <ChatContainer />
      </div>
    </QueryClientProvider>
  );
}

export default App;