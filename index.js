import dotenv from "dotenv";
import app from "./app";
import logger from "./src/utils/logger";

dotenv.config();


app.listen(process.env.PORT || 3001,()=>{
    logger.info(`server is listing on port:${process.env.PORT}`)
})
