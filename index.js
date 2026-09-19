import "dotenv/config"
import app from "./app.js";
import redisClient from "./src/config/redis.js";
import logger from "./src/utils/logger.js";


process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled rejection — shutting down");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

const PORT = process.env.PORT || 3001;


async function start() {
  try {
    await redisClient.connect();
    logger.info("Redis client connected successfully");
  } catch (err) {
    logger.error({ err }, "Redis client failed to connect");
  }

  app.listen(PORT, () => {
    logger.info(`Server is listening on port ${PORT}`);
  });
}

start();
