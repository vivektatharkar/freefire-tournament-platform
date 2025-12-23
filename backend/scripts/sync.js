// backend/scripts/sync.js
import { sequelize } from "../models/index.js"; // named export from models/index.js
import models from "../models/index.js";

async function run() {
  try {
    console.log("Authenticating...");
    await sequelize.authenticate();
    console.log("Connected to DB:", sequelize.config.database);

    console.log("Synchronizing models → creating/updating tables (alter:true) ...");
    // alter:true will try to change existing tables without dropping them
    await sequelize.sync({ alter: true });
    console.log("Sync finished. Tables created/updated.");

    // show tables (optional)
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("Tables in DB:", results.map(r => Object.values(r)[0]));

    process.exit(0);
  } catch (err) {
    console.error("SYNC ERROR:", err);
    process.exit(1);
  }
}

run();