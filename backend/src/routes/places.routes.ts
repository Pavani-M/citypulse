import { Router } from "express";
import { searchPlaces } from "../controllers/places.controller";

export const placesRouter = Router();

placesRouter.get("/search", searchPlaces);
