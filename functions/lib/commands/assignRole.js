"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const roles_1 = require("../lib/roles");
const role_1 = require("../schemas/role");
/**
 * Returns true if the caller is permitted to assign the requested role at
 * the requested scope. Site admins may assign anything. Club directors may
 * only assign LeagueCoordinator within a club they actively direct.
 */
async function callerCanAssign(callerUid, callerIsSiteAdmin, roleId, clubId) {
    if (callerIsSiteAdmin)
        return true;
    if (roleId !== "LeagueCoordinator")
        return false;
    if (!clubId)
        return false;
    const directorSnap = await (0, firestore_1.getFirestore)()
        .collection(collections_1.COLLECTIONS.userRoles)
        .where("userId", "==", callerUid)
        .where("roleId", "==", "ClubDirector")
        .where("clubId", "==", clubId)
        .where("active", "==", true)
        .limit(1)
        .get();
    return !directorSnap.empty;
}
exports.assignRole = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const parsed = role_1.AssignRoleInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { userId, roleId, clubId, leagueId } = parsed.data;
    if (roleId === "ClubCreatorProvisional") {
        throw new https_1.HttpsError("invalid-argument", "ClubCreatorProvisional is granted only via club submission.");
    }
    if (roleId === "LeagueCoordinator" && !leagueId && !clubId) {
        throw new https_1.HttpsError("invalid-argument", "LeagueCoordinator requires clubId (or leagueId scope).");
    }
    const allowed = await callerCanAssign(caller.uid, caller.isSiteAdmin, roleId, clubId);
    if (!allowed) {
        throw new https_1.HttpsError("permission-denied", "Caller cannot assign this role at the requested scope.");
    }
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    const batch = db.batch();
    const userRoleRef = db.collection(collections_1.COLLECTIONS.userRoles).doc();
    batch.set(userRoleRef, {
        userId,
        roleId,
        clubId,
        leagueId,
        assignedAt: now,
        assignedBy: caller.uid,
        active: true,
    });
    if (clubId) {
        batch.update(db.doc(`${collections_1.COLLECTIONS.clubs}/${clubId}`), {
            memberIds: firestore_1.FieldValue.arrayUnion(userId),
        });
    }
    const eventRef = db.collection(collections_1.COLLECTIONS.roleEvents).doc();
    batch.set(eventRef, {
        userId,
        clubId,
        leagueId,
        eventType: "RoleAssigned",
        oldRoleId: null,
        newRoleId: roleId,
        eventTimestamp: now,
        notes: `Role ${roleId} assigned by ${caller.uid}.`,
        actorId: caller.uid,
    });
    await batch.commit();
    const effective = await (0, roles_1.syncRoleArtifacts)(userId);
    return {
        userRoleId: userRoleRef.id,
        effectiveLegacyRole: effective,
    };
});
//# sourceMappingURL=assignRole.js.map