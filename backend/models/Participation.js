// backend/models/Participation.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Participation = sequelize.define(
  "Participation",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // normal tournament
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // battle‑2‑battle
    b2b_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // clash squad CS
    cs_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // headshot CS
    headshot_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Team/group mapping fields
    group_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 },
    },

    slot_no: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 },
    },

    team_name: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    team_side: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
      validate: { isIn: [["A", "B"]] },
    },

    is_team_leader: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0 },
    },

    match_status: {
      type: DataTypes.ENUM("completed", "cancelled"),
      allowNull: true,
      validate: { isIn: [["completed", "cancelled"]] },
    },
  },
  {
    tableName: "participations",
    underscored: true,

    // enable only created_at (no updated_at) [web:1991][web:2461]
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default Participation;