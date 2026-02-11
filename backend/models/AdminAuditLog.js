// backend/models/AdminAuditLog.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const AdminAuditLog = sequelize.define(
  "AdminAuditLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    actor_user_id: { type: DataTypes.INTEGER, allowNull: false }, // admin who did it
    actor_email: { type: DataTypes.STRING(255), allowNull: true },

    action: { type: DataTypes.STRING(100), allowNull: false }, // e.g. superadmin.credit_wallet
    target_user_id: { type: DataTypes.INTEGER, allowNull: true },
    target_payment_id: { type: DataTypes.INTEGER, allowNull: true },

    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

    note: { type: DataTypes.TEXT, allowNull: true },

    ip: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "admin_audit_logs",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["actor_user_id"] }, { fields: ["action"] }],
  }
);

export default AdminAuditLog;