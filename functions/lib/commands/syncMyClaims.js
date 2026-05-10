"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMyClaims = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../lib/auth");
const secureCallable_1 = require("../lib/secureCallable");
const roles_1 = require("../lib/roles");
/**
 * Idempotent self-service: recomputes the caller's effective legacy role
 * from their userRoles documents and writes the matching custom claim and
 * users.role mirror. Useful after a role assignment so the affected user
 * can refresh their permissions without waiting for token auto-refresh.
 *
 * Client should call await user.getIdToken(true) afterwards to pull the
 * new claim into the active session.
 */
exports.syncMyClaims = (0, https_1.onCall)(secureCallable_1.SECURE_CALLABLE_OPTIONS, async (request) => {
    const caller = await (0, auth_1.requireCaller)(request);
    const effective = await (0, roles_1.syncRoleArtifacts)(caller.uid);
    return { effectiveLegacyRole: effective };
});
//# sourceMappingURL=syncMyClaims.js.map