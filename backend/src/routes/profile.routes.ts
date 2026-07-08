import { Router } from "express";
import {
  listMyRequests,
  listSavedPlaces,
  listUpvotedRequests,
  savePlace,
  unsavePlace,
} from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/saved-places", listSavedPlaces);
profileRouter.post("/saved-places", savePlace);
profileRouter.delete("/saved-places/:placeId", unsavePlace);
profileRouter.get("/upvoted-requests", listUpvotedRequests);
profileRouter.get("/my-requests", listMyRequests);
