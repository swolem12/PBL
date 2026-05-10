"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectClub = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const club_1 = require("../schemas/club");
exports.rejectClub = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    (0, auth_1.requireSiteAdmin)(caller);
    const parsed = club_1.RejectClubInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { clubId, creatorUserId, notes } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const clubRef = db.doc(`${collections_1.COLLECTIONS.clubs}/${clubId}`);
    const [clubSnap, provisionalSnap] = await Promise.all([
        clubRef.get(),
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
    if (clubData.status === "rejected") {
        return { clubId, status: "already-rejected" };
    }
    if (clubData.createdBy !== creatorUserId) {
        throw new https_1.HttpsError("failed-precondition", "creatorUserId does not match clubs.createdBy.");
    }
    const batch = db.batch();
    const now = firestore_1.Timestamp.now();
    batch.update(clubRef, {
        status: "rejected",
        updatedAt: now,
    });
    for (const d of provisionalSnap.docs) {
        batch.update(d.ref, { active: false });
    }
    const eventRef = db.collection(collections_1.COLLECTIONS.roleEvents).doc();
    batch.set(eventRef, {
        userId: creatorUserId,
        clubId,
        leagueId: null,
        eventType: "ClubRejected",
        oldRoleId: "ClubCreatorProvisional",
        newRoleId: null,
        eventTimestamp: now,
        notes,
        actorId: caller.uid,
    });
    const notifRef = db.collection(collections_1.COLLECTIONS.notifications).doc();
    batch.set(notifRef, {
        userId: creatorUserId,
        title: "Club Not Approved",
        body: "Your club proposal was not approved. You remain a Player.",
        href: "/clubs/my",
        kind: "GENERAL",
        read: false,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdBy: caller.uid,
    });
    await batch.commit();
    return { clubId, status: "rejected" };
});
//# sourceMappingURL=rejectClub.js.map