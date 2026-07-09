import { Router } from "express";
import { autocomplete, searchPlaces } from "../controllers/places.controller";
import { tipsRouter } from "./tips.routes";

export const placesRouter = Router();

placesRouter.get("/search", searchPlaces);
placesRouter.get("/autocomplete", autocomplete);
placesRouter.use("/:placeId/tips", tipsRouter);
