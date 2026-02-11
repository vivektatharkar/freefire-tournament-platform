// backend/models/SupportMessage.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SupportMessage = sequelize.define(
  "SupportMessage",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    ticket_id: { type: DataTypes.INTEGER, allowNull: false },

    sender_role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
    },

    sender_user_id: { type: DataTypes.INTEGER, allowNull: true },

    message: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "support_messages",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["ticket_id"] },
      { fields: ["created_at"] },
      { fields: ["sender_role"] },
    ],
  }
);

export default SupportMessage;
export { SupportMessage };