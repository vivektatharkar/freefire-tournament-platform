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

      phone: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },

      password_hash: { type: DataTypes.STRING(255), allowNull: false },

      game_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "",
      },

      // ✅ add superadmin role (does NOT break existing data)
      role: {
        type: DataTypes.ENUM("user", "admin", "superadmin"),
        allowNull: false,
        defaultValue: "user",
      },

      wallet_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      last_login_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      last_active_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
    }
  );
}