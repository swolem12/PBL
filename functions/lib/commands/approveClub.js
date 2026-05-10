"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveClub = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const club_1 = require("../schemas/club");
const LEGACY_ROLE_RANK = {
    SITE_ADMIN: 4,
    CLUB_ADMIN: 3,
    LEAGUE_COORDINATOR: 2,
    PLAYER: 1,
};
function outranks(newRole, currentRole) {
    return (LEGACY_ROLE_RANK[newRole] ?? 0) > (LEGACY_ROLE_RANK[currentRole ?? ""] ?? 0);
}
exports.approveClub = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    (0, auth_1.requireSiteAdmin)(caller);
    const parsed = club_1.ApproveClubInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { clubId, creatorUserId } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const clubRef = db.doc(`${collections_1.COLLECTIONS.clubs}/${clubId}`);
    const creatorRef = db.doc(`${collections_1.COLLECTIONS.users}/${creatorUserId}`);
    const [clubSnap, creatorSnap, provisionalSnap] = await Promise.all([
        clubRef.get(),
        creatorRef.get(),
        db
            .collection(collections_1.COLLECTIONS.userRoles)
            .where("userId", "==", creatorUserId)
            .where("roleId", "==", "ClubCreatorProvisional")
            .where("clubId", "==", clubId)
            .where("active", "==", true)
            .get(),
    ]);
    if (!clubSnap.exists) {
        throw new https_1.HttpsError("not-found", `Club ${clubId} does not exist.`);
    }
    const clubData = clubSnap.data();
    if (clubData.status === "approved") {
        // Idempotent: already approved is a no-op success.
        return { clubId, status: "already-approved" };
    }
    if (clubData.createdBy !== creatorUserId) {
        throw new https_1.HttpsError("failed-precondition", "creatorUserId does not match clubs.createdBy.");
    }
    const creatorCurrentRole = creatorSnap.exists
        ? (creatorSnap.data().role ?? null)
        : null;
    const batch = db.batch();
    const now = firestore_1.Timestamp.now();
    batch.update(clubRef, {
        status: "approved",
        updatedAt: now,
    });
    for (const d of provisionalSnap.docs) {
        batch.update(d.ref, { active: false });
    }
    const directorRef = db.collection(collections_1.COLLECTIONS.userRoles).doc();
    batch.set(directorRef, {
        userId: creatorUserId,
        roleId: "ClubDirector",
        clubId,
        leagueId: null,
        assignedAt: now,
        assignedBy: caller.uid,
        active: true,
    });
    if (outranks("CLUB_ADMIN", creatorCurrentRole)) {
        batch.update(creatorRef, {
            role: "CLUB_ADMIN",
            updatedAt: now,
        });
    }
    const eventRef = db.collection(collections_1.COLLECTIONS.roleEvents).doc();
    batch.set(eventRef, {
        userId: creatorUserId,
        clubId,
        leagueId: null,
        eventType: "ClubApproved",
        oldRoleId: "ClubCreatorProvisional",
        newRoleId: "ClubDirector",
        eventTimestamp: now,
        notes: "Club approval promoted user to ClubDirector.",
        actorId: caller.uid,
    });
    const notifRef = db.collection(collections_1.COLLECTIONS.notifications).doc();
    batch.set(notifRef, {
        userId: creatorUserId,
        title: "Club Approved",
        body: "Your club has been approved. You are now a Club Director.",
        href: "/clubs/my",
        kind: "GENERAL",
        read: false,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdBy: caller.uid,
    });
    await batch.commit();
    return { clubId, status: "approved" };
});
//# sourceMappingURL=approveClub.js.map