// backend/models/TeamScore.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/**
 * NOTE:
 * - identity_key column already exists in your DB.
 * - MySQL UNIQUE with NULL columns is unreliable for stopping duplicates,
 *   so identity_key should be used as the unique identity.
 * - Workbench safe-update mode (error 1175) requires WHERE using a KEY column.
 */

const TeamScore = sequelize.define(
  "TeamScore",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    match_type: {
      type: DataTypes.ENUM("tournament", "b2b", "cs", "headshot"),
      allowNull: false,
    },

    match_id: { type: DataTypes.INTEGER, allowNull: false },

    group_no: { type: DataTypes.INTEGER, allowNull: true },
    team_id: { type: DataTypes.INTEGER, allowNull: true },
    team_name: { type: DataTypes.STRING, allowNull: true },

    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // 'rank' is a reserved word in MySQL, but column exists; Sequelize will quote it.
    rank: { type: DataTypes.INTEGER, allowNull: true },

    // ✅ keep NOT NULL; defaultValue prevents Sequelize validation errors on sync/alter
    identity_key: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: "",
    },
  },
  {
    tableName: "team_scores",
    timestamps: false,
    underscored: true,
    indexes: [
      // If this index already exists in DB, Sequelize may try to recreate in alter mode.
      // It's still correct to define it here.
      { name: "uniq_team_scores_identity_key", unique: true, fields: ["identity_key"] },

      { name: "idx_team_scores_match", fields: ["match_type", "match_id"] },
      { name: "idx_team_scores_combo", fields: ["match_type", "match_id", "group_no", "team_id"] },
    ],
    hooks: {
      // Compute identity_key before validation so inserts/updates never violate NOT NULL. [web:1194]
      beforeValidate: (row) => {
        const mt = (row.match_type ?? "").toString();
        const mid = row.match_id ?? "";
        const g =
          row.group_no === null || row.group_no === undefined ? "null" : String(row.group_no);
        const t = row.team_id === null || row.team_id === undefined ? "null" : String(row.team_id);
        row.identity_key = `${mt}:${mid}:g:${g}:t:${t}`;
      },
    },
  }
);

// ✅ Dev-only: do NOT hard-fail if sync/alter/index creation has issues.
// Also backfill identity_key using KEY-based WHERE to avoid Workbench error 1175. [web:1228]
async function ensureTeamScoresTable() {
  if ((process.env.NODE_ENV || "development") === "production") return;

  try {
    // Use alter:true if you want Sequelize to keep schema in dev.
    // If it causes repeated index errors, switch to: await TeamScore.sync();
    await TeamScore.sync({ alter: true });

    // Backfill identity_key for existing rows:
    // safe-update friendly because WHERE uses primary key column (id). [web:1228]
    await sequelize.query(
      `
      UPDATE team_scores
      SET identity_key = CONCAT(
        match_type, ':', match_id,
        ':g:', IFNULL(group_no, 'null'),
        ':t:', IFNULL(team_id, 'null')
      )
      WHERE (identity_key = '' OR identity_key IS NULL) AND id > 0;
      `
    );
  } catch (e) {
    console.error("TeamScore.ensureTeamScoresTable failed:", e?.message || e);
  }
}

ensureTeamScoresTable();

// Export both to avoid import issues
export { TeamScore };
export default TeamScore;