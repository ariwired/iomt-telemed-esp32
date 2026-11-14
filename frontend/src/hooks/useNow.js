import { useEffect, useState } from 'react';

/** Hora atual, atualizada a cada `intervalMs`. Útil para textos como "há 12s". */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
