import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { requestsRouter } from "./routes/requests.routes";
import { placesRouter } from "./routes/places.routes";
import { profileRouter } from "./routes/profile.routes";
import { collectionsRouter } from "./routes/collections.routes";
import { visitsRouter } from "./routes/visits.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mockPlaces: env.useMockPlaces });
});

app.use("/api/auth", authRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/places", placesRouter);
app.use("/api/me", profileRouter);
app.use("/api/me/collections", collectionsRouter);
app.use("/api/me/visits", visitsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`CityPulse API listening on http://localhost:${env.port}`);
  console.log(`Places mode: ${env.useMockPlaces ? "MOCK (no API key needed)" : "LIVE (Foursquare)"}`);
});
