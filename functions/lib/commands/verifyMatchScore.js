"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMatchScore = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const match_1 = require("../schemas/match");
exports.verifyMatchScore = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const parsed = match_1.VerifyMatchScoreInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { matchId } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const matchRef = db.doc(`${collections_1.COLLECTIONS.ladderMatches}/${matchId}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", `Match ${matchId} does not exist.`);
        }
        const match = snap.data();
        if (match.status === "VERIFIED") {
            return; // idempotent
        }
        if (match.status !== "SUBMITTED") {
            throw new https_1.HttpsError("failed-precondition", `Match status ${match.status ?? "?"} cannot be verified.`);
        }
        const submitterOnSideA = match.submittedBy
            ? match.sideA.includes(match.submittedBy)
            : false;
        const allowedVerifiers = submitterOnSideA ? match.sideB : match.sideA;
        const isOpposingParticipant = allowedVerifiers.includes(caller.uid);
        if (!isOpposingParticipant && !caller.isSiteAdmin) {
            throw new https_1.HttpsError("permission-denied", "Only the opposing side may verify this score.");
        }
        const now = firestore_1.Timestamp.now();
        tx.update(matchRef, {
            verifiedBy: caller.uid,
            verifiedAt: now,
            status: "VERIFIED",
        });
        const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
        tx.set(auditRef, {
            kind: "MATCH_VERIFIED",
            targetId: matchId,
            targetKind: "match",
            actorId: caller.uid,
            createdAt: now,
        });
    });
    return { matchId, status: "VERIFIED" };
});
//# sourceMappingURL=verifyMatchScore.js.map