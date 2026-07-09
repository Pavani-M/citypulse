import { Router } from "express";
import { listMyRequests, listUpvotedRequests } from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/upvoted-requests", listUpvotedRequests);
profileRouter.get("/my-requests", listMyRequests);
