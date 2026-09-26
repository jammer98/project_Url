import { nanoid } from 'nanoid';
import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/appError.js';


async function CreateShorturl(originalUrl) {
    const shortCode = nanoid(6);

    try {
        await redisClient.set(shortCode, originalUrl);
    } catch (err) {
        logger.error({ err, shortCode }, "Failed to cache original URL in Redis");
    }
   
    const { rows } = await pool.query("INSERT INTO urls (short_code, original_url) VALUES ($1, $2) RETURNING *", [shortCode, originalUrl]);
    logger.info("Short URL created successfully:", { shortCode, originalUrl });

    return rows[0];
}

async function GetOriginalUrl(shortCode) {
    
    let cached = null;

    try{
        cached = await redisClient.get(shortCode);
    } catch (error) {
        logger.warn({ error, shortCode }, "Redis cache retrieval failed, proceeding to database query");
    }

    if (cached) {
        logger.info({ shortCode }, "Cache HIT");
        await pool.query("UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1", [shortCode])
            .catch(err => logger.error({ err, shortCode }, "Failed to update click count in database"));
        return cached;
    }

    logger.info({ shortCode }, "Cache MISS,querying DB");

    const { rows } = await pool.query("UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1 RETURNING original_url", [shortCode]);

    if(!rows[0]) {
        logger.warn({ shortCode }, "short code not found in database");
        throw new AppError("Short utl not found", 404);
    }

    try{
        await redisClient.set(shortCode, rows[0].original_url,{EX:3600});
    } catch (error) {
        logger.warn({ error, shortCode }, "Failed to cache original URL in Redis");
    }
    return rows[0].original_url;
}

export { CreateShorturl, GetOriginalUrl };