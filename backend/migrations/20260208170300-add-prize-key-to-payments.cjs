"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // add column
      await queryInterface.addColumn(
        "payments",
        "prize_key",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
          defaultValue: null,
        },
        { transaction }
      );

      // add unique index
      await queryInterface.addIndex(
        "payments",
        ["prize_key"],
        {
          unique: true,
          name: "payments_prize_key_unique",
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // remove index first, then column
      await queryInterface.removeIndex("payments", "payments_prize_key_unique", {
        transaction,
      });

      await queryInterface.removeColumn("payments", "prize_key", {
        transaction,
      });
    });
  },
};