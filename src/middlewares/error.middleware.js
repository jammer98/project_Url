import logger from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  const log = req.log || logger; // pino-http's request-scoped logger, tagged with request id

  if (err.isOperational) {
    log.warn({ err }, err.message);
    return res.status(err.statusCode).json({ error: err.message });
  }

  log.error({ err }, "Unexpected error");
  res.status(500).json({ error: "Internal server error" });
}