"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = void 0;
// Mirror of src/lib/firestore/collections.ts. Kept in sync manually until
// a shared package or codegen step is introduced.
exports.COLLECTIONS = {
    users: "users",
    clubs: "clubs",
    leagues: "leagues",
    seasons: "seasons",
    userRoles: "userRoles",
    roleEvents: "roleEvents",
    notifications: "notifications",
    auditLog: "auditLog",
    // Ladder + match collections
    playDates: "playDates",
    ladderSessions: "ladderSessions",
    ladderCourts: "ladderCourts",
    ladderMatches: "ladderMatches",
    standingsSnapshots: "standingsSnapshots",
    audits: "audits",
    // Player + ELO collections
    players: "players",
    eloEvents: "eloEvents",
};
//# sourceMappingURL=collections.js.map