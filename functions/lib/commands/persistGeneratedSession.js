"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistGeneratedSession = void 0;
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
 * Atomically persist a generated session, its courts, and its matches.
 *
 * The single batch (1 session + N courts + M matches + 1 audit) ensures the
 * session never appears with partial courts/matches. Firestore batches max
 * at 500 ops; the schema caps courts at 20 and matches at 200, so the upper
 * bound is well within budget.
 */
exports.persistGeneratedSession = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    if (!callerIsStaff(caller)) {
        throw new https_1.HttpsError("permission-denied", "Staff role required to persist a generated session.");
    }
    const parsed = session_1.PersistGeneratedSessionInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { sessionDoc, courts, matches } = parsed.data;
    const db = (0, firestore_1.getFirestore)();
    const batch = db.batch();
    const now = firestore_1.Timestamp.now();
    const sessionRef = db.doc(`${collections_1.COLLECTIONS.ladderSessions}/${sessionDoc.id}`);
    batch.set(sessionRef, {
        ...stripUndefined(sessionDoc),
        generatedBy: caller.uid,
        generatedAt: now,
        status: "GENERATED",
    });
    for (const court of courts) {
        const ref = db.doc(`${collections_1.COLLECTIONS.ladderCourts}/${court.id}`);
        batch.set(ref, {
            ...court,
            sessionId: sessionDoc.id,
            playDateId: sessionDoc.playDateId,
            status: "active",
            createdAt: now,
        });
    }
    for (const match of matches) {
        const ref = db.doc(`${collections_1.COLLECTIONS.ladderMatches}/${match.id}`);
        batch.set(ref, {
            ...stripUndefined(match),
            sessionId: sessionDoc.id,
            status: "SCHEDULED",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
    batch.set(auditRef, {
        kind: "SESSION_GENERATED",
        targetId: sessionDoc.id,
        targetKind: "session",
        actorId: caller.uid,
        payload: {
            kind: sessionDoc.kind,
            courtCount: courts.length,
            playerCount: courts.reduce((sum, c) => sum + c.playerIds.length, 0),
            matchCount: matches.length,
        },
        createdAt: now,
    });
    await batch.commit();
    return {
        sessionId: sessionDoc.id,
        courtCount: courts.length,
        matchCount: matches.length,
    };
});
//# sourceMappingURL=persistGeneratedSession.js.map