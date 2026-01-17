import { useCallback, useEffect, useRef, useState } from 'react';
import { API_KEY, AI_SERVICES_URL } from '../../utils/config';
import { log } from '../../utils/logger';

type LiveServerMessage = {
  serverContent?: {
    inputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ text?: string }> };
    turnComplete?: boolean;
  };
};

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface GeminiLiveState {
  transcript: string;
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: (languageCode: string) => void;
  disconnect: () => void;
  sendAudioChunk: (base64: string, mimeType?: string) => void;
  clearTranscript: () => void;
}

// Reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 4000;

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
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageCodeRef = useRef<string>('en');
  const intentionalDisconnectRef = useRef(false);
  const audioQueueRef = useRef<Array<{ base64: string; mimeType: string }>>([]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connectInternal = useCallback((languageCode: string, isReconnect: boolean = false) => {
    // Prevent duplicate connections
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Close any existing socket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    languageCodeRef.current = languageCode;
    intentionalDisconnectRef.current = false;
    setConnectionState(isReconnect ? 'reconnecting' : 'connecting');

    try {
      const socket = new WebSocket(buildWsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        log('[ASR] WebSocket connected');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        socket.send(JSON.stringify({ type: 'start', language: languageCode }));

        // Flush any queued audio chunks that arrived during reconnection
        while (audioQueueRef.current.length > 0) {
          const chunk = audioQueueRef.current.shift();
          if (chunk && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'audio', data: chunk.base64, mimeType: chunk.mimeType }));
          }
        }
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

      socket.onerror = (error) => {
        log('[ASR] WebSocket error:', error);
        // Don't set error state here, let onclose handle reconnection
      };

      socket.onclose = (event) => {
        log('[ASR] WebSocket closed:', event.code, event.reason);
        socketRef.current = null;

        // Don't reconnect if disconnect was intentional
        if (intentionalDisconnectRef.current) {
          setConnectionState('disconnected');
          return;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY_MS
          );

          log(`[ASR] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectAttemptsRef.current += 1;

          clearReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            connectInternal(languageCodeRef.current, true);
          }, delay);
        } else {
          log('[ASR] Max reconnection attempts reached');
          setConnectionState('error');
          audioQueueRef.current = [];
        }
      };
    } catch (error) {
      log('[ASR] Failed to create WebSocket:', error);
      setConnectionState('error');
    }
  }, [clearReconnectTimeout]);

  const connect = useCallback((languageCode: string) => {
    reconnectAttemptsRef.current = 0;
    audioQueueRef.current = [];
    setTranscript('');
    connectInternal(languageCode, false);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;
    audioQueueRef.current = [];

    const socket = socketRef.current;
    if (!socket) {
      setConnectionState('disconnected');
      return;
    }

    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'stop' }));
      } catch {
        // Ignore send errors during disconnect
      }
    }

    socket.close();
    socketRef.current = null;
    setConnectionState('disconnected');
  }, [clearReconnectTimeout]);

  const sendAudioChunk = useCallback((base64: string, mimeType = 'audio/pcm;rate=16000') => {
    const socket = socketRef.current;

    // If socket is not open but we're reconnecting, queue the chunk
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if (connectionState === 'reconnecting' || connectionState === 'connecting') {
        // Queue audio chunks during reconnection (limit queue size)
        if (audioQueueRef.current.length < 50) {
          audioQueueRef.current.push({ base64, mimeType });
        }
      }
      return;
    }

    try {
      socket.send(JSON.stringify({ type: 'audio', data: base64, mimeType }));
    } catch (error) {
      log('[ASR] Failed to send audio chunk:', error);
    }
  }, [connectionState]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup WebSocket on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      intentionalDisconnectRef.current = true;
      clearReconnectTimeout();

      const socket = socketRef.current;
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: 'stop' }));
          } catch {
            // Ignore
          }
        }
        socket.close();
        socketRef.current = null;
      }
    };
  }, [clearReconnectTimeout]);

  return {
    transcript,
    isConnected: connectionState === 'connected',
    connectionState,
    connect,
    disconnect,
    sendAudioChunk,
    clearTranscript,
  };
}
