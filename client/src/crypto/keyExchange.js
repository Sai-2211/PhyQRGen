import nacl from 'tweetnacl';

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }

  return output;
}

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const bytes = new Uint8Array(Math.ceil(clean.length / 2));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(clean.slice(index * 2, index * 2 + 2) || '00', 16);
  }

  return bytes;
}


function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: bytesToBase64(keyPair.publicKey),
    secretKey: bytesToBase64(keyPair.secretKey)
  };
}

function computeSharedSecret(otherPublicKey, mySecretKey) {
  const shared = nacl.box.before(base64ToBytes(otherPublicKey), base64ToBytes(mySecretKey));
  return bytesToBase64(shared);
}

function computeSharedSecretsMap(publicKeys, selfSocketId, mySecretKey) {
  const map = {};
  Object.entries(publicKeys || {}).forEach(([socketId, publicKey]) => {
    if (socketId === selfSocketId || !publicKey) {
      return;
    }

    map[socketId] = computeSharedSecret(publicKey, mySecretKey);
  });

  return map;
}

export {
  bytesToBase64,
  base64ToBytes,
  hexToBytes,

  generateKeyPair,
  computeSharedSecret,
  computeSharedSecretsMap
};
