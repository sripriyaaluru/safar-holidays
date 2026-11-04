// Text size and high-contrast settings, remembered on this device.
import { useEffect, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';
import { readJSON, writeJSON } from '../lib/storage.js';

const KEY = 'safar_a11y';
const SIZES = [
  ['normal', 'A', 'Normal text'],
  ['large', 'A+', 'Large text'],
  ['xlarge', 'A++', 'Extra large text'],
];

export function applyA11y({ size = 'normal', contrast = false, underline = false } = {}) {
  const root = document.documentElement;
  root.dataset.textSize = size;
  root.classList.toggle('high-contrast', contrast);
  root.classList.toggle('underline-links', underline);
}

export default function AccessibilityMenu() {
  const [prefs, setPrefs] = useState(() => readJSON(KEY, { size: 'normal', contrast: false, underline: false }));
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    applyA11y(prefs);
    writeJSON(KEY, prefs);
  }, [prefs]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-full hover:bg-mist"
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="Accessibility settings"
      >
        <Accessibility className="size-5" aria-hidden />
      </button>
      {open && (
        <div id="a11y-panel" className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-line bg-white p-4 shadow-xl">
          <p className="font-display font-bold">Accessibility</p>
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">Text size</legend>
            <div className="mt-2 flex gap-2">
              {SIZES.map(([value, label, name]) => (
                <button
                  key={value}
                  onClick={() => setPrefs((p) => ({ ...p, size: value }))}
                  aria-pressed={prefs.size === value}
                  aria-label={name}
                  className={`flex-1 rounded-xl border py-1.5 font-display font-bold ${
                    prefs.size === value ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
            High contrast
            <input
              type="checkbox"
              className="size-5 accent-ink"
              checked={prefs.contrast}
              onChange={(e) => setPrefs((p) => ({ ...p, contrast: e.target.checked }))}
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
            Underline all links
            <input
              type="checkbox"
              className="size-5 accent-ink"
              checked={prefs.underline}
              onChange={(e) => setPrefs((p) => ({ ...p, underline: e.target.checked }))}
            />
          </label>
          <button
            className="link mt-4 text-sm"
            onClick={() => setPrefs({ size: 'normal', contrast: false, underline: false })}
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
