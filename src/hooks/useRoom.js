import { useCallback, useMemo, useReducer, useRef, useEffect } from 'react';
import { getSessionUserId, useWebSocket } from './useWebSocket.js';

const initialRoomState = {
  mediaUrl: null,
  isPlaying: false,
  hostPosition: 0,
  hostTimestamp: 0,
  hostId: null,
  guestId: null,
  isHost: false,
  guestPresent: false,
  chat: [],
};

function sortChatBySequence(chat) {
  return [...chat].sort((a, b) => {
    const firstSequence = a.sequence_id ?? a.sequenceId ?? 0;
    const secondSequence = b.sequence_id ?? b.sequenceId ?? 0;
    return firstSequence - secondSequence;
  });
}

function normalizeChatMessage(message) {
  return {
    user_id: message.user_id,
    text: message.text ?? '',
    server_timestamp: message.server_timestamp,
    sequence_id: message.sequence_id,
  };
}

function getMessagePosition(message) {
  return Number(message.position ?? message.host_position ?? 0);
}

function getMessageTimestamp(message) {
  return Number(message.server_timestamp ?? message.server_ts ?? Date.now() / 1000);
}

function mapSnapshotToState(message, userId) {
  const room = message.room ?? message;
  const hostId = room.host_id ?? message.host_id;
  const guestId = room.guest_id ?? message.guest_id;

  return {
    mediaUrl: room.media_url ?? room.mediaUrl ?? null,
    isPlaying: Boolean(room.is_playing ?? room.isPlaying),
    hostPosition: Number(room.host_position ?? room.hostPosition ?? 0),
    hostTimestamp: Number(room.host_timestamp ?? room.hostTimestamp ?? 0),
    hostId,
    guestId,
    isHost: message.role === 'host' || hostId === userId,
    guestPresent: Boolean(guestId),
    chat: sortChatBySequence(room.chat ?? message.chat ?? []),
  };
}

function roomReducer(state, action) {
  switch (action.type) {
    case 'snapshot':
      // Snapshots are authoritative and replace the local room copy.
      return mapSnapshotToState(action.message, action.userId);

    case 'pause':
      return {
        ...state,
        isPlaying: false,
        hostPosition: getMessagePosition(action.message),
        hostTimestamp: getMessageTimestamp(action.message),
      };

    case 'sync':
      return {
        ...state,
        isPlaying: Boolean(action.message.is_playing ?? action.message.playing),
        hostPosition: getMessagePosition(action.message),
        hostTimestamp: getMessageTimestamp(action.message),
      };

    case 'seek':
      return {
        ...state,
        isPlaying: Boolean(action.message.is_playing ?? state.isPlaying),
        hostPosition: getMessagePosition(action.message),
        hostTimestamp: getMessageTimestamp(action.message),
      };

    case 'peer_joined':
      return {
        ...state,
        guestPresent: true,
      };

    case 'peer_left': {
      const nextHostId = action.message.host_id;
      const nextGuestId = action.message.guest_id;

      return {
        ...state,
        isHost: nextHostId ? nextHostId === action.userId : state.isHost,
        hostId: nextHostId ?? state.hostId,
        guestId: nextGuestId ?? null,
        guestPresent: Boolean(nextGuestId),
      };
    }

    case 'chat':
      return {
        ...state,
        chat: sortChatBySequence([
          ...state.chat,
          normalizeChatMessage(action.message),
        ]),
      };

    case 'set_media':
      return {
        ...state,
        mediaUrl: action.message.url ?? null,
      };

    default:
      return state;
  }
}

function buildRoomSocketUrl(roomId, userId) {
  if (!roomId || !userId) {
    return null;
  }

  const path = `/ws/${encodeURIComponent(roomId)}/${encodeURIComponent(userId)}`;
  const baseUrl = (import.meta.env.VITE_WS_URL ?? '').replace(/\/$/, '');

  // In production VITE_WS_URL is set (e.g. wss://your-backend.railway.app)
  // In local dev it's empty so we use a relative path and let Vite proxy it
  if (baseUrl && (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://'))) {
    return `${baseUrl}${path}`;
  }

  return path;
}

export function useRoom(roomId, userId, onSync) {
  const fallbackUserId = useMemo(() => getSessionUserId(), []);
  const activeUserId = userId || fallbackUserId;
  const syncCallbackRef = useRef(onSync);
  const [roomState, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    syncCallbackRef.current = onSync;
  }, [onSync]);

  const socketUrl = useMemo(
    () => buildRoomSocketUrl(roomId, activeUserId),
    [activeUserId, roomId],
  );

  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'snapshot':
      case 'pause':
      case 'sync':
      case 'seek':
      case 'peer_joined':
      case 'peer_left':
      case 'chat':
      case 'set_media':
        dispatch({ type: message.type, message, userId: activeUserId });

        if (message.type === 'sync' || message.type === 'pause' || message.type === 'seek') {
          syncCallbackRef.current?.(message);
        }

        break;

      case 'buffer_start':
      case 'buffer_end':
        // Playback correction is delegated to useSyncEngine through this callback.
        syncCallbackRef.current?.(message);
        break;

      case 'room_expired':
        window.alert('This room has expired.');
        window.location.assign('/');
        break;

      default:
        break;
    }
  }, [activeUserId]);

  const { sendMessage, status } = useWebSocket(socketUrl, handleMessage);

  return {
    ...roomState,
    room: roomState,
    roomState,
    userId: activeUserId,
    sendMessage,
    connectionStatus: status,
  };
}
