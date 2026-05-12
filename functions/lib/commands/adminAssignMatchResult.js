"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAssignMatchResult = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const scope_1 = require("../lib/scope");
const match_1 = require("../schemas/match");
function callerIsStaff(caller) {
    return (caller.isSiteAdmin ||
        caller.legacyRole === "CLUB_ADMIN" ||
        caller.legacyRole === "LEAGUE_COORDINATOR");
}
exports.adminAssignMatchResult = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    if (!callerIsStaff(caller)) {
        throw new https_1.HttpsError("permission-denied", "Staff role required to assign a match result.");
    }
    const parsed = match_1.AdminAssignMatchResultInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { matchId, scoreA, scoreB } = parsed.data;
    // The legacy staff claim is not scope-aware. A LEAGUE_COORDINATOR for club X
    // must not be able to override a match in club Y, so re-resolve the match's
    // owning league and require the caller has a director/coordinator role
    // scoped to that league or its club.
    await (0, scope_1.requireMatchScope)(caller.uid, caller.isSiteAdmin, matchId);
    if (scoreA === scoreB) {
        throw new https_1.HttpsError("invalid-argument", "Ladder matches cannot be assigned a tie.");
    }
    const db = (0, firestore_1.getFirestore)();
    const matchRef = db.doc(`${collections_1.COLLECTIONS.ladderMatches}/${matchId}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", `Match ${matchId} does not exist.`);
        }
        const match = snap.data();
        if (match.status === "VERIFIED") {
            throw new https_1.HttpsError("failed-precondition", "Match is already verified; cannot admin-override.");
        }
        const now = firestore_1.Timestamp.now();
        tx.update(matchRef, {
            scoreA,
            scoreB,
            adminOverride: {
                assignedBy: caller.uid,
                assignedAt: now,
                reason: "incomplete_match_admin_assignment",
            },
            status: "ADMIN_ASSIGNED",
        });
        const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
        tx.set(auditRef, {
            kind: "MATCH_ADMIN_ASSIGNED",
            targetId: matchId,
            targetKind: "match",
            actorId: caller.uid,
            payload: { scoreA, scoreB },
            createdAt: now,
        });
    });
    return { matchId, status: "ADMIN_ASSIGNED" };
});
//# sourceMappingURL=adminAssignMatchResult.js.map