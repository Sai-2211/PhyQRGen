import nacl from 'tweetnacl';
import { base64ToBytes } from './keyExchange';

const decoder = new TextDecoder();

async function decryptAesGcm({ ciphertext, iv, keyBytes }) {
  const cipherBytes = base64ToBytes(ciphertext);
  const ivBytes = base64ToBytes(iv);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, cipherBytes);
  return new Uint8Array(plain);
}

function decryptTextFromSender({ ciphertext, nonce, senderPublicKey, recipientSecretKey }) {
  const opened = nacl.box.open(
    base64ToBytes(ciphertext),
    base64ToBytes(nonce),
    base64ToBytes(senderPublicKey),
    base64ToBytes(recipientSecretKey)
  );

  if (!opened) {
    throw new Error('Unable to decrypt text payload');
  }

  return JSON.parse(decoder.decode(opened));
}

function decryptFileFromSender({ payload, senderPublicKey, recipientSecretKey }) {
  const fileKey = nacl.box.open(
    base64ToBytes(payload.encryptedFileKey),
    base64ToBytes(payload.keyNonce),
    base64ToBytes(senderPublicKey),
    base64ToBytes(recipientSecretKey)
  );

  if (!fileKey) {
    throw new Error('Unable to decrypt file key');
  }

  const decryptedBytes = nacl.secretbox.open(
    base64ToBytes(payload.encryptedBlob),
    base64ToBytes(payload.fileNonce),
    fileKey
  );

  if (!decryptedBytes) {
    throw new Error('Unable to decrypt file blob');
  }

  return decryptedBytes;
}

export { decryptAesGcm, decryptTextFromSender, decryptFileFromSender };
