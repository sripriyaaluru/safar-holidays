// Basic protection: security headers on every response and a limit on failed logins.

export function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

/**
 * Remembers failed attempts per IP address in memory. After `max` failures inside
 * `windowMs`, further attempts get "429 Too Many Requests" until the window passes.
 */
export function createAttemptLimiter({ max = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();

  const entry = (key) => {
    const now = Date.now();
    const e = attempts.get(key);
    if (!e || now - e.start > windowMs) {
      const fresh = { count: 0, start: now };
      attempts.set(key, fresh);
      return fresh;
    }
    return e;
  };

  return {
    guard(req, res, next) {
      const e = entry(req.ip);
      if (e.count >= max) {
        const minutes = Math.ceil((windowMs - (Date.now() - e.start)) / 60000);
        res.set('Retry-After', String(minutes * 60));
        return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minutes.` });
      }
      next();
    },
    fail(req) {
      entry(req.ip).count += 1;
    },
    reset(req) {
      attempts.delete(req.ip);
    },
  };
}
