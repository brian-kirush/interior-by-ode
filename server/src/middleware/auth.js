const requireAuth = (req, res, next) => {
    if (!req.session.loggedIn) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.loggedIn || req.session.userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

module.exports = { requireAuth, requireAdmin };
