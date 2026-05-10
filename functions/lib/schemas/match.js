"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAssignMatchResultInput = exports.DisputeMatchInput = exports.VerifyMatchScoreInput = exports.SubmitMatchScoreInput = void 0;
// Parallel copy of src/lib/schemas/match.ts. Kept in sync manually.
const zod_1 = require("zod");
const NonEmptyId = zod_1.z.string().trim().min(1).max(128);
const Score = zod_1.z.number().int().min(0).max(99);
exports.SubmitMatchScoreInput = zod_1.z.object({
    matchId: NonEmptyId,
    scoreA: Score,
    scoreB: Score,
});
exports.VerifyMatchScoreInput = zod_1.z.object({
    matchId: NonEmptyId,
});
exports.DisputeMatchInput = zod_1.z.object({
    matchId: NonEmptyId,
    reason: zod_1.z.string().trim().min(5).max(500).optional(),
});
exports.AdminAssignMatchResultInput = zod_1.z.object({
    matchId: NonEmptyId,
    scoreA: Score,
    scoreB: Score,
});
//# sourceMappingURL=match.js.map