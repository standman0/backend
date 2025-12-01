// middleware/adminMiddleware.js

export const adminOnly = (req, res, next) => {
  // authMiddleware must run first to populate req.user
  if (!req.user) {
    return res.status(401).json({ 
      message: "Authentication required" 
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      message: "Access denied. Admin privileges required." 
    });
  }

  next();
};