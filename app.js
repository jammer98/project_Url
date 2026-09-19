import express from "express";
import httpLogger from "./src/middlewares/logger.middleware.js";
import urlRoutes from "./src/routes/url.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";

const app = express();

app.use(httpLogger);
app.use(express.json());


app.use("/api/url", urlRoutes);

app.use(errorHandler);

export default app;