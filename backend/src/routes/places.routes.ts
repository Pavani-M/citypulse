import { Router } from "express";
import { autocomplete, searchPlaces } from "../controllers/places.controller";

export const placesRouter = Router();

placesRouter.get("/search", searchPlaces);
placesRouter.get("/autocomplete", autocomplete);
