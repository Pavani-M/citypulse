import { Router } from "express";
import {
  createRequest,
  getRequestById,
  listRequests,
  postComment,
  postRequestUpdate,
  removeUpvote,
  upvoteRequest,
} from "../controllers/requests.controller";
import { attachAuthIfPresent, requireAuth } from "../middleware/auth";

export const requestsRouter = Router();

requestsRouter.post("/", requireAuth, createRequest);
requestsRouter.get("/", attachAuthIfPresent, listRequests);
requestsRouter.get("/:id", attachAuthIfPresent, getRequestById);
requestsRouter.post("/:id/upvote", requireAuth, upvoteRequest);
requestsRouter.delete("/:id/upvote", requireAuth, removeUpvote);
requestsRouter.post("/:id/updates", requireAuth, postRequestUpdate);
requestsRouter.post("/:id/comments", requireAuth, postComment);
