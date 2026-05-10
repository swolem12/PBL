"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const roles_1 = require("../lib/roles");
const role_1 = require("../schemas/role");
async function callerCanDeactivate(callerUid, callerIsSiteAdmin, target) {
    if (callerIsSiteAdmin)
        return true;
    if (target.roleId !== "LeagueCoordinator")
        return false;
    if (!target.clubId)
        return false;
    const directorSnap = await (0, firestore_1.getFirestore)()
        .collection(collections_1.COLLECTIONS.userRoles)
        .where("userId", "==", callerUid)
        .where("roleId", "==", "ClubDirector")
        .where("clubId", "==", target.clubId)
        .where("active", "==", true)
        .limit(1)
        .get();
    return !directorSnap.empty;
}
exports.deactivateUserRole = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const parsed = role_1.DeactivateUserRoleInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { userRoleId } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`${collections_1.COLLECTIONS.userRoles}/${userRoleId}`);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", `userRole ${userRoleId} does not exist.`);
    }
    const target = snap.data();
    if (!target.active) {
        return { userRoleId, status: "already-inactive" };
    }
    if (target.userId === caller.uid && target.roleId === "SiteAdmin") {
        throw new https_1.HttpsError("failed-precondition", "A site admin cannot deactivate their own SiteAdmin role.");
    }
    const allowed = await callerCanDeactivate(caller.uid, caller.isSiteAdmin, target);
    if (!allowed) {
        throw new https_1.HttpsError("permission-denied", "Caller cannot deactivate this role.");
    }
    const now = firestore_1.Timestamp.now();
    const batch = db.batch();
    batch.update(ref, { active: false });
    if (target.clubId) {
        batch.update(db.doc(`${collections_1.COLLECTIONS.clubs}/${target.clubId}`), {
            memberIds: firestore_1.FieldValue.arrayRemove(target.userId),
        });
    }
    const eventRef = db.collection(collections_1.COLLECTIONS.roleEvents).doc();
    batch.set(eventRef, {
        userId: target.userId,
        clubId: target.clubId,
        leagueId: null,
        eventType: "RoleRemoved",
        oldRoleId: target.roleId,
        newRoleId: null,
        eventTimestamp: now,
        notes: `Role ${target.roleId} deactivated by ${caller.uid}.`,
        actorId: caller.uid,
    });
    await batch.commit();
    const effective = await (0, roles_1.syncRoleArtifacts)(target.userId);
    return {
        userRoleId,
        status: "deactivated",
        effectiveLegacyRole: effective,
    };
});
//# sourceMappingURL=deactivateUserRole.js.map