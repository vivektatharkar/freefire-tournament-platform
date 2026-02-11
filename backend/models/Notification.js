// backend/models/Notification.js
import { DataTypes } from "sequelize";

export default function NotificationModel(sequelize) {
  const Notification = sequelize.define(
    "Notification",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING(50), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      read_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "notifications",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["user_id", "read_flag"] },
        { fields: ["user_id", "created_at"] },
      ],
    }
  );

  return Notification;
}