import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const USER_ID_KEY = 'user_id';
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 8000;

function createUserId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers that do not expose crypto.randomUUID.
  return `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getSessionUserId() {
  if (typeof window === 'undefined') {
    return createUserId();
  }

  const existingUserId = window.sessionStorage.getItem(USER_ID_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const userId = createUserId();
  window.sessionStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

function resolveWebSocketUrl(url) {
  if (!url || typeof window === 'undefined') {
    return url;
  }

  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new URL(url, `${protocol}//${window.location.host}`).toString();
}

function getReconnectDelay(attempt) {
  return Math.min(
    INITIAL_RECONNECT_DELAY_MS * 2 ** attempt,
    MAX_RECONNECT_DELAY_MS,
  );
}

export function useWebSocket(url, onMessage, onStatusChange) {
  const [status, setStatus] = useState(url ? 'connecting' : 'disconnected');

  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const lifecycleIdRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  // Ensure every visitor has a stable per-tab/user identity available to the app.
  useMemo(() => getSessionUserId(), []);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const updateStatus = useCallback((nextStatus) => {
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  const flushQueuedMessages = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    while (messageQueueRef.current.length > 0) {
      socket.send(messageQueueRef.current.shift());
    }
  }, []);

  const sendMessage = useCallback((message) => {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const socket = socketRef.current;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return;
    }

    // Preserve user actions while the socket is still connecting or reconnecting.
    messageQueueRef.current.push(payload);
  }, []);

  useEffect(() => {
    if (!url) {
      updateStatus('disconnected');
      return undefined;
    }

    const webSocketUrl = resolveWebSocketUrl(url);
    const lifecycleId = lifecycleIdRef.current + 1;

    lifecycleIdRef.current = lifecycleId;
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (lifecycleIdRef.current !== lifecycleId) {
        return;
      }

      if (!shouldReconnectRef.current) {
        updateStatus('disconnected');
        return;
      }

      const delay = getReconnectDelay(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      updateStatus('reconnecting');

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connect(true);
      }, delay);
    };

    const connect = (isReconnect = false) => {
      if (lifecycleIdRef.current !== lifecycleId) {
        return;
      }

      clearReconnectTimer();
      updateStatus(isReconnect ? 'reconnecting' : 'connecting');

      const socket = new WebSocket(webSocketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (lifecycleIdRef.current !== lifecycleId) {
          socket.close();
          return;
        }

        reconnectAttemptRef.current = 0;
        updateStatus('connected');
        flushQueuedMessages();
      };

      socket.onmessage = (event) => {
        if (lifecycleIdRef.current !== lifecycleId) {
          return;
        }

        try {
          onMessageRef.current?.(JSON.parse(event.data));
        } catch (error) {
          console.warn('Ignoring non-JSON websocket message', error);
        }
      };

      socket.onclose = () => {
        if (lifecycleIdRef.current !== lifecycleId) {
          return;
        }

        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        scheduleReconnect();
      };

      socket.onerror = (error) => {
        if (lifecycleIdRef.current !== lifecycleId) {
          return;
        }

        console.warn('WebSocket error', error);
      };
    };

    connect(false);

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      updateStatus('disconnected');
    };
  }, [flushQueuedMessages, updateStatus, url]);

  return {
    sendMessage,
    status,
  };
}
