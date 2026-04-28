import { useEffect, useState } from 'react';
import PlayerControls from './PlayerControls.jsx';

function SyncOverlay() {
  return (
    <div className="sync-overlay" role="status">
      Syncing...
    </div>
  );
}

export default function VideoPlayer({
  isHost,
  mediaUrl,
  sendMessage,
  syncEngine,
  videoRef,
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;
    video.muted = true;
    setIsMuted(true);
  }, [mediaUrl, videoRef]);

  // When sync engine tries to play and browser blocks it, show tap overlay
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handlePlayFailed = () => {
      // If video is paused and should be playing, browser blocked autoplay
      setNeedsTap(true);
    };

    video.addEventListener('suspend', handlePlayFailed);
    return () => video.removeEventListener('suspend', handlePlayFailed);
  }, [videoRef, mediaUrl]);

  const handleTapToStart = async () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsTap(false);
    try {
      await video.play();
    } catch {
      // still blocked, keep overlay hidden and let user try again
    }
  };

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = video.volume || 1;
    setIsMuted(false);
  };

  return (
    <section className="video-player" aria-label="Synchronized video player">
      <div className="video-player__frame">
        {mediaUrl ? (
          <video
            autoPlay
            className="video-player__media"
            muted={isMuted}
            playsInline
            ref={videoRef}
            src={mediaUrl}
          />
        ) : (
          <div className="video-player__empty" role="status">
            Waiting for the host to choose a video.
          </div>
        )}

        {syncEngine?.isSyncing && <SyncOverlay />}

        {/* Mobile tap-to-start overlay */}
        {mediaUrl && needsTap && (
          <button
            onClick={handleTapToStart}
            type="button"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              color: '#e8e6e0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '1.2rem',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: '3rem' }}>▶</span>
            Tap to start
          </button>
        )}

        {/* Unmute button */}
        {mediaUrl && isMuted && !needsTap && (
          <button
            className="video-player__unmute"
            onClick={handleUnmute}
            type="button"
          >
            Tap to unmute
          </button>
        )}
      </div>

      <PlayerControls
        isHost={isHost}
        sendMessage={sendMessage}
        syncEngine={syncEngine}
        videoRef={videoRef}
      />
    </section>
  );
}
