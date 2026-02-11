import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Headshot = sequelize.define(
  "Headshot",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },

    // ✅ FIX: add mode (your frontend + routes send mode)
    mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    entry_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    // ✅ FIX: keep prize_pool (your frontend sends prize_pool)
    prize_pool: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    slots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },

    // ✅ FIX: allow the statuses your admin UI uses
    // (your frontend uses upcoming/live/completed/locked)
    status: {
      type: DataTypes.ENUM("upcoming", "live", "completed", "locked"),
      allowNull: false,
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

    team_a_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    team_b_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    team_a_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    team_b_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "headshot",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Headshot;