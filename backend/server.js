import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import models from "./models/index.js";

dotenv.config();

const { sequelize } = models;
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected.");

    if (process.env.DB_SYNC === "true") {
      console.log("Syncing database...");
      await sequelize.sync({ alter: true });
      console.log("Database sync complete.");
    }

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
