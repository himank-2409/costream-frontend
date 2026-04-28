// Watch room surface that wires room state, websocket events, and video sync.
import { useEffect, useRef } from 'react';
import {useState } from 'react';
import { useParams } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import ParticipantBar from '../components/ParticipantBar.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useRoom } from '../hooks/useRoom.js';
import { useSyncEngine } from '../hooks/useSyncEngine.js';

function RoomCode({ roomId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '0 16px',
      margin: '8px 0',
    }}>
      <span
        onClick={handleCopy}
        title="Click to copy"
        style={{
          fontFamily: 'monospace',
          fontSize: '2rem',
          fontWeight: '700',
          letterSpacing: '0.3em',
          color: '#e8e6e0',
          cursor: 'pointer',
        }}
      >
        {roomId}
      </span>
      <button
        onClick={handleCopy}
        type="button"
        style={{
          background: 'transparent',
          border: '1px solid #00c8a0',
          borderRadius: '6px',
          color: copied ? '#00c8a0' : '#666',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '4px 10px',
          transition: 'color 0.2s',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}



export default function WatchRoom() {
  const { roomId } = useParams();
  const videoRef = useRef(null);
  const syncHandlerRef = useRef(null);

  const room = useRoom(roomId, undefined, (message) => {
    syncHandlerRef.current?.(message);
  });

  const syncEngine = useSyncEngine(videoRef, room.isHost, room);

  useEffect(() => {
    syncHandlerRef.current = syncEngine.onSync;
      console.log(
    '%c CoStream %c made with ♥ by himank ',
    'background:#00c8a0;color:#0a0a0f;font-weight:bold;padding:4px 8px;border-radius:4px 0 0 4px',
    'background:#1a1a2e;color:#00c8a0;padding:4px 8px;border-radius:0 4px 4px 0;border:1px solid #00c8a0'
  );

  

  }, [syncEngine.onSync]);

  

  return (
    <main className="page-shell watch-room">
      <ConnectionStatus status={room.connectionStatus} />
      <ParticipantBar
        isHost={room.isHost}
        guestPresent={room.guestPresent}
        connectionStatus={room.connectionStatus}
      />
     
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px',
        margin: '8px 0',
      }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '1.5rem',
            fontWeight: '700',
            letterSpacing: '0.4em',
            color: '#07f3ff92',
          }}
        >
          CoStream
        </span>
      </div>
      <RoomCode roomId={roomId} />   
    
     

      <VideoPlayer
        isHost={room.isHost}
        mediaUrl={room.mediaUrl}
        sendMessage={room.sendMessage}
        syncEngine={syncEngine}
        videoRef={videoRef}
      />
      <Chat
        messages={room.chat}
        sendMessage={room.sendMessage}
        userId={room.userId}
      />
      <footer style={{
      textAlign: 'center',
      padding: '1rem',
      fontSize: '12px',
      color: '#f2f276',
      letterSpacing: '0.05em',
    }}>
      made with ♥ by himank in memorial of her pretty girlfriend aarna, fly high  <span style={{ fontSize: '10px', color: '#f9ab36' }}>2009-2024</span>
    </footer>
    2026 &copy; CoStream. All rights reserved.
    </main>

  );
}
