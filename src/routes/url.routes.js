import { Router } from "express";
import { AppError } from "../utils/appError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { CreateShorturl , GetOriginalUrl } from "../services/url.service.js";

const router = Router();

router.post("/", catchAsync(async(req,res) => {
    const { url } = req.body;

    if(!url) throw new AppError ("url is required",400);

    const result = await CreateShorturl(url);
    res.status(201).json({ shorturl: `${req.protocol}://${req.get("host")}/${result.short_code}`});
}))

router.get("/:code",catchAsync(async(req,res)=>{
    const originalUrl = await GetOriginalUrl(req.params.code);
    res.redirect(originalUrl);
}))


export default router;