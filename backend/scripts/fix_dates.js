// backend/scripts/fix_dates.js
/**
 * Fix zero-dates and set sane defaults for created/updated columns
 * Usage: node ./scripts/fix_dates.js
 */

import { sequelize } from "../config/db.js";

const tables = [
  "users",
  "tournaments",
  "teams",
  "team_members",
  "matches",
  "payments",
  "notifications",
];

const colPairs = [
  // [createdColumnName, updatedColumnName, updatedHasOnUpdate]
  ["created_at", "updated_at", true],
  ["createdAt", "updatedAt", true],
];

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows[0].c > 0;
}

async function run() {
  try {
    console.log("Authenticating with DB...");
    await sequelize.authenticate();
    console.log("Connected to DB:", sequelize.config.database);

    for (const table of tables) {
      console.log(`\n--- Processing table: ${table} ---`);
      for (const [createdCol, updatedCol, updatedOnUpdate] of colPairs) {
        const cExists = await columnExists(table, createdCol);
        const uExists = await columnExists(table, updatedCol);

        if (cExists) {
          console.log(`Found column ${createdCol} in ${table} — fixing zero dates...`);
          await sequelize.query(
            `UPDATE \`${table}\` SET \`${createdCol}\` = NOW()
             WHERE \`${createdCol}\` = '0000-00-00 00:00:00' OR \`${createdCol}\` IS NULL`
          );

          // alter to DEFAULT CURRENT_TIMESTAMP (no ON UPDATE for created)
          const alterCreated = `ALTER TABLE \`${table}\`
            MODIFY \`${createdCol}\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`;
          try {
            await sequelize.query(alterCreated);
            console.log(`ALTERED ${table}.${createdCol}`);
          } catch (err) {
            console.warn(`Could not ALTER ${table}.${createdCol}:`, err.message);
          }
        }

        if (uExists) {
          console.log(`Found column ${updatedCol} in ${table} — fixing zero dates...`);
          await sequelize.query(
            `UPDATE \`${table}\` SET \`${updatedCol}\` = NOW()
             WHERE \`${updatedCol}\` = '0000-00-00 00:00:00' OR \`${updatedCol}\` IS NULL`
          );

          // alter updated column with ON UPDATE CURRENT_TIMESTAMP
          const alterUpdated = `ALTER TABLE \`${table}\`
            MODIFY \`${updatedCol}\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
          try {
            await sequelize.query(alterUpdated);
            console.log(`ALTERED ${table}.${updatedCol}`);
          } catch (err) {
            console.warn(`Could not ALTER ${table}.${updatedCol}:`, err.message);
          }
        }

        if (!cExists && !uExists) {
          // nothing of this pair exists on this table — skip
          // console.log(`No ${createdCol}/${updatedCol} in ${table}`);
        }
      }
    }

    console.log("\nDone. Now re-run your sync script (node ./scripts/sync.js) or start the server.");
    process.exit(0);
  } catch (err) {
    console.error("FIX SCRIPT ERROR:", err);
    process.exit(1);
  }
}

run();