export default function requireAuthConfig(_req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Authentication is not configured. Set JWT_SECRET in backend/.env and restart the API.' });
  }
  return next();
}
