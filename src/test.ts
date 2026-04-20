import { NextFunction, Request, Response } from "express";
import redisClient from "./redis.client";

// =======================================
// Sliding Window Log Rate Limiter Setup
// =======================================

const rateLimitWindow = 60;    // Window size in seconds
const maxAllowedRequest = 10;  // Max requests per window

const luaScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])

  -- Remove timestamps that have fallen outside the current window
  redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

  -- Count how many requests are still within the window
  local current = redis.call('ZCARD', key)

  if current < limit then
    -- Log this request as a member (score = timestamp, member = timestamp + unique id)
    redis.call('ZADD', key, now, now .. '-' .. redis.call('INCR', key .. ':uid'))
    -- Reset TTL so the key doesn't linger longer than needed
    redis.call('EXPIRE', key, window)
    return current + 1
  else
    return current + 1  -- still return count so caller knows limit was hit
  end
`;

const slidingWindowLogT = async (req: Request, res: Response, next: NextFunction) => {
   const ip = req.socket.remoteAddress ?? "unknown";
   const key = `rate_limit:sliding:${ip}`;

   // Use a high-precision timestamp (seconds with decimals) to avoid collisions
   const now = Date.now() / 1000;

   try {
      const current = await redisClient.eval(luaScript, {
         keys: [key],
         arguments: [
            String(now),
            String(rateLimitWindow),
            String(maxAllowedRequest),
         ],
      }) as number;

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

export default slidingWindowLogT;