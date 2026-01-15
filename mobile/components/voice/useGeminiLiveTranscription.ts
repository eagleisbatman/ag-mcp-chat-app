import { useCallback, useRef, useState } from 'react';
import { API_KEY, AI_SERVICES_URL } from '../../utils/config';

type LiveServerMessage = {
  serverContent?: {
    inputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ text?: string }> };
    turnComplete?: boolean;
  };
};

interface GeminiLiveState {
  transcript: string;
  isConnected: boolean;
  connect: (languageCode: string) => void;
  disconnect: () => void;
  sendAudioChunk: (base64: string, mimeType?: string) => void;
}

function buildWsUrl(): string {
  const wsBase = AI_SERVICES_URL.replace(/^http/, 'ws');
  return `${wsBase.replace(/\/$/, '')}/api/v2/transcribe/live?apiKey=${encodeURIComponent(API_KEY)}`;
}

function extractTranscript(message: LiveServerMessage): string | null {
  const liveText = message.serverContent?.inputTranscription?.text;
  if (liveText) return liveText;
  const modelText = message.serverContent?.modelTurn?.parts?.[0]?.text;
  return modelText || null;
}

export function useGeminiLiveTranscription(): GeminiLiveState {
  const socketRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((languageCode: string) => {
    if (socketRef.current) return;
    const socket = new WebSocket(buildWsUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: 'start', language: languageCode }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload?.message) {
          const next = extractTranscript(payload.message as LiveServerMessage);
          if (next) setTranscript(next);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' }));
    }
    socket.close();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  const sendAudioChunk = useCallback((base64: string, mimeType = 'audio/pcm;rate=16000') => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'audio', data: base64, mimeType }));
  }, []);

  return {
    transcript,
    isConnected,
    connect,
    disconnect,
    sendAudioChunk,
  };
}
