// backend/models/index.js
// Robust models registry for Freefire project.

import sequelize from "../config/db.js";
import { Sequelize } from "sequelize";

// Import model modules
import UserModule from "./User.js";
import TournamentModule from "./Tournament.js";
import PaymentModule from "./Payment.js";
import ParticipationModule from "./Participation.js";
import B2BMatchModule from "./B2BMatch.js";
import HeadshotModule from "./Headshot.js";
import CSMatchModule from "./CSMatch.js";

// ✅ Notification is a factory now
import NotificationImport from "./Notification.js";

// NEW: import Team / TeamMember model modules
import TeamModule from "./Team.js";
import TeamMemberModule from "./TeamMember.js";

// ✅ NEW: support models
import SupportTicketModule from "./SupportTicket.js";
import SupportMessageModule from "./SupportMessage.js";

// ✅ NEW: Admin audit logs
import AdminAuditLogModule from "./AdminAuditLog.js";

function unwrapDefault(m) {
  return m && typeof m === "object" && "default" in m ? m.default : m;
}

function isSequelizeModel(obj) {
  try {
    return !!(obj && typeof obj === "function" && obj.prototype instanceof Sequelize.Model);
  } catch {
    return false;
  }
}

function instantiate(modelImport) {
  try {
    if (!modelImport) return null;

    const unwrapped = unwrapDefault(modelImport);

    if (isSequelizeModel(unwrapped)) return unwrapped;

    if (typeof unwrapped === "function") {
      return unwrapped(sequelize, Sequelize);
    }

    return unwrapped;
  } catch (err) {
    console.warn("Model instantiate warning:", err?.message || err);
    return unwrapDefault(modelImport);
  }
}

// Instantiate models
const User = instantiate(UserModule);
const Tournament = instantiate(TournamentModule);
const Payment = instantiate(PaymentModule);
const Participation = instantiate(ParticipationModule);
const B2BMatch = instantiate(B2BMatchModule);
const Headshot = instantiate(HeadshotModule);
const CSMatch = instantiate(CSMatchModule);

// ✅ FIX: instantiate the Notification factory -> real Sequelize model
const NotificationModel = instantiate(NotificationImport);

// NEW: instantiate Team / TeamMember
const Team = instantiate(TeamModule);
const TeamMember = instantiate(TeamMemberModule);

// ✅ NEW: instantiate SupportTicket / SupportMessage
const SupportTicket = instantiate(SupportTicketModule);
const SupportMessage = instantiate(SupportMessageModule);

// ✅ NEW: instantiate AdminAuditLog
const AdminAuditLog = instantiate(AdminAuditLogModule);

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

// Tournament <-> Participation
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

// User <-> Participation
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

// User <-> Payment
tryAssociate(() => {
  if (
    User &&
    Payment &&
    typeof User.hasMany === "function" &&
    typeof Payment.belongsTo === "function"
  ) {
    User.hasMany(Payment, { foreignKey: "user_id", as: "payments" });
    Payment.belongsTo(User, { foreignKey: "user_id", as: "user" });
  }
}, "User <-> Payment");

// ✅ User <-> AdminAuditLog
tryAssociate(() => {
  if (
    User &&
    AdminAuditLog &&
    typeof User.hasMany === "function" &&
    typeof AdminAuditLog.belongsTo === "function"
  ) {
    User.hasMany(AdminAuditLog, { foreignKey: "actor_user_id", as: "adminLogs" });
    AdminAuditLog.belongsTo(User, { foreignKey: "actor_user_id", as: "actor" });
  }
}, "User <-> AdminAuditLog");

// Tournament <-> Payment
tryAssociate(() => {
  if (
    Tournament &&
    Payment &&
    typeof Tournament.hasMany === "function" &&
    typeof Payment.belongsTo === "function"
  ) {
    Tournament.hasMany(Payment, { foreignKey: "tournament_id", as: "payments" });
    Payment.belongsTo(Tournament, {
      foreignKey: "tournament_id",
      as: "tournament",
    });
  }
}, "Tournament <-> Payment");

// User <-> Notification
tryAssociate(() => {
  if (
    User &&
    NotificationModel &&
    typeof User.hasMany === "function" &&
    typeof NotificationModel.belongsTo === "function"
  ) {
    User.hasMany(NotificationModel, {
      foreignKey: "user_id",
      as: "notifications",
    });
    NotificationModel.belongsTo(User, { foreignKey: "user_id", as: "user" });
  }
}, "User <-> Notification");

// Tournament <-> Team
tryAssociate(() => {
  if (
    Tournament &&
    Team &&
    typeof Tournament.hasMany === "function" &&
    typeof Team.belongsTo === "function"
  ) {
    Tournament.hasMany(Team, { foreignKey: "tournament_id" });
    Team.belongsTo(Tournament, { foreignKey: "tournament_id" });
  }
}, "Tournament <-> Team");

// Team <-> TeamMember
tryAssociate(() => {
  if (
    Team &&
    TeamMember &&
    typeof Team.hasMany === "function" &&
    typeof TeamMember.belongsTo === "function"
  ) {
    Team.hasMany(TeamMember, { foreignKey: "team_id", as: "members" });
    TeamMember.belongsTo(Team, { foreignKey: "team_id", as: "team" });
  }
}, "Team <-> TeamMember");

// User <-> TeamMember
tryAssociate(() => {
  if (
    User &&
    TeamMember &&
    typeof User.hasMany === "function" &&
    typeof TeamMember.belongsTo === "function"
  ) {
    User.hasMany(TeamMember, { foreignKey: "user_id" });
    TeamMember.belongsTo(User, { foreignKey: "user_id" });
  }
}, "User <-> TeamMember");

// SupportTicket <-> SupportMessage
tryAssociate(() => {
  if (
    SupportTicket &&
    SupportMessage &&
    typeof SupportTicket.hasMany === "function" &&
    typeof SupportMessage.belongsTo === "function"
  ) {
    SupportTicket.hasMany(SupportMessage, { foreignKey: "ticket_id", as: "messages" });
    SupportMessage.belongsTo(SupportTicket, { foreignKey: "ticket_id", as: "ticket" });
  }
}, "SupportTicket <-> SupportMessage");

// User <-> SupportTicket
tryAssociate(() => {
  if (
    User &&
    SupportTicket &&
    typeof User.hasMany === "function" &&
    typeof SupportTicket.belongsTo === "function"
  ) {
    User.hasMany(SupportTicket, { foreignKey: "user_id", as: "supportTickets" });
    SupportTicket.belongsTo(User, { foreignKey: "user_id", as: "user" });
  }
}, "User <-> SupportTicket");

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
  Notification: NotificationModel,
  Team,
  TeamMember,
  SupportTicket,
  SupportMessage,
  AdminAuditLog,
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
  NotificationModel as Notification,
  Team,
  TeamMember,
  SupportTicket,
  SupportMessage,
  AdminAuditLog,
};