// backend/models/Team.js
export default (sequelize, Sequelize) => {
  const Team = sequelize.define(
    "Team",
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // For normal tournaments
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // ✅ changed (B2B teams will not have tournament_id)
      },

      // ✅ For B2B matches
      b2b_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      group_no: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      team_name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "",
      },

      leader_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      mode: {
        type: Sequelize.STRING(20),
        allowNull: true, // 'duo' | 'squad'
      },

      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      tableName: "teams",
      timestamps: false,
      indexes: [
        { fields: ["tournament_id"] },
        { fields: ["b2b_id"] }, // ✅ new
        { fields: ["group_no"] },
      ],
    }
  );

  return Team;
};