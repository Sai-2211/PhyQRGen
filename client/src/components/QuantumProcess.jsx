import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BlochSphere from './BlochSphere';

function chunk(value) {
  return value.match(/.{1,8}/g) || [];
}

function calculateEntropyMeasure(entropyBytes) {
  const bytes = [];

  for (let index = 0; index < entropyBytes.length; index += 2) {
    const pair = entropyBytes.slice(index, index + 2);
    if (pair.length === 2) {
      bytes.push(pair);
    }
  }

  if (!bytes.length) {
    return 0;
  }

  const counts = bytes.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});

  const entropy = Object.values(counts).reduce((sum, count) => {
    const probability = count / bytes.length;
    return sum - probability * Math.log2(probability);
  }, 0);

  return Math.min(1, entropy / 8);
}

export default function QuantumProcess({
  entropyBytes = '',
  qrngSource = 'quantum',
  quantumNumber = '',
  qrPayload = '',
  shortCode = ''
}) {
  const entropyMeasure = useMemo(() => calculateEntropyMeasure(entropyBytes), [entropyBytes]);
  const entropyPreview = entropyBytes ? chunk(entropyBytes.slice(0, 48)).join(' ') : 'Not available';

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,340px)]">
      <div className="min-w-0 space-y-6">
        <BlochSphere
          entropyMeasure={entropyMeasure}
          label={qrngSource === 'quantum' ? 'Live quantum entropy' : 'Fallback entropy state'}
        />

        <div className="vault-panel overflow-hidden rounded-[30px] p-6 shadow-vault">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Session summary
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-vault-text">Ready to share</h3>
            </div>
            <div className="w-fit rounded-full bg-vault-surface px-3 py-1 text-xs font-medium text-vault-muted">
              {qrngSource === 'quantum' ? 'ANU QRNG' : 'CSPRNG fallback'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Code</p>
              <p className="mt-2 break-all text-lg font-semibold tracking-[0.12em] text-vault-text sm:text-xl">
                {shortCode}
              </p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Entropy</p>
              <p className="mt-2 text-xl font-semibold text-vault-text">{(entropyMeasure * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-[24px] border border-vault-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Seed</p>
              <p className="mt-2 break-all text-sm font-medium text-vault-text">
                {quantumNumber ? `${quantumNumber.slice(0, 14)}...${quantumNumber.slice(-8)}` : 'Pending'}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-vault-border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Entropy sample</p>
            <p className="mt-3 break-all text-sm leading-6 text-vault-text">{entropyPreview}</p>
          </div>
        </div>
      </div>

      <div className="vault-panel overflow-hidden rounded-[30px] p-6 shadow-vault">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Invite QR</p>
        <h3 className="mt-2 text-2xl font-semibold text-vault-text">Scan to join</h3>
        <div className="mt-6 flex justify-center rounded-[28px] border border-vault-border bg-white p-5 shadow-vault-soft">
          <QRCodeSVG value={qrPayload} size={220} bgColor="#ffffff" fgColor="#111827" className="h-auto w-full max-w-[220px]" />
        </div>
        <p className="mt-5 text-sm leading-6 text-vault-muted">
          External scanners and the in-app scanner both resolve this room link. If a passcode is enabled, the join flow will request it after scan.
        </p>
      </div>
    </section>
  );
}
