// backend/models/TeamMember.js
export default (sequelize, Sequelize) => {
  const TeamMember = sequelize.define(
    "TeamMember",
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "teams",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      slot_no: {
        type: Sequelize.INTEGER,
        allowNull: false, // 1..2 for duo, 1..4 for squad
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      player_game_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    },
    {
      tableName: "team_members",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        // each slot within a team can be occupied by only one member
        {
          unique: true,
          fields: ["team_id", "slot_no"],
        },
        // quick lookup by user
        {
          fields: ["user_id"],
        },
      ],
    }
  );

  return TeamMember;
};