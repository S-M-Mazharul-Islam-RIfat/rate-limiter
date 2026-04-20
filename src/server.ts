import app from "./app";
import redisClient from "./redis.client";

const PORT = 3000;

async function startServer() {
   try {
      // Connect redis
      await redisClient.connect();
      console.log("Redis is connected successfully");

      // Test route
      app.get("/", async (req, res) => {
         const count = await redisClient.incr("hits");
         res.json({ message: "Hello World", hits: count });
      });

      // Start server
      app.listen(PORT, () => {
         console.log(`Server is running on port ${PORT}`)
      })
   }
   catch (err) {
      console.log("Failed to start server", err);
      process.exit(1);
   }
}

startServer();




