"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitMatchScore = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../lib/auth");
const collections_1 = require("../lib/collections");
const secureCallable_1 = require("../lib/secureCallable");
const elo_1 = require("../lib/elo");
const match_1 = require("../schemas/match");
/**
 * Submit a ladder match score and apply ELO deltas atomically.
 *
 * Within one transaction:
 *   1. Validates the caller is a participant.
 *   2. Validates the match is in a state that accepts a score.
 *   3. Reads target points + every player's current ELO/matches.
 *   4. Computes deltas via the pure ELO module.
 *   5. Updates the match doc with score + submission metadata.
 *   6. Updates each player profile (or seeds if missing) with new ELO + stats.
 *   7. Writes one eloEvents row per player.
 *   8. Writes one audits row.
 *   9. Writes notification docs to the opposing side (post-tx, best-effort).
 */
exports.submitMatchScore = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const parsed = match_1.SubmitMatchScoreInput.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", parsed.error.message);
    }
    const { matchId, scoreA, scoreB } = parsed.data;
    if (scoreA === scoreB) {
        throw new https_1.HttpsError("invalid-argument", "Ladder matches cannot tie.");
    }
    const db = (0, firestore_1.getFirestore)();
    const matchRef = db.doc(`${collections_1.COLLECTIONS.ladderMatches}/${matchId}`);
    const txResult = await db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (!matchSnap.exists) {
            throw new https_1.HttpsError("not-found", `Match ${matchId} does not exist.`);
        }
        const match = matchSnap.data();
        const isParticipant = match.sideA.includes(caller.uid) || match.sideB.includes(caller.uid);
        if (!isParticipant && !caller.isSiteAdmin) {
            throw new https_1.HttpsError("permission-denied", "Only match participants may submit a score.");
        }
        const status = match.status ?? "SCHEDULED";
        if (status !== "SCHEDULED" && status !== "DISPUTED") {
            throw new https_1.HttpsError("failed-precondition", `Match status ${status} does not accept score submission.`);
        }
        const sessionRef = db.doc(`${collections_1.COLLECTIONS.ladderSessions}/${match.sessionId}`);
        const sessionSnap = await tx.get(sessionRef);
        const targetPoints = (sessionSnap.exists
            ? sessionSnap.data().targetPoints
            : undefined) ?? 11;
        const allUserIds = [...match.sideA, ...match.sideB];
        const playerRefs = new Map();
        const playerSnaps = await Promise.all(allUserIds.map((uid) => {
            const ref = db.doc(`${collections_1.COLLECTIONS.players}/${uid}`);
            playerRefs.set(uid, ref);
            return tx.get(ref);
        }));
        const ratingByUser = new Map();
        playerSnaps.forEach((snap, i) => {
            const uid = allUserIds[i];
            if (!snap.exists) {
                ratingByUser.set(uid, {
                    elo: elo_1.STARTING_ELO,
                    matches: 0,
                    existed: false,
                    eloPeak: elo_1.STARTING_ELO,
                });
            }
            else {
                const p = snap.data();
                ratingByUser.set(uid, {
                    elo: p.elo ?? elo_1.STARTING_ELO,
                    matches: p.stats?.matches ?? 0,
                    existed: true,
                    eloPeak: p.eloPeak ?? elo_1.STARTING_ELO,
                });
            }
        });
        const deltas = (0, elo_1.computeEloDeltas)({
            sideA: match.sideA.map((uid) => ({
                userId: uid,
                elo: ratingByUser.get(uid).elo,
                matches: ratingByUser.get(uid).matches,
            })),
            sideB: match.sideB.map((uid) => ({
                userId: uid,
                elo: ratingByUser.get(uid).elo,
                matches: ratingByUser.get(uid).matches,
            })),
            scoreA,
            scoreB,
            targetPoints,
        });
        const winnerSide = scoreA > scoreB ? "A" : "B";
        const playerWon = (uid) => winnerSide === "A"
            ? match.sideA.includes(uid)
            : match.sideB.includes(uid);
        const playerSide = (uid) => match.sideA.includes(uid) ? "A" : "B";
        const partnersOf = (uid) => {
            const side = playerSide(uid) === "A" ? match.sideA : match.sideB;
            return side.filter((p) => p !== uid);
        };
        const opponentsOf = (uid) => playerSide(uid) === "A" ? match.sideB : match.sideA;
        const pointsForPlayer = (uid) => playerSide(uid) === "A" ? scoreA : scoreB;
        const pointsAgainstPlayer = (uid) => playerSide(uid) === "A" ? scoreB : scoreA;
        const now = firestore_1.Timestamp.now();
        tx.update(matchRef, {
            scoreA,
            scoreB,
            submittedBy: caller.uid,
            submittedAt: now,
            status: "SUBMITTED",
        });
        for (const d of deltas) {
            const ref = playerRefs.get(d.userId);
            const rating = ratingByUser.get(d.userId);
            const won = playerWon(d.userId) ? 1 : 0;
            const newPeak = Math.max(rating.eloPeak, d.after);
            if (!rating.existed) {
                tx.set(ref, {
                    userId: d.userId,
                    displayName: d.userId,
                    elo: d.after,
                    eloPeak: newPeak,
                    stats: {
                        matches: 1,
                        wins: won,
                        losses: 1 - won,
                        pointsFor: pointsForPlayer(d.userId),
                        pointsAgainst: pointsAgainstPlayer(d.userId),
                        updatedAt: now,
                    },
                    createdAt: now,
                    updatedAt: now,
                });
            }
            else {
                tx.update(ref, {
                    elo: d.after,
                    eloPeak: newPeak,
                    "stats.matches": firestore_1.FieldValue.increment(1),
                    "stats.wins": firestore_1.FieldValue.increment(won),
                    "stats.losses": firestore_1.FieldValue.increment(1 - won),
                    "stats.pointsFor": firestore_1.FieldValue.increment(pointsForPlayer(d.userId)),
                    "stats.pointsAgainst": firestore_1.FieldValue.increment(pointsAgainstPlayer(d.userId)),
                    "stats.updatedAt": now,
                    updatedAt: now,
                });
            }
            const eventRef = db.collection(collections_1.COLLECTIONS.eloEvents).doc();
            tx.set(eventRef, {
                playerId: d.userId,
                delta: d.delta,
                eloBefore: d.before,
                eloAfter: d.after,
                source: "ladderMatch",
                sourceId: matchId,
                opponentIds: opponentsOf(d.userId),
                partnerIds: partnersOf(d.userId),
                won: playerWon(d.userId),
                pointsFor: pointsForPlayer(d.userId),
                pointsAgainst: pointsAgainstPlayer(d.userId),
                createdAt: now,
            });
        }
        const auditRef = db.collection(collections_1.COLLECTIONS.audits).doc();
        tx.set(auditRef, {
            kind: "MATCH_SCORE_SUBMITTED",
            targetId: matchId,
            targetKind: "match",
            actorId: caller.uid,
            payload: { scoreA, scoreB, sessionId: match.sessionId },
            createdAt: now,
        });
        return {
            sideA: match.sideA,
            sideB: match.sideB,
            gameNumber: match.gameNumber ?? 0,
        };
    });
    // Notifications happen post-transaction so they don't bloat the tx.
    // Best-effort; failures here do not roll back the score.
    const submitterOnSideA = txResult.sideA.includes(caller.uid);
    const opposingSide = submitterOnSideA ? txResult.sideB : txResult.sideA;
    const db2 = (0, firestore_1.getFirestore)();
    await Promise.allSettled(opposingSide.map((uid) => db2.collection(collections_1.COLLECTIONS.notifications).add({
        userId: uid,
        title: "Score submitted — verify now",
        body: `Game ${txResult.gameNumber} score: ${scoreA}–${scoreB}. Tap to confirm or dispute.`,
        kind: "SCORE_SUBMITTED",
        href: "/dashboard",
        read: false,
        createdBy: caller.uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    })));
    return { matchId, status: "SUBMITTED" };
});
//# sourceMappingURL=submitMatchScore.js.map