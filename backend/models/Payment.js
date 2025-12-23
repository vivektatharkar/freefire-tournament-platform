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
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected",
        "success",
        "failed"
      ),
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

    // ✅ THIS IS THE LINE YOU ASKED ABOUT
    upi_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
  }
);

export default Payment;