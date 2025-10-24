import { useCallback, useEffect, useState } from 'react';

interface TextToSpeechHook {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;
  setRate: (rate: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const useTextToSpeech = (): TextToSpeechHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1); // Velocidad (0.1 - 10)
  const [pitch, setPitch] = useState(1); // Tono (0 - 2)
  const [volume, setVolume] = useState(1); // Volumen (0 - 1)

  // Cargar voces disponibles
  const loadVoices = useCallback(() => {
    if (typeof speechSynthesis === 'undefined') {
      console.warn('speechSynthesis no está disponible');
      return;
    }
    
    const availableVoices = speechSynthesis.getVoices();
    console.log('🎤 Voces disponibles:', availableVoices.length);
    setVoices(availableVoices);
    
    // Buscar voz en español como predeterminada
    const spanishVoice = availableVoices.find(voice => 
      voice.lang.startsWith('es') || voice.name.includes('Spanish')
    );
    if (spanishVoice && !selectedVoice) {
      console.log('🎤 Seleccionando voz en español:', spanishVoice.name);
      setSelectedVoice(spanishVoice);
    }
  }, [selectedVoice]);

  // Cargar voces cuando estén disponibles
  useEffect(() => {
    console.log('🎤 Inicializando Text-to-Speech...');
    loadVoices();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup
    return () => {
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  const speak = useCallback((text: string) => {
    console.log('🔊 Iniciando síntesis de voz:', { text, rate, pitch, volume });
    
    // Verificar soporte del navegador
    if (!('speechSynthesis' in window)) {
      console.error('❌ Speech Synthesis no soportado en este navegador');
      alert('Tu navegador no soporta síntesis de voz. Intenta con Chrome, Edge o Safari.');
      return;
    }

    // Detener cualquier síntesis en curso
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar propiedades
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('🎤 Usando voz:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.log('🎤 Usando voz por defecto del sistema');
    }

    // Event listeners
    utterance.onstart = () => {
      console.log('✅ Síntesis de voz iniciada');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('✅ Síntesis de voz completada');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('❌ Error en síntesis de voz:', event);
      setIsSpeaking(false);
    };

    // Iniciar síntesis
    console.log('🚀 Llamando speechSynthesis.speak()...');
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.speak(utterance);
    }
    
    // Verificar inmediatamente si está hablando
    setTimeout(() => {
      console.log('📊 Estado después de 100ms:', {
        speaking: typeof speechSynthesis !== 'undefined' ? speechSynthesis.speaking : false,
        pending: typeof speechSynthesis !== 'undefined' ? speechSynthesis.pending : false,
        paused: typeof speechSynthesis !== 'undefined' ? speechSynthesis.paused : false
      });
    }, 100);
  }, [selectedVoice, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
  };
};