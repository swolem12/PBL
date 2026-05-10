"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizeSessionInput = exports.PersistGeneratedSessionInput = void 0;
// Parallel copy of src/lib/schemas/session.ts. Kept in sync manually.
const zod_1 = require("zod");
const NonEmptyId = zod_1.z.string().trim().min(1).max(128);
const CourtSize = zod_1.z.union([zod_1.z.literal(4), zod_1.z.literal(5)]);
const SessionCourt = zod_1.z.object({
    id: NonEmptyId,
    courtNumber: zod_1.z.number().int().min(1).max(99),
    size: CourtSize,
    playerIds: zod_1.z.array(NonEmptyId).min(1).max(8),
});
const SessionMatch = zod_1.z.object({
    id: NonEmptyId,
    courtId: NonEmptyId,
    gameNumber: zod_1.z.number().int().min(1).max(20),
    sequenceInCourt: zod_1.z.number().int().min(0).max(20).optional(),
    sideA: zod_1.z.array(NonEmptyId).min(1).max(2),
    sideB: zod_1.z.array(NonEmptyId).min(1).max(2),
    sitOutPlayer: NonEmptyId.optional(),
});
exports.PersistGeneratedSessionInput = zod_1.z.object({
    sessionDoc: zod_1.z.record(zod_1.z.unknown()).and(zod_1.z.object({
        id: NonEmptyId,
        playDateId: NonEmptyId,
        seasonId: NonEmptyId,
        kind: zod_1.z.enum(["A", "B"]),
    })),
    courts: zod_1.z.array(SessionCourt).min(1).max(20),
    matches: zod_1.z.array(SessionMatch).min(1).max(200),
});
const PlayerStatsPatch = zod_1.z.object({
    matches: zod_1.z.number().int().min(0).optional(),
    wins: zod_1.z.number().int().min(0).optional(),
    losses: zod_1.z.number().int().min(0).optional(),
    pointsFor: zod_1.z.number().int().min(0).optional(),
    pointsAgainst: zod_1.z.number().int().min(0).optional(),
});
exports.FinalizeSessionInput = zod_1.z.object({
    sessionId: NonEmptyId,
    standingsSnapshot: zod_1.z.record(zod_1.z.unknown()).and(zod_1.z.object({
        id: NonEmptyId,
    })),
    updatedPlayerStats: zod_1.z.record(PlayerStatsPatch),
});
//# sourceMappingURL=session.js.map