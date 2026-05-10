"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCaller = requireCaller;
exports.requireSiteAdmin = requireSiteAdmin;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const collections_1 = require("./collections");
/**
 * Resolves the calling user. Throws unauthenticated if no auth, otherwise
 * loads the legacy users/{uid}.role for backward-compatible authorization.
 *
 * Future: replace this with custom-claims-only checks once the claim
 * provisioning callable lands (Track A2 in the roadmap).
 */
async function requireCaller(request) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign-in is required.");
    }
    const claimRole = request.auth?.token?.role;
    if (typeof claimRole === "string" && claimRole === "SITE_ADMIN") {
        return { uid, legacyRole: claimRole, isSiteAdmin: true };
    }
    const userSnap = await (0, firestore_1.getFirestore)().doc(`${collections_1.COLLECTIONS.users}/${uid}`).get();
    const legacyRole = userSnap.exists
        ? (userSnap.data().role ?? null)
        : null;
    return {
        uid,
        legacyRole,
        isSiteAdmin: legacyRole === "SITE_ADMIN",
    };
}
function requireSiteAdmin(caller) {
    if (!caller.isSiteAdmin) {
        throw new https_1.HttpsError("permission-denied", "Site admin role is required.");
    }
}
//# sourceMappingURL=auth.js.map