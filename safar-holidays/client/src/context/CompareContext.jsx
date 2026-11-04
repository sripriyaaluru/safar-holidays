// Packages picked for side-by-side comparison (up to 3), kept across page reloads.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage.js';

const CompareContext = createContext(null);
const KEY = 'safar_compare';
export const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => readJSON(KEY, []));

  const save = (next) => {
    writeJSON(KEY, next);
    return next;
  };

  /** Adds or removes a package. Returns 'added', 'removed' or 'full'. */
  const toggle = useCallback(
    (pkg) => {
      if (items.some((p) => p.id === pkg.id)) {
        setItems(save(items.filter((p) => p.id !== pkg.id)));
        return 'removed';
      }
      if (items.length >= MAX_COMPARE) return 'full';
      setItems(save([...items, { id: pkg.id, title: pkg.title, destination: pkg.destination, image_url: pkg.image_url }]));
      return 'added';
    },
    [items],
  );

  const remove = useCallback((id) => setItems((prev) => save(prev.filter((p) => p.id !== id))), []);
  const clear = useCallback(() => setItems(save([])), []);

  const value = useMemo(
    () => ({ items, ids: items.map((p) => p.id), toggle, remove, clear, has: (id) => items.some((p) => p.id === id) }),
    [items, toggle, remove, clear],
  );
  return <CompareContext value={value}>{children}</CompareContext>;
}

export function useCompare() {
  return useContext(CompareContext);
}
