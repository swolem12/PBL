"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeSession = exports.persistGeneratedSession = exports.adminAssignMatchResult = exports.disputeMatch = exports.verifyMatchScore = exports.submitMatchScore = exports.syncMyClaims = exports.setUserGlobalRole = exports.deactivateUserRole = exports.assignRole = exports.rejectClub = exports.onClubCreated = exports.approveClub = void 0;
const app_1 = require("firebase-admin/app");
const v2_1 = require("firebase-functions/v2");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({
    region: "us-central1",
    maxInstances: 10,
});
var approveClub_1 = require("./commands/approveClub");
Object.defineProperty(exports, "approveClub", { enumerable: true, get: function () { return approveClub_1.approveClub; } });
var onClubCreated_1 = require("./triggers/onClubCreated");
Object.defineProperty(exports, "onClubCreated", { enumerable: true, get: function () { return onClubCreated_1.onClubCreated; } });
var rejectClub_1 = require("./commands/rejectClub");
Object.defineProperty(exports, "rejectClub", { enumerable: true, get: function () { return rejectClub_1.rejectClub; } });
var assignRole_1 = require("./commands/assignRole");
Object.defineProperty(exports, "assignRole", { enumerable: true, get: function () { return assignRole_1.assignRole; } });
var deactivateUserRole_1 = require("./commands/deactivateUserRole");
Object.defineProperty(exports, "deactivateUserRole", { enumerable: true, get: function () { return deactivateUserRole_1.deactivateUserRole; } });
var setUserGlobalRole_1 = require("./commands/setUserGlobalRole");
Object.defineProperty(exports, "setUserGlobalRole", { enumerable: true, get: function () { return setUserGlobalRole_1.setUserGlobalRole; } });
var syncMyClaims_1 = require("./commands/syncMyClaims");
Object.defineProperty(exports, "syncMyClaims", { enumerable: true, get: function () { return syncMyClaims_1.syncMyClaims; } });
var submitMatchScore_1 = require("./commands/submitMatchScore");
Object.defineProperty(exports, "submitMatchScore", { enumerable: true, get: function () { return submitMatchScore_1.submitMatchScore; } });
var verifyMatchScore_1 = require("./commands/verifyMatchScore");
Object.defineProperty(exports, "verifyMatchScore", { enumerable: true, get: function () { return verifyMatchScore_1.verifyMatchScore; } });
var disputeMatch_1 = require("./commands/disputeMatch");
Object.defineProperty(exports, "disputeMatch", { enumerable: true, get: function () { return disputeMatch_1.disputeMatch; } });
var adminAssignMatchResult_1 = require("./commands/adminAssignMatchResult");
Object.defineProperty(exports, "adminAssignMatchResult", { enumerable: true, get: function () { return adminAssignMatchResult_1.adminAssignMatchResult; } });
var persistGeneratedSession_1 = require("./commands/persistGeneratedSession");
Object.defineProperty(exports, "persistGeneratedSession", { enumerable: true, get: function () { return persistGeneratedSession_1.persistGeneratedSession; } });
var finalizeSession_1 = require("./commands/finalizeSession");
Object.defineProperty(exports, "finalizeSession", { enumerable: true, get: function () { return finalizeSession_1.finalizeSession; } });
//# sourceMappingURL=index.js.map