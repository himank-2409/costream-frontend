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

  useEffect(() => {
    const video = videoRef?.current;

    if (!video) {
      return;
    }

    // Start muted so autoplay attempts are allowed by modern browsers.
    video.muted = true;
    setIsMuted(true);
  }, [mediaUrl, videoRef]);

  const handleUnmute = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

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

        {mediaUrl && isMuted && (
          <button
            className="video-player__unmute"
            onClick={handleUnmute}
            type="button"
          >
            Click to unmute
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
