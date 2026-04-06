import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ShareInvite({ inviteLink, shortCode, showQR = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join VaultChat Room',
          text: `Join my ephemeral quantum-encrypted room (Code: ${shortCode})`,
          url: inviteLink
        });
      } catch (err) {
        console.log('Share dismissed or failed', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {showQR && (
        <div className="rounded-2xl bg-white p-4">
          <QRCodeSVG value={inviteLink} size={240} bgColor="#ffffff" fgColor="#0a0a0a" />
        </div>
      )}
      
      <div className="flex w-full max-w-sm gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-lg border border-vault-accent/30 bg-black/40 px-3 py-2 text-sm text-vault-text hover:bg-vault-accent/10 transition"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        {Boolean(navigator.share) && (
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 rounded-lg border border-vault-accentAlt/40 bg-vault-accentAlt/10 px-3 py-2 text-sm text-vault-accentAlt hover:bg-vault-accentAlt/20 transition"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
