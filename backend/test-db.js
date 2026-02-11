// test-db.js (for example)
import sequelize from "./config/db.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connection OK");
  } catch (err) {
    console.error("DB connection ERROR:", err);
  } finally {
    process.exit();
  }
})();