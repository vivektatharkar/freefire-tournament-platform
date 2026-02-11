// backend/models/Payment.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    type: {
      type: DataTypes.ENUM("credit", "debit", "withdrawal"),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "success", "failed"),
      defaultValue: "pending",
    },

    gateway: {
      type: DataTypes.STRING(50),
      defaultValue: "manual",
    },

    gateway_order_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    gateway_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    gateway_signature: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    upi_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // ✅ NEW (optional but recommended): store idempotency for prize payouts
    // Example: "PRIZE:tournament:12:R1:U55"
    prize_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    underscored: true,
    timestamps: true,

    // ✅ Indexes (DB will only get these if you migrate or sync/alter)
    indexes: [
      // Helps query history by user quickly
      { fields: ["user_id"] },

      // Optional: prevent paying the same prize twice
      // (Only effective after DB migration creates this column + index)
      { unique: true, fields: ["prize_key"] },
    ],
  }
);

export default Payment;