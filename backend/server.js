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
const { sequelize } = models;

const PORT = process.env.PORT || 5000;

function isDeadlock(err) {
  const msg = (err?.original?.message || err?.message || "").toLowerCase();
  return msg.includes("deadlock found") || msg.includes("er_lock_deadlock");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function syncWithRetry(syncFn, { max = 4, baseDelay = 350 } = {}) {
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      await syncFn();
      return;
    } catch (err) {
      const canRetry = isDeadlock(err);
      if (!canRetry || attempt === max) throw err;

      const wait = baseDelay * attempt;
      console.warn(`DB sync deadlock, retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
}

async function start() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected.");

    // ✅ NEW: Sync ONLY audit logs table (fast + safe)
    // Run: SYNC_AUDIT=true node server.js
    if (process.env.SYNC_AUDIT === "true") {
      const isProd = (process.env.NODE_ENV || "development") === "production";
      if (isProd) {
        console.warn("SYNC_AUDIT=true ignored in production for safety.");
      } else {
        try {
          const { AdminAuditLog } = models;
          if (AdminAuditLog && typeof AdminAuditLog.sync === "function") {
            console.log("Syncing admin audit logs table (SYNC_AUDIT=true) ...");
            await syncWithRetry(() => AdminAuditLog.sync({ alter: true }), {
              max: Number(process.env.DB_SYNC_RETRIES || 4),
              baseDelay: Number(process.env.DB_SYNC_DELAY || 350),
            });
            console.log("Admin audit logs sync complete.");
          } else {
            console.warn("AdminAuditLog model not found. Did you export it in models/index.js?");
          }
        } catch (e) {
          console.error("Admin audit logs sync failed:", e?.message || e);
        }
      }
    }

    // Optional: auto-run schema sync (DEV ONLY recommended)
    if (process.env.DB_SYNC === "true") {
      const isProd = (process.env.NODE_ENV || "development") === "production";
      if (isProd) {
        console.warn("DB_SYNC=true ignored in production for safety.");
      } else {
        console.log("Syncing database schema (DB_SYNC=true) ...");
        // NOTE: alter:true can be slow / risky in real production environments.
        await syncWithRetry(() => sequelize.sync({ alter: true }), {
          max: Number(process.env.DB_SYNC_RETRIES || 4),
          baseDelay: Number(process.env.DB_SYNC_DELAY || 350),
        });
        console.log("Database sync complete.");
      }
    }

    /**
     * OPTIONAL (recommended):
     * If you removed SupportTicket.sync()/SupportMessage.sync() from model files,
     * you can enable ONLY support sync like this:
     *
     * SYNC_SUPPORT=true node server.js
     */
    if (process.env.SYNC_SUPPORT === "true") {
      const isProd = (process.env.NODE_ENV || "development") === "production";
      if (isProd) {
        console.warn("SYNC_SUPPORT=true ignored in production for safety.");
      } else {
        try {
          const { SupportTicket, SupportMessage } = models;

          if (SupportTicket && SupportMessage) {
            console.log("Syncing support tables (SYNC_SUPPORT=true) ...");
            await syncWithRetry(() => SupportTicket.sync({ alter: true }), {
              max: Number(process.env.DB_SYNC_RETRIES || 4),
              baseDelay: Number(process.env.DB_SYNC_DELAY || 350),
            });
            await syncWithRetry(() => SupportMessage.sync({ alter: true }), {
              max: Number(process.env.DB_SYNC_RETRIES || 4),
              baseDelay: Number(process.env.DB_SYNC_DELAY || 350),
            });
            console.log("Support tables sync complete.");
          } else {
            console.warn(
              "SupportTicket/SupportMessage not found in models. Skipping support sync."
            );
          }
        } catch (e) {
          console.error("Support tables sync failed:", e?.message || e);
        }
      }
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(
        `Server listening on port ${PORT} (env=${process.env.NODE_ENV || "development"})`
      );
    });

    // Graceful shutdown (optional)
    const shutdown = async (signal) => {
      try {
        console.log(`${signal} received. Shutting down...`);
        server.close(async () => {
          try {
            await sequelize.close();
          } catch (e) {
            console.error("Error closing DB:", e);
          }
          process.exit(0);
        });
      } catch (e) {
        console.error("Shutdown error:", e);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("unhandledRejection", (reason, p) => {
      console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception thrown:", err);
      // process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();