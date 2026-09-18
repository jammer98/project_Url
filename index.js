import dotenv from "dotenv";
import express from "express";
import httpLogger from "./src/middlewares/logger.middleware";
import urlRoutes from "./src/routes/url.routes.js";
import healthRoutes from "./src/routes/health.routes.js";


dotenv.config();

const app = express();

app.use(httpLogger);
app.use(express.json());
app.use("/api/url", urlRoutes);
app.use("/health", healthRoutes);


app.get("/",)