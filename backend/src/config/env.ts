import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  databaseUrl: required("DATABASE_URL"),

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  useMockPlaces: (process.env.USE_MOCK_PLACES ?? "true").toLowerCase() !== "false",
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY ?? "",
};
