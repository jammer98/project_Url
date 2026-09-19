import redis from "redis";
import logger from "../utils/logger.js";

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
});

redisClient.on("connect", () => {
  logger.info("Redis client connecting...");
});

redisClient.on("ready", () => {
  logger.info("Redis client ready");
});

redisClient.on("error", (err) => {
  logger.error({ err }, "Redis client error");
});

export default redisClient;