import { Router } from "express";
import {
  addPlaceToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  removePlaceFromCollection,
  renameCollection,
} from "../controllers/collections.controller";
import { requireAuth } from "../middleware/auth";

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

collectionsRouter.get("/", listCollections);
collectionsRouter.post("/", createCollection);
collectionsRouter.patch("/:id", renameCollection);
collectionsRouter.delete("/:id", deleteCollection);
collectionsRouter.post("/:id/places", addPlaceToCollection);
collectionsRouter.delete("/:id/places/:placeId", removePlaceFromCollection);
