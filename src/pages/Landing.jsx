import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionUserId } from '../hooks/useWebSocket.js';
import { isValidRoomCode } from '../utils/roomCode.js';

export default function Landing() {
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleCreateRoom() {
    setIsCreating(true);
    setError('');

    try {
      const userId = getSessionUserId();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_id: userId, media_url: null }),
      });

      if (!response.ok) throw new Error('Failed to create room');

      const room = await response.json();
      navigate(`/room/${room.room_id}`);
    } catch (err) {
      setError('Could not create room. Is the backend running?');
    } finally {
      setIsCreating(false);
    }
  }

  function handleJoinRoom(event) {
    event.preventDefault();
    const normalizedCode = roomCode.trim().toUpperCase();
    if (isValidRoomCode(normalizedCode)) {
      navigate(`/room/${normalizedCode}`);
    } else {
      setError('Please enter a valid 6-character room code.');
    }
  }

  return (
    <main className="page-shell landing">
      <section className="landing__panel" aria-labelledby="landing-title">
        <p className="landing__eyebrow">Watch together</p>
        <h1 className="landing__title" id="landing-title">CoStream</h1>
        <p className="landing__subtitle">
          Start a shared room or join friends with a six-character code.
        </p>

        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

        <form className="landing__form" onSubmit={handleJoinRoom}>
          <button
            className="button"
            type="button"
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create room'}
          </button>
          <label>
            <span className="sr-only">Join with code</span>
            <input
              className="landing__input"
              maxLength={6}
              onChange={(event) => setRoomCode(event.target.value)}
              placeholder="Join with code"
              value={roomCode}
            />
          </label>
          <button className="button" type="submit">
            Join room
          </button>
        </form>
      </section>
    </main>
  );
}