// backend/server.js
/**
 * Server bootstrap
 *
 * - Imports app
 * - Connects to DB (Sequelize) and optionally syncs models
 * - Starts HTTP server on configured port
 * - Handles graceful startup errors
 */

import http from "http";
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

import models from "./models/index.js";
// models expected to export sequelize instance as `sequelize` and models as named exports
// e.g., export { sequelize, User, Payment, Tournament, ... }
const { sequelize } = models;

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Test DB connection and optionally sync (careful with force:true in production)
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected.");

    // Optional: auto-run migrations / sync
    if (process.env.DB_SYNC === "true") {
      console.log("Syncing database schema (DB_SYNC=true) ...");
      await sequelize.sync({ alter: true }); // alter:true is safer for dev; set to false for production
      console.log("Database sync complete.");
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || "development"})`);
    });

    // Optional graceful shutdown handlers
    process.on("unhandledRejection", (reason, p) => {
      console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception thrown:", err);
      // optionally exit after cleanup
      // process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();