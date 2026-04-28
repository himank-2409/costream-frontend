import { useCallback, useEffect, useRef, useState } from 'react';

const HARD_SYNC_THRESHOLD_SECONDS = 2;
const SOFT_SYNC_THRESHOLD_SECONDS = 0.3;
const SOFT_SYNC_DURATION_MS = 3000;
const HOST_TICK_INTERVAL_MS = 5000;

function getNowSeconds() {
  return Date.now() / 1000;
}

function getServerTimestamp(message) {
  return Number(message.server_ts ?? message.server_timestamp ?? getNowSeconds());
}

function getSyncPosition(message) {
  return Number(message.position ?? message.host_position ?? 0);
}

function getIsPlaying(message) {
  return Boolean(message.is_playing ?? message.playing);
}

export function useSyncEngine(videoRef, isHost, roomState = {}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hardSyncCount, setHardSyncCount] = useState(0);
  const softSyncTimerRef = useRef(null);
  const syncingTimerRef = useRef(null);
  const sendMessageRef = useRef(roomState.sendMessage);

  useEffect(() => {
    sendMessageRef.current = roomState.sendMessage;
  }, [roomState.sendMessage]);

  const sendPlaybackMessage = useCallback((type, extra = {}) => {
    const video = videoRef.current;
    const sendMessage = sendMessageRef.current;

    if (!video || !sendMessage) {
      return;
    }

    // Every playback message carries the host position so the backend can
    // keep the shared room clock authoritative.
    sendMessage({
      type,
      position: video.currentTime,
      ...extra,
    });
  }, [videoRef]);

  const sendTick = useCallback(() => {
    sendPlaybackMessage('tick');
  }, [sendPlaybackMessage]);

  const showHardSyncOverlay = useCallback(() => {
    window.clearTimeout(syncingTimerRef.current);
    setIsSyncing(true);
    setHardSyncCount((count) => count + 1);

    // The overlay is intentionally brief: it confirms the correction without
    // turning every sync adjustment into visual noise.
    syncingTimerRef.current = window.setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  }, []);

  const clearSoftSync = useCallback((video) => {
    window.clearTimeout(softSyncTimerRef.current);
    softSyncTimerRef.current = null;

    if (video) {
      video.playbackRate = 1;
    }
  }, []);

  const applySoftSync = useCallback((video, drift) => {
    window.clearTimeout(softSyncTimerRef.current);

    // Positive drift means the guest is behind the host, so speed up briefly.
    video.playbackRate = drift > 0 ? 1.05 : 0.95;
    softSyncTimerRef.current = window.setTimeout(() => {
      video.playbackRate = 1;
      softSyncTimerRef.current = null;
    }, SOFT_SYNC_DURATION_MS);
  }, []);

  const onSync = useCallback((syncMessage = {}) => {
    const video = videoRef.current;

    if (!video || isHost) {
      return;
    }

    if (syncMessage.type === 'buffer_start' || syncMessage.type === 'buffer') {
      const cameFromHost = !syncMessage.user_id || syncMessage.user_id === roomState.hostId;
      const hostIsBuffering = syncMessage.type === 'buffer_start'
        || Boolean(syncMessage.is_buffering ?? syncMessage.buffering);

      // Guests pause while the host buffers so the room does not drift forward.
      if (cameFromHost && hostIsBuffering) {
        video.pause();
      } else if (cameFromHost && roomState.isPlaying) {
        video.play().catch(() => {});
      }

      return;
    }

    if (syncMessage.type === 'buffer_end') {
      const cameFromHost = !syncMessage.user_id || syncMessage.user_id === roomState.hostId;

      if (cameFromHost && roomState.isPlaying) {
        video.play().catch(() => {});
      }
      return;
    }

    const serverTimestamp = getServerTimestamp(syncMessage);
    const expectedPosition = getSyncPosition(syncMessage) + (getNowSeconds() - serverTimestamp);
    const currentPosition = video.currentTime;
    const drift = expectedPosition - currentPosition;
    const absoluteDrift = Math.abs(drift);

    if (syncMessage.type === 'pause' || getIsPlaying(syncMessage) === false) {
      video.pause();
    } else if (syncMessage.type === 'sync' || syncMessage.type === 'seek') {
      video.play().catch(() => {});
    }

    if (absoluteDrift > HARD_SYNC_THRESHOLD_SECONDS) {
      clearSoftSync(video);
      video.currentTime = Math.max(0, expectedPosition);
      showHardSyncOverlay();
      return;
    }

    if (absoluteDrift > SOFT_SYNC_THRESHOLD_SECONDS) {
      applySoftSync(video, drift);
      return;
    }

    clearSoftSync(video);
  }, [
    applySoftSync,
    clearSoftSync,
    isHost,
    roomState.hostId,
    roomState.isPlaying,
    showHardSyncOverlay,
    videoRef,
  ]);

  useEffect(() => {
    if (!isHost) {
      return undefined;
    }

    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    const handlePlay = () => sendPlaybackMessage('play');
    const handlePause = () => sendPlaybackMessage('pause');
    const handleSeek = () => sendPlaybackMessage('seek');
    const handleBufferStart = () => sendPlaybackMessage('buffer_start');
    const handleBufferEnd = () => sendPlaybackMessage('buffer_end');

    // Host media events are the source of truth for guests, including native
    // video actions outside the custom controls.
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeek);
    video.addEventListener('waiting', handleBufferStart);
    video.addEventListener('canplay', handleBufferEnd);

    const tickInterval = window.setInterval(sendTick, HOST_TICK_INTERVAL_MS);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeek);
      video.removeEventListener('waiting', handleBufferStart);
      video.removeEventListener('canplay', handleBufferEnd);
      window.clearInterval(tickInterval);
    };
  }, [isHost, roomState.mediaUrl, sendPlaybackMessage, sendTick, videoRef]);

  useEffect(() => () => {
    window.clearTimeout(softSyncTimerRef.current);
    window.clearTimeout(syncingTimerRef.current);
  }, []);

  return {
    hardSyncCount,
    isSyncing,
    onSync,
    sendPlaybackMessage,
    sendTick,
  };
}