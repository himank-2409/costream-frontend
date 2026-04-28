// Room code helpers for generating and validating short invite codes.
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export function generateRoomCode() {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    return ROOM_CODE_ALPHABET[index];
  }).join('');
}

export function isValidRoomCode(code) {
  return ROOM_CODE_PATTERN.test(code);
}
