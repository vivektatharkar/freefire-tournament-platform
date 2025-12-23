// backend/scripts/fix_dates_strict_safe.js
/**
 * Safer fix for zero-dates + strict sql_mode.
 * - Temporarily clears session sql_mode for this connection
 * - Adds/adjusts created/updated datetime columns safely
 *
 * Usage: node ./scripts/fix_dates_strict_safe.js
 *
 * WARNING: back up your DB before running.
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

    // Temporarily clear session sql_mode so zero-dates/old values don't throw.
    try {
      console.log("Saving current session sql_mode and clearing it for this session...");
      const [cur] = await sequelize.query("SELECT @@SESSION.sql_mode as m");
      console.log("Current session sql_mode:", cur?.[0]?.m);
      await sequelize.query("SET SESSION sql_mode = ''");
      console.log("Session sql_mode cleared (only for this connection).");
    } catch (err) {
      console.warn("Could not change session sql_mode:", err.message || err);
      // continue anyway — some hosts may forbid changing session sql_mode
    }

    for (const table of tables) {
      console.log(`\n--- Processing table: ${table} ---`);
      for (const [createdCol, updatedCol, updatedOnUpdate] of colPairs) {
        // CREATED COLUMN
        const createdExists = await columnExists(table, createdCol);

        if (!createdExists) {
          console.log(`Adding column ${createdCol} to ${table} (NULL DEFAULT NULL)`);
          try {
            await sequelize.query(
              `ALTER TABLE \`${table}\` ADD COLUMN \`${createdCol}\` DATETIME NULL DEFAULT NULL`
            );
            console.log(`Added ${createdCol}`);
          } catch (err) {
            console.warn(`Could not add ${createdCol} to ${table}:`, err.message);
          }
        } else {
          try {
            // ensure column is NULLable first to allow updates
            await sequelize.query(
              `ALTER TABLE \`${table}\` MODIFY \`${createdCol}\` DATETIME NULL DEFAULT NULL`
            );
          } catch (err) {
            console.warn(`Could not set ${table}.${createdCol} to NULLABLE:`, err.message);
          }
        }

        // Try update zero-dates / nulls to NOW()
        try {
          console.log(`Updating ${table}.${createdCol}: replacing zero-dates or NULL with NOW()`);
          await sequelize.query(
            `UPDATE \`${table}\` SET \`${createdCol}\` = NOW()
             WHERE \`${createdCol}\` = '0000-00-00 00:00:00' OR \`${createdCol}\` IS NULL`
          );
          console.log(`Updated values for ${createdCol} (if any)`);
        } catch (err) {
          console.warn(`Could not UPDATE ${createdCol} in ${table}:`, err.message);
        }

        // Now make it NOT NULL with default
        try {
          console.log(`Altering ${table}.${createdCol} -> DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`);
          await sequelize.query(
            `ALTER TABLE \`${table}\` MODIFY \`${createdCol}\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
          );
          console.log(`Altered ${createdCol}`);
        } catch (err) {
          console.warn(`Could not ALTER ${createdCol} in ${table}:`, err.message);
        }

        // UPDATED COLUMN
        const updatedExists = await columnExists(table, updatedCol);
        if (!updatedExists) {
          console.log(`Adding column ${updatedCol} to ${table} (NULL DEFAULT NULL)`);
          try {
            await sequelize.query(
              `ALTER TABLE \`${table}\` ADD COLUMN \`${updatedCol}\` DATETIME NULL DEFAULT NULL`
            );
            console.log(`Added ${updatedCol}`);
          } catch (err) {
            console.warn(`Could not add ${updatedCol} to ${table}:`, err.message);
          }
        } else {
          try {
            await sequelize.query(
              `ALTER TABLE \`${table}\` MODIFY \`${updatedCol}\` DATETIME NULL DEFAULT NULL`
            );
          } catch (err) {
            console.warn(`Could not set ${table}.${updatedCol} to NULLABLE:`, err.message);
          }
        }

        try {
          console.log(`Updating ${table}.${updatedCol}: replacing zero-dates or NULL with NOW()`);
          await sequelize.query(
            `UPDATE \`${table}\` SET \`${updatedCol}\` = NOW()
             WHERE \`${updatedCol}\` = '0000-00-00 00:00:00' OR \`${updatedCol}\` IS NULL`
          );
          console.log(`Updated values for ${updatedCol} (if any)`);
        } catch (err) {
          console.warn(`Could not UPDATE ${updatedCol} in ${table}:`, err.message);
        }

        // Finally alter updated column to have ON UPDATE CURRENT_TIMESTAMP
        try {
          console.log(`Altering ${table}.${updatedCol} -> DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
          await sequelize.query(
            `ALTER TABLE \`${table}\` MODIFY \`${updatedCol}\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
          );
          console.log(`Altered ${updatedCol}`);
        } catch (err) {
          console.warn(`Could not ALTER ${updatedCol} in ${table}:`, err.message);
        }
      }
    }

    console.log("\nAll done. Try running your sync (node ./scripts/sync.js) or start the server.");
    process.exit(0);
  } catch (err) {
    console.error("FIX SCRIPT ERROR:", err);
    process.exit(1);
  }
}

run();