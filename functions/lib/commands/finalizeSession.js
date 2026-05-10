"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const session_1 = require("../schemas/session");
function callerIsStaff(caller) {
    return (caller.isSiteAdmin ||
        caller.legacyRole === "CLUB_ADMIN" ||
        caller.legacyRole === "LEAGUE_COORDINATOR");
}
function stripUndefined(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
/**
 * Atomically finalize a ladder session.
 *
 * One batch updates the session status, persists the standings snapshot,
 * patches each affected player's cumulative stats, and writes the audit
 * row. Status is set last so a partial failure leaves the session NOT
 * finalized rather than finalized-but-missing-snapshot.
 */
exports.finalizeSession = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    if (!callerIsStaff(caller)) {
        throw new https_1.HttpsError("permission-denied", "Staff role required to finalize a session.");
    }
    const parsed = session_1.FinalizeSessionInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { sessionId, standingsSnapshot, updatedPlayerStats } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    // Idempotency check + state guard outside the batch (a single read).
    const sessionRef = db.doc(`${collections_1.COLLECTIONS.ladderSessions}/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new https_1.HttpsError("not-found", `Session ${sessionId} does not exist.`);
    }
    const sessionStatus = sessionSnap.data().status;
    if (sessionStatus === "FINALIZED") {
        return { sessionId, status: "already-finalized" };
    }
    const playerIds = Object.keys(updatedPlayerStats);
    // 1 session + 1 snapshot + N players + 1 audit. Cap defensively at 500.
    if (playerIds.length > 495) {
        throw new https_1.HttpsError("out-of-range", `Cannot finalize: too many players (${playerIds.length}); chunking required.`);
    }
    const batch = db.batch();
    const now = firestore_1.Timestamp.now();
    // Persist snapshot first (so a partial failure doesn't leave session
    // FINALIZED without the snapshot).
    const snapshotRef = db.doc(`${collections_1.COLLECTIONS.standingsSnapshots}/${standingsSnapshot.id}`);
    batch.set(snapshotRef, {
        ...stripUndefined(standingsSnapshot),
        createdAt: now,
    });
    for (const [playerId, stats] of Object.entries(updatedPlayerStats)) {
        batch.update(db.doc(`${collections_1.COLLECTIONS.players}/${playerId}`), {
            stats: stripUndefined(stats),
            updatedAt: now,
        });
    }
    const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
    batch.set(auditRef, {
        kind: "SESSION_FINALIZED",
        targetId: sessionId,
        targetKind: "session",
        actorId: caller.uid,
        payload: { playersAffected: playerIds.length },
        createdAt: now,
    });
    // Set status LAST in the batch so it commits in one atomic step alongside
    // the snapshot/player/audit writes.
    batch.update(sessionRef, {
        status: "FINALIZED",
        finalizedAt: firestore_1.FieldValue.serverTimestamp(),
        finalizedBy: caller.uid,
    });
    await batch.commit();
    return { sessionId, status: "finalized" };
});
//# sourceMappingURL=finalizeSession.js.map