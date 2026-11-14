const encoder = new TextEncoder();
const decoder = new TextDecoder();

function fromBase64(value) {
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    throw new Error('La clave de cifrado debe ser base64 válido.');
  }
}

async function importEncryptionKey(value) {
  const raw = fromBase64(String(value ?? ''));
  if (raw.byteLength !== 32) throw new Error('La clave de cifrado debe contener 32 bytes.');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptRefreshToken(refreshToken, base64Key) {
  const token = String(refreshToken ?? '');
  if (!token || token.length > 4096) throw new Error('El refresh token no es válido.');
  const key = await importEncryptionKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipher))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptRefreshToken(encrypted, base64Key) {
  if (!encrypted || typeof encrypted.ciphertext !== 'string' || typeof encrypted.iv !== 'string') {
    throw new Error('El token cifrado no es válido.');
  }
  const key = await importEncryptionKey(base64Key);
  const clear = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(encrypted.iv) },
    key,
    fromBase64(encrypted.ciphertext),
  );
  const token = decoder.decode(clear);
  if (!token || token.length > 4096) throw new Error('El refresh token descifrado no es válido.');
  return token;
}

