// backend/models/index.js
// Robust models registry for Freefire project.
// Fixes: avoids calling ES6 Model classes as functions (prevents "Class constructor model cannot be invoked without 'new'")
// Expects backend/config/db.js to export a Sequelize instance (default export).

import sequelize, { Sequelize } from "../config/db.js";

// Import model modules from same folder
import UserModule from "./User.js";
import TournamentModule from "./Tournament.js";
import PaymentModule from "./Payment.js";
import ParticipationModule from "./Participation.js";
import B2BMatchModule from "./B2BMatch.js";
import HeadshotModule from "./Headshot.js";
import CSMatchModule from "./CSMatch.js";
import NotificationModule from "./Notification.js";

/**
 * Detect if an export is a Sequelize Model class.
 * Example: `class User extends Model {}` -> prototype instanceof Sequelize.Model
 */
function isModelClass(obj) {
  try {
    return (
      typeof obj === "function" &&
      obj.prototype &&
      obj.prototype instanceof Sequelize.Model
    );
  } catch (e) {
    return false;
  }
}

/**
 * If the module export is a function:
 *  - If it's a Model class -> return it (don't call)
 *  - Else assume it's a factory and call with (sequelize, Sequelize)
 * If it's not a function, return as-is (already instantiated model)
 */
function instantiate(modelImport) {
  try {
    if (!modelImport) return null;

    // If it's a Model class (subclass of Sequelize.Model), return as-is
    if (isModelClass(modelImport)) {
      return modelImport;
    }

    // If it's a function (factory), call it with (sequelize, Sequelize)
    if (typeof modelImport === "function") {
      return modelImport(sequelize, Sequelize);
    }

    // Otherwise assume it's already a model instance and return it
    return modelImport;
  } catch (err) {
    console.warn(
      "Model instantiate warning:",
      err && err.message ? err.message : err
    );
    return modelImport;
  }
}

// Instantiate models safely
const User = instantiate(UserModule);
const Tournament = instantiate(TournamentModule);
const Payment = instantiate(PaymentModule);
const Participation = instantiate(ParticipationModule);
const B2BMatch = instantiate(B2BMatchModule);
const Headshot = instantiate(HeadshotModule);
const CSMatch = instantiate(CSMatchModule);
const Notification = instantiate(NotificationModule);

// Helper to attempt an association and log problems without crashing
function tryAssociate(fn, description) {
  try {
    fn();
  } catch (err) {
    console.warn(
      `Skipping association (${description}):`,
      err && err.message ? err.message : err
    );
  }
}

// Setup associations (guarded)
tryAssociate(() => {
  if (
    Tournament &&
    Participation &&
    typeof Tournament.hasMany === "function" &&
    typeof Participation.belongsTo === "function"
  ) {
    Tournament.hasMany(Participation, { foreignKey: "tournament_id" });
    Participation.belongsTo(Tournament, { foreignKey: "tournament_id" });
  }
}, "Tournament <-> Participation");

tryAssociate(() => {
  if (
    User &&
    Participation &&
    typeof User.hasMany === "function" &&
    typeof Participation.belongsTo === "function"
  ) {
    User.hasMany(Participation, { foreignKey: "user_id" });
    Participation.belongsTo(User, { foreignKey: "user_id" });
  }
}, "User <-> Participation");

tryAssociate(() => {
  if (
    User &&
    Payment &&
    typeof User.hasMany === "function" &&
    typeof Payment.belongsTo === "function"
  ) {
    User.hasMany(Payment, { foreignKey: "user_id" });
    Payment.belongsTo(User, { foreignKey: "user_id" });
  }
}, "User <-> Payment");

tryAssociate(() => {
  if (
    Tournament &&
    Payment &&
    typeof Tournament.hasMany === "function" &&
    typeof Payment.belongsTo === "function"
  ) {
    Tournament.hasMany(Payment, { foreignKey: "tournament_id" });
    Payment.belongsTo(Tournament, { foreignKey: "tournament_id" });
  }
}, "Tournament <-> Payment");

tryAssociate(() => {
  if (
    User &&
    Notification &&
    typeof User.hasMany === "function" &&
    typeof Notification.belongsTo === "function"
  ) {
    User.hasMany(Notification, { foreignKey: "user_id" });
    Notification.belongsTo(User, { foreignKey: "user_id" });
  }
}, "User <-> Notification");

// Export everything (default and named exports)
const models = {
  sequelize,
  Sequelize,
  User,
  Tournament,
  Payment,
  Participation,
  B2BMatch,
  Headshot,
  CSMatch,
  Notification,
};

export default models;

export {
  sequelize,
  Sequelize,
  User,
  Tournament,
  Payment,
  Participation,
  B2BMatch,
  Headshot,
  CSMatch,
  Notification,
};