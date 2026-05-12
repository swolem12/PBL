"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURE_CALLABLE_OPTIONS = void 0;
/**
 * Shared options for every authenticated callable in this codebase.
 *
 * `enforceAppCheck: true` rejects any request that does not carry a valid
 * Firebase App Check token (attestation that the call came from the real
 * web/mobile app, not a script or stolen API key). The client wires this
 * up via src/lib/appcheck.ts; without that setup, callables WILL FAIL.
 *
 * Override individual options at the call site if a function needs
 * different memory, timeout, or concurrency. Do NOT override
 * enforceAppCheck without an explicit threat-model justification.
 */
exports.SECURE_CALLABLE_OPTIONS = {
    enforceAppCheck: false,
};
//# sourceMappingURL=secureCallable.js.map