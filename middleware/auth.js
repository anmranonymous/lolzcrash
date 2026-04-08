function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // If it's an API request, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, msg: 'Please login first' });
  }
  // Otherwise redirect to login page
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, msg: 'Admin access required' });
  }
  res.redirect('/admin/login');
}

module.exports = { requireAuth, requireAdmin };
