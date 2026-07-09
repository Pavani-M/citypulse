import { Router } from "express";
import { createVisit, deleteVisit, getVisitStats, listVisits, updateVisit } from "../controllers/visits.controller";
import { requireAuth } from "../middleware/auth";

export const visitsRouter = Router();

visitsRouter.use(requireAuth);

visitsRouter.get("/stats", getVisitStats);
visitsRouter.get("/", listVisits);
visitsRouter.post("/", createVisit);
visitsRouter.patch("/:id", updateVisit);
visitsRouter.delete("/:id", deleteVisit);
