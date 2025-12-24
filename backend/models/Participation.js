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

    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    b2b_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    cs_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    headshot_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    team_side: {
      type: DataTypes.ENUM("A", "B"),
      allowNull: true,
    },

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