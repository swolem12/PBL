"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_ROLE_RANK = exports.ROLE_KEY_TO_LEGACY = void 0;
exports.effectiveLegacyRole = effectiveLegacyRole;
exports.syncRoleArtifacts = syncRoleArtifacts;
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const collections_1 = require("./collections");
exports.ROLE_KEY_TO_LEGACY = {
    SiteAdmin: "SITE_ADMIN",
    ClubDirector: "CLUB_ADMIN",
    LeagueCoordinator: "LEAGUE_COORDINATOR",
    Player: "PLAYER",
};
// Higher number = higher privilege.
exports.LEGACY_ROLE_RANK = {
    SITE_ADMIN: 4,
    CLUB_ADMIN: 3,
    LEAGUE_COORDINATOR: 2,
    PLAYER: 1,
};
/**
 * Recompute the user's highest active legacy role from their userRoles
 * collection. Returns "PLAYER" when no active roles exist.
 */
async function effectiveLegacyRole(userId) {
    const snap = await (0, firestore_1.getFirestore)()
        .collection(collections_1.COLLECTIONS.userRoles)
        .where("userId", "==", userId)
        .where("active", "==", true)
        .get();
    let best = "PLAYER";
    let bestRank = exports.LEGACY_ROLE_RANK.PLAYER;
    for (const doc of snap.docs) {
        const roleId = doc.data().roleId;
        if (!roleId)
            continue;
        const legacy = exports.ROLE_KEY_TO_LEGACY[roleId];
        if (!legacy)
            continue;
        const rank = exports.LEGACY_ROLE_RANK[legacy];
        if (rank > bestRank) {
            bestRank = rank;
            best = legacy;
        }
    }
    return best;
}
/**
 * Set the user's custom claim to match their effective legacy role and
 * mirror the value into users/{uid}.role for the rules fallback.
 *
 * Custom claims propagate to client tokens on the next ID-token refresh
 * (auto-refreshes hourly, or call getIdToken(true) for immediate effect).
 */
async function syncRoleArtifacts(userId) {
    const effective = await effectiveLegacyRole(userId);
    await Promise.all([
        (0, auth_1.getAuth)().setCustomUserClaims(userId, { role: effective }),
        (0, firestore_1.getFirestore)()
            .doc(`${collections_1.COLLECTIONS.users}/${userId}`)
            .set({ role: effective, updatedAt: new Date() }, { merge: true }),
    ]);
    return effective;
}
//# sourceMappingURL=roles.js.map