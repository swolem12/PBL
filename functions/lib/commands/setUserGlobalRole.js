"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserGlobalRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const roles_1 = require("../lib/roles");
const role_1 = require("../schemas/role");
const LEGACY_TO_ROLE_KEY = {
    SITE_ADMIN: "SiteAdmin",
    CLUB_ADMIN: "ClubDirector",
    LEAGUE_COORDINATOR: "LeagueCoordinator",
    PLAYER: "Player",
};
/**
 * Set a user's primary global (clubId == null) role.
 *
 * Deactivates any existing active global userRoles entries for the target,
 * adds a new one for the requested role, writes a roleEvents audit row,
 * and recomputes the target's custom claim + users.role mirror.
 */
exports.setUserGlobalRole = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    (0, auth_1.requireSiteAdmin)(caller);
    const parsed = role_1.SetUserGlobalRoleInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { userId, newRole } = parsed.data;
    if (userId === caller.uid && newRole !== "SITE_ADMIN") {
        throw new https_1.HttpsError("failed-precondition", "A site admin cannot demote themselves; ask another admin.");
    }
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    const newRoleKey = LEGACY_TO_ROLE_KEY[newRole];
    const previousSnap = await db.doc(`${collections_1.COLLECTIONS.users}/${userId}`).get();
    const previousLegacy = previousSnap.exists
        ? (previousSnap.data().role ?? "PLAYER")
        : "PLAYER";
    const globalRolesSnap = await db
        .collection(collections_1.COLLECTIONS.userRoles)
        .where("userId", "==", userId)
        .where("active", "==", true)
        .where("clubId", "==", null)
        .get();
    const batch = db.batch();
    for (const d of globalRolesSnap.docs) {
        batch.update(d.ref, { active: false });
    }
    // Always write a userRoles entry — even for PLAYER — so the audit trail
    // shows the demotion as a deliberate assignment rather than absence.
    const newRoleRef = db.collection(collections_1.COLLECTIONS.userRoles).doc();
    batch.set(newRoleRef, {
        userId,
        roleId: newRoleKey,
        clubId: null,
        leagueId: null,
        assignedAt: now,
        assignedBy: caller.uid,
        active: true,
    });
    const eventRef = db.collection(collections_1.COLLECTIONS.roleEvents).doc();
    batch.set(eventRef, {
        userId,
        clubId: null,
        leagueId: null,
        eventType: "RoleAssigned",
        oldRoleId: LEGACY_TO_ROLE_KEY[previousLegacy] ?? null,
        newRoleId: newRoleKey,
        eventTimestamp: now,
        notes: `Global role changed from ${previousLegacy} to ${newRole} by ${caller.uid}.`,
        actorId: caller.uid,
    });
    await batch.commit();
    const effective = await (0, roles_1.syncRoleArtifacts)(userId);
    return {
        userRoleId: newRoleRef.id,
        effectiveLegacyRole: effective,
    };
});
//# sourceMappingURL=setUserGlobalRole.js.map