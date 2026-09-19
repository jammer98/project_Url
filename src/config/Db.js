
import pg from "pg";
import logger from "../utils/logger.js";

const { Pool } = pg;    

const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
})

pool.on('connect',()=>{
    logger.info('connected to Database');
})

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
  process.exit(1); // an idle client error usually means the connection is unusable — fail loudly instead of limping along
});


export default pool;