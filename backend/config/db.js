// backend/config/db.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = process.env.DB_NAME || "freefire";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const DIALECT = process.env.DB_DIALECT || "mysql";

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DIALECT,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// ✅ Development helper: create/alter tables automatically
export async function syncDatabase() {
  if ((process.env.NODE_ENV || "development") === "production") return;

  try {
    // alter:true updates schema in dev so new tables/columns appear
    await sequelize.sync({ alter: true });
  } catch (err) {
    console.error("sequelize.sync() failed:", err?.message || err);
  }
}

export default sequelize;
export { sequelize };