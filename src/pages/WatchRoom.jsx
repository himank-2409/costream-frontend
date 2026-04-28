// Watch room surface that wires room state, websocket events, and video sync.
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import ParticipantBar from '../components/ParticipantBar.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useRoom } from '../hooks/useRoom.js';
import { useSyncEngine } from '../hooks/useSyncEngine.js';

export default function WatchRoom() {
  const { roomId } = useParams();
  const videoRef = useRef(null);
  const syncHandlerRef = useRef(null);

  // useRoom owns websocket delivery; this proxy lets the sync hook be created
  // after room state is known without losing incoming sync messages.
  const room = useRoom(roomId, undefined, (message) => {
    syncHandlerRef.current?.(message);
  });

  const syncEngine = useSyncEngine(videoRef, room.isHost, room);

  useEffect(() => {
    syncHandlerRef.current = syncEngine.onSync;
  }, [syncEngine.onSync]);

  return (
    <main className="page-shell watch-room">
      <ConnectionStatus />
      <h1 className="watch-room__heading">Watch room {roomId}</h1>
      <ParticipantBar />
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
    </main>
  );
}
