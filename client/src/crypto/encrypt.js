import nacl from 'tweetnacl';
import { base64ToBytes, bytesToBase64, deriveFileKeyFromSeed } from './keyExchange';

const encoder = new TextEncoder();

async function encryptAesGcm(plainBytes, keyBytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plainBytes);

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher))
  };
}

function encryptTextForRecipient({ message, recipientPublicKey, senderSecretKey }) {
  const nonce = nacl.randomBytes(24);
  const messageBytes = encoder.encode(JSON.stringify(message));
  const ciphertext = nacl.box(
    messageBytes,
    nonce,
    base64ToBytes(recipientPublicKey),
    base64ToBytes(senderSecretKey)
  );

  return {
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext)
  };
}

function encryptFileForRecipient({
  arrayBuffer,
  recipientPublicKey,
  senderSecretKey,
  fileMeta,
  entropySeed
}) {
  const fileBytes = new Uint8Array(arrayBuffer);
  const fileNonce = nacl.randomBytes(24);
  const fileKey = entropySeed ? deriveFileKeyFromSeed(entropySeed) : nacl.randomBytes(32);

  const encryptedBlob = nacl.secretbox(fileBytes, fileNonce, fileKey);

  const keyNonce = nacl.randomBytes(24);
  const encryptedFileKey = nacl.box(
    fileKey,
    keyNonce,
    base64ToBytes(recipientPublicKey),
    base64ToBytes(senderSecretKey)
  );

  return {
    messageType: 'file',
    payload: {
      ...fileMeta,
      keyNonce: bytesToBase64(keyNonce),
      encryptedFileKey: bytesToBase64(encryptedFileKey),
      fileNonce: bytesToBase64(fileNonce),
      encryptedBlob: bytesToBase64(encryptedBlob)
    }
  };
}

export { encryptAesGcm, encryptTextForRecipient, encryptFileForRecipient };
