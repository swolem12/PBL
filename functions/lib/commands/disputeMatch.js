"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputeMatch = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const match_1 = require("../schemas/match");
exports.disputeMatch = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const parsed = match_1.DisputeMatchInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { matchId, reason } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const matchRef = db.doc(`${collections_1.COLLECTIONS.ladderMatches}/${matchId}`);
    const submitterUid = await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", `Match ${matchId} does not exist.`);
        }
        const match = snap.data();
        const isParticipant = match.sideA.includes(caller.uid) || match.sideB.includes(caller.uid);
        if (!isParticipant && !caller.isSiteAdmin) {
            throw new https_1.HttpsError("permission-denied", "Only match participants may dispute a score.");
        }
        if (match.status !== "SUBMITTED") {
            throw new https_1.HttpsError("failed-precondition", `Match status ${match.status ?? "?"} cannot be disputed.`);
        }
        const now = firestore_1.Timestamp.now();
        tx.update(matchRef, {
            status: "DISPUTED",
            disputedBy: caller.uid,
            disputedAt: now,
            disputeReason: reason ?? null,
        });
        const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
        tx.set(auditRef, {
            kind: "MATCH_DISPUTED",
            targetId: matchId,
            targetKind: "match",
            actorId: caller.uid,
            payload: { reason: reason ?? null, sessionId: match.sessionId ?? null },
            createdAt: now,
        });
        return match.submittedBy ?? null;
    });
    // Notify the original submitter (post-tx, best-effort).
    if (submitterUid) {
        await db
            .collection(collections_1.COLLECTIONS.notifications)
            .add({
            userId: submitterUid,
            title: "Score disputed",
            body: reason
                ? `Your submitted score is under review: ${reason}`
                : "Your submitted score is under review.",
            kind: "SCORE_DISPUTED",
            href: "/dashboard",
            read: false,
            createdBy: caller.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        })
            .catch(() => {
            /* best-effort */
        });
    }
    return { matchId, status: "DISPUTED" };
});
//# sourceMappingURL=disputeMatch.js.map