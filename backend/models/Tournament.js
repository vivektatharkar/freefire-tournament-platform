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

    // 👇 IMPORTANT: use the SAME NAME as in your DB: price_pool
    // If your column is spelled slightly different, change just this key.
    price_pool: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    slots: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },

    status: {
      type: DataTypes.ENUM("upcoming", "ongoing", "completed"),
      defaultValue: "upcoming",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // room details (these columns already exist in your table)
    room_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    room_password: {
      type: DataTypes.STRING,
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