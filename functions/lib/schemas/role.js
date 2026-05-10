"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetUserGlobalRoleInput = exports.LegacyRole = exports.DeactivateUserRoleInput = exports.AssignRoleInput = exports.RoleKey = void 0;
// Parallel copy of src/lib/schemas/role.ts. Kept in sync manually until a
// shared package extracts these schemas. Both copies must remain
// byte-equivalent for client/server validation parity.
const zod_1 = require("zod");
const NonEmptyId = zod_1.z.string().trim().min(1).max(128);
exports.RoleKey = zod_1.z.enum([
    "SiteAdmin",
    "ClubDirector",
    "LeagueCoordinator",
    "Player",
    "ClubCreatorProvisional",
]);
exports.AssignRoleInput = zod_1.z.object({
    userId: NonEmptyId,
    roleId: exports.RoleKey,
    clubId: NonEmptyId.nullable(),
    leagueId: NonEmptyId.nullable(),
});
exports.DeactivateUserRoleInput = zod_1.z.object({
    userRoleId: NonEmptyId,
});
exports.LegacyRole = zod_1.z.enum([
    "SITE_ADMIN",
    "CLUB_ADMIN",
    "LEAGUE_COORDINATOR",
    "PLAYER",
]);
exports.SetUserGlobalRoleInput = zod_1.z.object({
    userId: NonEmptyId,
    newRole: exports.LegacyRole,
});
//# sourceMappingURL=role.js.map