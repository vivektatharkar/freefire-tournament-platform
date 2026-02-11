// backend/models/CSMatch.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CSMatch = sequelize.define(
  "CSMatch",
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
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    entry_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
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
    status: {
      type: DataTypes.ENUM("upcoming", "ongoing", "completed"),
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

    // existing IDs
    team_a_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    team_b_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // display names
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
    // IMPORTANT: match your actual DB table name
    tableName: "csmatches",   // <- if your table is called csmatches
    // tableName: "cs_matches", // <- use this instead ONLY if DB table is cs_matches
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default CSMatch;