import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { connectRedis } from "./redis.js";
import rateLimit from "express-rate-limit";
import routes from "./routes.js";

dotenv.config();
const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS
? process.env.ALLOWED_ORIGINS.split(",")
: "*";
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});
const shortenLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || "30", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});
app.use("/api/shorten", shortenLimiter);

app.use("/", routes);

const PORT = process.env.PORT || 3000;

async function start() {
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
