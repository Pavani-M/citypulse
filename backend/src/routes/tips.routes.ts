import { Router } from "express";
import {
  createTip,
  deleteTip,
  listTips,
  pinTip,
  reportTip,
  updateTip,
  voteTip,
} from "../controllers/tips.controller";
import { attachAuthIfPresent, requireAuth, requireRole } from "../middleware/auth";

export const tipsRouter = Router({ mergeParams: true });

tipsRouter.get("/", attachAuthIfPresent, listTips);
tipsRouter.post("/", requireAuth, createTip);
tipsRouter.patch("/:tipId", requireAuth, updateTip);
tipsRouter.delete("/:tipId", requireAuth, deleteTip);
tipsRouter.post("/:tipId/vote", requireAuth, voteTip);
tipsRouter.post("/:tipId/report", requireAuth, reportTip);
tipsRouter.patch("/:tipId/pin", requireAuth, requireRole("admin"), pinTip);
