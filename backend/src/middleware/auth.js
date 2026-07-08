import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * - Verify token
 * - Attach decoded user to req.user
 */
export function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header missing",
      });
    }

    const token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user payload ke request
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
}