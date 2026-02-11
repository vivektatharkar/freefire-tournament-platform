// backend/models/SupportTicket.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    user_id: { type: DataTypes.INTEGER, allowNull: false },

    subject: { type: DataTypes.STRING(120), allowNull: false },

    status: {
      type: DataTypes.ENUM("open", "in_progress", "closed"),
      allowNull: false,
      defaultValue: "open",
    },

    priority: {
      type: DataTypes.ENUM("low", "normal", "high"),
      allowNull: false,
      defaultValue: "normal",
    },

    source: { type: DataTypes.STRING(40), allowNull: true },

    last_message_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "support_tickets",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["status"] },
      { fields: ["last_message_at"] },
      { fields: ["updated_at"] },
    ],
  }
);

export default SupportTicket;
export { SupportTicket };