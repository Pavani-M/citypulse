import { Router } from "express";
import { queryConcierge } from "../controllers/concierge.controller";

export const conciergeRouter = Router();

conciergeRouter.post("/", queryConcierge);
