import { NextFunction, Request, Response } from "express";
import redisClient from "./redis.client";

// =======================================
// Fixed Window Counter Rate Limiter Setup
// =======================================

const rateLimitWindow = 60;       // Window size in seconds
const maxAllowedRequest = 10;     // Max requests per window

const luaScript = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

const fixedWindowCounter = async (req: Request, res: Response, next: NextFunction) => {
   const ip = req.socket.remoteAddress ?? "unknown";

   // Build a key that "resets" every window (e.g. every minute)
   const windowStart = Math.floor(Date.now() / 1000 / rateLimitWindow);
   const key = `rate_limit:${ip}:${windowStart}`;

   try {
      const current = await redisClient.eval(luaScript, {
         keys: [key],
         arguments: [String(rateLimitWindow)],
      }) as number;

      // Attach rate limit headers for the client
      res.setHeader("X-RateLimit-Limit", maxAllowedRequest);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxAllowedRequest - current));
      res.setHeader("X-RateLimit-Window", `${rateLimitWindow}s`);

      if (current > maxAllowedRequest) {
         res.status(429).json({
            error: "Too Many Requests",
            message: `Rate limit exceeded. Max ${maxAllowedRequest} requests per ${rateLimitWindow}s window.`,
            retryAfter: rateLimitWindow,
         });
         return;
      }

      next();
   } catch (err) {
      console.error("Rate limiter error:", err);
      // Fail open — let the request through if Redis is down
      next();
   }
};

export default fixedWindowCounter;