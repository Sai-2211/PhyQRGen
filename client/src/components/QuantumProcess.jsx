import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BlochSphere from './BlochSphere';

function chunk(value, size = 8) {
  const input = String(value || '');
  if (!input) {
    return [];
  }

  const parts = [];
  for (let index = 0; index < input.length; index += size) {
    parts.push(input.slice(index, index + size));
  }

  return parts;
}

function sanitizeHex(value) {
  return String(value || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
}

function hexToBytes(entropyBytes) {
  const bytes = [];
  const normalized = sanitizeHex(entropyBytes);

  for (let index = 0; index < normalized.length; index += 2) {
    const pair = normalized.slice(index, index + 2);
    if (pair.length === 2) {
      bytes.push(Number.parseInt(pair, 16));
    }
  }

  return bytes;
}

function countBits(byte) {
  let value = byte;
  let count = 0;

  while (value) {
    count += value & 1;
    value >>= 1;
  }

  return count;
}

function calculateQuantumState(entropyBytes, fallbackRoomId = '') {
  const entropyHex = sanitizeHex(entropyBytes);
  const bytes = hexToBytes(entropyHex);

  if (!bytes.length) {
    return {
      entropyHex: '',
      sampleBytes: 0,
      shannonBits: 0,
      normalizedEntropy: 0,
      bitBalance: 0,
      roomIdHex: fallbackRoomId,
      seedHex: '',
      azimuth: Math.PI / 5,
      polar: Math.PI / 3.2,
      vectorLength: 0.92
    };
  }

  const counts = bytes.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});

  const entropy = Object.values(counts).reduce((sum, count) => {
    const probability = count / bytes.length;
    return sum - probability * Math.log2(probability);
  }, 0);

  const sampleMaxEntropy = Math.max(1, Math.min(8, Math.log2(bytes.length)));
  const normalizedEntropy = Math.min(1, entropy / sampleMaxEntropy);
  const oneBits = bytes.reduce((sum, value) => sum + countBits(value), 0);
  const bitBalance = oneBits / (bytes.length * 8);
  const safeHex = entropyHex.padEnd(128, '0');
  const roomIdHex = safeHex.slice(0, 32) || fallbackRoomId;
  const seedHex = safeHex.slice(32);
  const azimuth = ((bytes[0] || 64) / 255) * Math.PI * 2;
  const polar = Math.PI * 0.2 + (((bytes[1] || 128) / 255) * Math.PI * 0.6);
  const vectorLength = Math.max(0.18, 0.94 - normalizedEntropy * 0.72);

  return {
    entropyHex,
    sampleBytes: bytes.length,
    shannonBits: entropy,
    normalizedEntropy,
    bitBalance,
    roomIdHex,
    seedHex,
    azimuth,
    polar,
    vectorLength
  };
}

export default function QuantumProcess({
  entropyBytes = '',
  qrngSource = 'quantum',
  quantumNumber = '',
  qrPayload = '',
  shortCode = ''
}) {
  const quantumState = useMemo(
    () => calculateQuantumState(entropyBytes, quantumNumber),
    [entropyBytes, quantumNumber]
  );
  const entropyPreview = quantumState.entropyHex
    ? chunk(quantumState.entropyHex, 8).join(' ')
    : 'Not available';
  const seedPreview = quantumState.seedHex
    ? chunk(quantumState.seedHex, 8).join(' ')
    : 'Not available';
  const roomIdPreview = quantumState.roomIdHex
    ? chunk(quantumState.roomIdHex, 8).join(' ')
    : 'Not available';

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,340px)]">
      <div className="min-w-0 space-y-6">
        <BlochSphere
          entropyMeasure={quantumState.normalizedEntropy}
          vectorLength={quantumState.vectorLength}
          azimuth={quantumState.azimuth}
          polar={quantumState.polar}
          label={qrngSource === 'quantum' ? 'Quantum state from ANU entropy' : 'Fallback entropy state'}
        />

        <div className="vault-panel overflow-hidden rounded-[30px] p-6 shadow-vault">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Quantum telemetry
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-vault-text">Entropy diagnostics and room derivation</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-vault-muted">
                This panel surfaces the physics-facing data: the raw entropy delivered by the QRNG API, the derived
                room identifier encoded into the QR invite, and the remaining QRNG seed used during room generation.
              </p>
            </div>
            <div className="w-fit rounded-full bg-vault-surface px-3 py-1 text-xs font-medium text-vault-muted">
              {qrngSource === 'quantum' ? 'Live ANU QRNG source' : 'CSPRNG fallback source'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Sample size</p>
              <p className="mt-2 text-xl font-semibold text-vault-text">{quantumState.sampleBytes} bytes</p>
              <p className="mt-2 text-xs leading-5 text-vault-muted">Entropy payload returned by the API.</p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Shannon estimate</p>
              <p className="mt-2 text-xl font-semibold text-vault-text">
                {quantumState.shannonBits.toFixed(2)} bits
              </p>
              <p className="mt-2 text-xs leading-5 text-vault-muted">Empirical entropy of the sampled byte states.</p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Bloch radius</p>
              <p className="mt-2 text-xl font-semibold text-vault-text">{quantumState.vectorLength.toFixed(2)}</p>
              <p className="mt-2 text-xs leading-5 text-vault-muted">
                Shorter radius indicates a more mixed effective state.
              </p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Bit balance</p>
              <p className="mt-2 text-xl font-semibold text-vault-text">
                {(quantumState.bitBalance * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-xs leading-5 text-vault-muted">Fraction of 1-bits across the measured stream.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                QRNG API entropy readout
              </p>
              <p className="mt-3 font-mono text-xs leading-6 text-vault-text">{entropyPreview}</p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Derived QRNG seed
              </p>
              <p className="mt-3 font-mono text-xs leading-6 text-vault-text">{seedPreview}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Room identifier embedded in the QR invite
              </p>
              <p className="mt-3 font-mono text-xs leading-6 text-vault-text">{roomIdPreview}</p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Invite code</p>
              <p className="mt-2 break-all text-lg font-semibold tracking-[0.12em] text-vault-text sm:text-xl">
                {shortCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="vault-panel overflow-hidden rounded-[30px] p-6 shadow-vault">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Quantum invite</p>
        <h3 className="mt-2 text-2xl font-semibold text-vault-text">Room QR encoded from the derived state</h3>
        <div className="mt-6 flex justify-center rounded-[28px] border border-vault-border bg-white p-5 shadow-vault-soft">
          <QRCodeSVG
            value={qrPayload}
            size={220}
            bgColor="#ffffff"
            fgColor="#111827"
            className="h-auto w-full max-w-[220px]"
          />
        </div>
        <p className="mt-5 text-sm leading-6 text-vault-muted">
          The QR invite carries the room identifier generated from the first segment of the entropy stream, while the
          remaining QRNG bytes stay visible above as the seed record for your project.
        </p>
      </div>
    </section>
  );
}
