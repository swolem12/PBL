"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectClubInput = exports.ApproveClubInput = void 0;
// Parallel copy of src/lib/schemas/club.ts. Kept in sync manually until a
// shared package extracts these schemas. Both copies must remain
// byte-equivalent for client/server validation parity.
const zod_1 = require("zod");
const NonEmptyId = zod_1.z.string().trim().min(1).max(128);
exports.ApproveClubInput = zod_1.z.object({
    clubId: NonEmptyId,
    creatorUserId: NonEmptyId,
});
exports.RejectClubInput = zod_1.z.object({
    clubId: NonEmptyId,
    creatorUserId: NonEmptyId,
    notes: zod_1.z.string().trim().min(5).max(500),
});
//# sourceMappingURL=club.js.map