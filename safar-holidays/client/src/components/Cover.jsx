// Shows a package photo, or a coloured panel with the place name if the photo cannot load
// (for example when the project is demoed without internet).
import { useState } from 'react';

const PANELS = [
  'from-peacock to-ink',
  'from-marigold-deep to-sindoor',
  'from-ink-soft to-peacock',
  'from-leaf to-peacock',
  'from-sindoor to-ink',
];

function pickPanel(text = '') {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PANELS[hash % PANELS.length];
}

export default function Cover({ src, alt, label, className = '', eager = false, small = false }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-end bg-linear-to-br p-4 ${pickPanel(label || alt)} ${className}`}
      >
        {/* Thumbnails are too small for text, so they only show the colour */}
        {!small && (
          <span className="font-display text-xl font-bold leading-tight text-white/90">{label || alt}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailedSrc(src)}
      className={`bg-mist object-cover ${className}`}
    />
  );
}
