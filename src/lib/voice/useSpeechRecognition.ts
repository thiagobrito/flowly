/**
 * # Voice — reconhecimento de fala
 *
 * Wrapper fino sobre `expo-speech-recognition` para o assistente de voz.
 * Expõe um hook com o transcript parcial em tempo real e callbacks de
 * resultado final/erro, além de helpers de permissão usados no onboarding
 * e no primeiro uso do assistente.
 *
 * Requer dev client com o módulo nativo (não funciona no Expo Go).
 */
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

export type SpeechPermissionStatus = 'granted' | 'denied' | 'error';

/**
 * Solicita as permissões necessárias para o assistente de voz.
 * No iOS cobre microfone + reconhecimento de fala numa só chamada;
 * no Android, `RECORD_AUDIO`.
 */
export async function requestSpeechPermissions(): Promise<SpeechPermissionStatus> {
  try {
    const response = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return response.granted ? 'granted' : 'denied';
  } catch {
    // Módulo indisponível (ex.: Expo Go) ou falha nativa inesperada.
    return 'error';
  }
}

/** Status atual das permissões, sem exibir diálogo. */
export async function getSpeechPermissions(): Promise<SpeechPermissionStatus> {
  try {
    const response = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return response.granted ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}

type UseSpeechRecognitionOptions = {
  /** Chamado uma única vez por sessão de escuta, com o texto final reconhecido. */
  onFinal?: (transcript: string) => void;
  /** Chamado em erros do reconhecedor (ex.: 'not-allowed', 'no-speech'). */
  onError?: (code: string) => void;
};

export function useSpeechRecognition({ onFinal, onError }: UseSpeechRecognitionOptions = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Refs para não re-assinar os listeners nativos a cada render dos callbacks.
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  onFinalRef.current = onFinal;
  onErrorRef.current = onError;

  // Última transcrição parcial + flag de resultado final já entregue: no
  // Android o reconhecedor pode encerrar sem emitir `isFinal`, então usamos o
  // último parcial como resultado no evento `end`.
  const lastTranscriptRef = useRef('');
  const finalDeliveredRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    lastTranscriptRef.current = text;
    setTranscript(text);
    if (event.isFinal && !finalDeliveredRef.current) {
      finalDeliveredRef.current = true;
      onFinalRef.current?.(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    if (!finalDeliveredRef.current && lastTranscriptRef.current.trim().length > 0) {
      finalDeliveredRef.current = true;
      onFinalRef.current?.(lastTranscriptRef.current);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    onErrorRef.current?.(event.error);
  });

  /** Inicia uma sessão de escuta em pt-BR. Resolve `false` se sem permissão. */
  const start = useCallback(async (): Promise<boolean> => {
    const permission = await requestSpeechPermissions();
    if (permission !== 'granted') {
      onErrorRef.current?.(permission === 'denied' ? 'not-allowed' : 'service-not-allowed');
      return false;
    }

    lastTranscriptRef.current = '';
    finalDeliveredRef.current = false;
    setTranscript('');

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
      });
      return true;
    } catch {
      onErrorRef.current?.('audio-capture');
      return false;
    }
  }, []);

  /** Encerra a escuta pedindo o resultado final ao reconhecedor. */
  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // módulo indisponível — nada a fazer
    }
  }, []);

  /** Cancela a escuta descartando o que foi falado. */
  const abort = useCallback(() => {
    finalDeliveredRef.current = true; // descarta resultado pendente
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // módulo indisponível — nada a fazer
    }
    setListening(false);
    setTranscript('');
  }, []);

  return { listening, transcript, start, stop, abort };
}
