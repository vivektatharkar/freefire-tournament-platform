// backend/models/User.js
export default function (sequelize, DataTypes) {
  return sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      name: { type: DataTypes.STRING(255), allowNull: false },

      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },

      // phone MUST be string to keep leading zeros
      phone: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },

      // store hashed password here
      password_hash: { type: DataTypes.STRING(255), allowNull: false },

      // ✅ Freefire / game ID field (you already have this column in DB)
      game_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "",
      },

      role: {
        type: DataTypes.ENUM("user", "admin"),
        allowNull: false,
        defaultValue: "user",
      },

      wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    {
      tableName: "users",
      underscored: true, // maps created_at / updated_at
      timestamps: true,  // uses created_at / updated_at
    }
  );
}