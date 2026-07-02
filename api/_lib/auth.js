// ── Admin auth: password check + HMAC-signed session cookie ──
// Password lives in the ADMIN_PASSWORD env var (set on Vercel).
// The session token is `expiry.hmac(expiry)` — stateless, no DB.
import crypto from 'node:crypto';

const PASSWORD = process.env.ADMIN_PASSWORD || 'matija123'; // dev fallback only
const KEY = crypto
  .createHash('sha256')
  .update('session:' + (process.env.SESSION_SECRET || PASSWORD))
  .digest();

const COOKIE_NAME = 'admin_session';
const SESSION_DAYS = 7;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function checkPassword(pw) {
  const a = crypto.createHash('sha256').update(String(pw || '')).digest('hex');
  const b = crypto.createHash('sha256').update(PASSWORD).digest('hex');
  return safeEqual(a, b);
}

function sign(exp) {
  return crypto.createHmac('sha256', KEY).update(String(exp)).digest('hex');
}

export function makeToken() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig) return false;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export function isAuthed(req) {
  const cookies = req.headers.cookie || '';
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? verifyToken(decodeURIComponent(m[1])) : false;
}

export function sessionCookie(req) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE_NAME}=${makeToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
