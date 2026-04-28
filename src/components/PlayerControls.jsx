import { useEffect, useState } from 'react';

function formatTime(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PlayerControls({
  isHost,
  sendMessage,
  syncEngine,
  videoRef,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [mediaUrl, setMediaUrl] = useState('');

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return undefined;

    const updatePlaybackState = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsPlaying(!video.paused);
      setVolume(video.volume);
    };

    video.addEventListener('loadedmetadata', updatePlaybackState);
    video.addEventListener('durationchange', updatePlaybackState);
    video.addEventListener('timeupdate', updatePlaybackState);
    video.addEventListener('play', updatePlaybackState);
    video.addEventListener('pause', updatePlaybackState);
    video.addEventListener('volumechange', updatePlaybackState);

    if (video.readyState >= 1) updatePlaybackState();

    return () => {
      video.removeEventListener('loadedmetadata', updatePlaybackState);
      video.removeEventListener('durationchange', updatePlaybackState);
      video.removeEventListener('timeupdate', updatePlaybackState);
      video.removeEventListener('play', updatePlaybackState);
      video.removeEventListener('pause', updatePlaybackState);
      video.removeEventListener('volumechange', updatePlaybackState);
    };
  }, [videoRef, videoRef?.current]);

  if (!isHost) {
    return null;
  }

  const sendControlMessage = (type, payload = {}) => {
    sendMessage?.({
      type,
      position: videoRef?.current?.currentTime ?? currentTime,
      ...payload,
    });
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      sendControlMessage('play');
    } else {
      video.pause();
      sendControlMessage('pause');
    }
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(nextTime);
    video.currentTime = nextTime;
  };

  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    const video = videoRef.current;
    setVolume(nextVolume);
    if (video) video.volume = nextVolume;
    sendControlMessage('volume', { volume: nextVolume });
  };

  const handleSetMedia = () => {
    const trimmed = mediaUrl.trim();
    if (!trimmed) return;
    sendMessage?.({ type: 'set_media', url: trimmed });
  };

  return (
    <section className="player-controls" aria-label="Host playback controls">
      <div className="player-controls__media-input" style={{ display: 'flex', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Paste video URL (.mp4, etc)"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSetMedia()}
          style={{ flex: 1, padding: '8px', background: '#1a1a2e', color: '#e8e6e0', border: '1px solid #00c8a0', borderRadius: '4px' }}
        />
        <button
          type="button"
          onClick={handleSetMedia}
          style={{ padding: '8px 16px', background: '#00c8a0', color: '#0a0a0f', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}
        >
          Load
        </button>
      </div>

      <button
        className="player-controls__button"
        onClick={handlePlayPause}
        type="button"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <label className="player-controls__seek">
        <span className="sr-only">Seek video</span>
        <span className="player-controls__time">{formatTime(currentTime)}</span>
        <input
          aria-label="Seek video"
          max={duration || 0}
          min="0"
          onChange={handleSeek}
          step="0.1"
          type="range"
          value={Math.min(currentTime, duration || currentTime)}
        />
        <span className="player-controls__time">{formatTime(duration)}</span>
      </label>

      <label className="player-controls__volume">
        <span>Volume</span>
        <input
          aria-label="Volume"
          max="1"
          min="0"
          onChange={handleVolume}
          step="0.01"
          type="range"
          value={volume}
        />
      </label>
    </section>
  );
}