// Small helpers shared by all routes.
import { z } from 'zod';

/** An error that carries an HTTP status code and a message safe to show users. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Validates `data` with a zod schema. Throws a 400 error with a readable message on failure. */
export function validate(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    const message = issue.message.startsWith('Invalid') && field ? `${field}: ${issue.message}` : issue.message;
    throw new HttpError(400, message);
  }
  return result.data;
}

/** Parses a positive integer route parameter such as /:id */
export function idParam(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Invalid ${label}`);
  return id;
}

/** Removes empty query-string values so optional filters can be left blank. */
export function cleanQuery(query) {
  return Object.fromEntries(Object.entries(query || {}).filter(([, v]) => v !== '' && v !== undefined));
}

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{7,16}$/, 'Enter a valid phone number');

/** Today's date as YYYY-MM-DD (server local time). */
export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Central error handler: turns errors into JSON responses. */
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
