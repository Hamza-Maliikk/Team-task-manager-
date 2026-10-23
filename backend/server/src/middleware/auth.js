export const requireAuth = (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ message: 'Please log in' });
