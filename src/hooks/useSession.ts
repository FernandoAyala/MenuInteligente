/**
 * Hook para cargar y sincronizar la sesión de chat desde Firestore
 */

import { useEffect, useState } from 'react';
import type { ConversationSession } from '../models/session.model';

export interface UseSessionReturn {
  session: ConversationSession | null;
  loading: boolean;
  error: string | null;
  cartItems: any[];
  messages: any[];
}

/**
 * Hook para cargar una sesión existente desde Firestore
 */
export const useSession = (sessionId: string | null): UseSessionReturn => {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        // Usar la API REST del backend en lugar de Firestore directamente
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setSession(data);
        console.log('✅ Sesión cargada:', sessionId, data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar sesión';
        setError(errorMessage);
        console.error('❌ Error cargando sesión:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Transformar cartItems para el formato del frontend
  const cartItems = session?.cart.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions,
  })) || [];

  // Transformar mensajes para el formato del frontend
  const messages = session?.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  })) || [];

  return {
    session,
    loading,
    error,
    cartItems,
    messages,
  };
};

/**
 * Obtener sessionId desde URL o localStorage
 */
export const getSessionIdFromUrl = (): string | null => {
  // 1. Intentar obtener de URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get('sessionId');
  
  if (urlSessionId) {
    // Guardar en localStorage para futuras visitas
    localStorage.setItem('sessionId', urlSessionId);
    return urlSessionId;
  }

  // 2. Intentar obtener de localStorage
  const storedSessionId = localStorage.getItem('sessionId');
  return storedSessionId;
};
