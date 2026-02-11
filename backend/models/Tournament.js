// backend/models/Tournament.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Tournament = sequelize.define(
  "Tournament",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    entry_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    // 👇 IMPORTANT: same as DB column: price_pool
    price_pool: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    slots: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },

    status: {
      // your table has: enum('upcoming','ongoing','completed','live')
      type: DataTypes.ENUM("upcoming", "ongoing", "completed", "live"),
      defaultValue: "upcoming",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    room_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    room_password: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ✅ Tournament lock flag (tinyint(1) in DB)
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // ✅ Game mode: solo / duo / squad / BR_SINGLE etc.
    mode: {
      type: DataTypes.STRING, // matches varchar(50) in your DB
      allowNull: true,
    },
  },
  {
    tableName: "tournaments",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Tournament;