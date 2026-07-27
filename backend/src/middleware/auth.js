import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * - Verify token
 * - Attach decoded payload to req.user
 */
export function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Authorization token missing",
    });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user payload
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
}