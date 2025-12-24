// backend/models/B2BMatch.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const B2BMatch = sequelize.define(
  "B2BMatch",
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
  },
  {
    tableName: "b2bmatches",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default B2BMatch;