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

    // battle‑2‑battle (if you use it)
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

    // NEW: which side in CS / headshot: 'A' or 'B'
    team_side: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
    },

    // NEW: whether this player is team leader for that side
    is_team_leader: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "participations",
    timestamps: false,
  }
);

export default Participation;