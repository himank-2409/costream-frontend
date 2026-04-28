export default function ParticipantBar({ isHost, guestPresent, connectionStatus }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      fontSize: '13px',
      color: '#888',
    }}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#00c8a0',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#00c8a0',
          display: 'inline-block',
        }} />
        You {isHost ? '(Host)' : '(Guest)'}
      </span>

      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: guestPresent ? '#00c8a0' : '#444',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: guestPresent ? '#00c8a0' : '#444',
          display: 'inline-block',
        }} />
        {guestPresent ? 'Friend is here' : 'Waiting for friend...'}
      </span>
    </div>
  );
}
