"use strict";
// Parallel copy of src/lib/players/elo.ts. Keep in sync with the client
// copy until a shared package extracts pure domain logic.
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTING_ELO = void 0;
exports.expectedScore = expectedScore;
exports.computeEloDeltas = computeEloDeltas;
exports.STARTING_ELO = 1500;
function expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}
function kFactor(matches) {
    if (matches < 5)
        return 40;
    if (matches < 15)
        return 32;
    if (matches < 30)
        return 28;
    return 24;
}
function computeEloDeltas(m) {
    if (m.sideA.length === 0 || m.sideB.length === 0) {
        throw new Error("Both sides must have at least one player.");
    }
    if (m.scoreA === m.scoreB) {
        throw new Error("Match cannot end in a tie.");
    }
    const avgA = avg(m.sideA.map((p) => p.elo));
    const avgB = avg(m.sideB.map((p) => p.elo));
    const expA = expectedScore(avgA, avgB);
    const winnerA = m.scoreA > m.scoreB;
    const actualA = winnerA ? 1 : 0;
    const actualB = 1 - actualA;
    const margin = Math.abs(m.scoreA - m.scoreB);
    const marginMult = Math.max(0.8, Math.min(1.5, 0.8 + (margin / Math.max(1, m.targetPoints)) * 0.7));
    const deltas = [];
    for (const p of m.sideA) {
        const k = kFactor(p.matches);
        const change = Math.round(k * marginMult * (actualA - expA));
        deltas.push({
            userId: p.userId,
            before: p.elo,
            after: p.elo + change,
            delta: change,
        });
    }
    for (const p of m.sideB) {
        const k = kFactor(p.matches);
        const change = Math.round(k * marginMult * (actualB - (1 - expA)));
        deltas.push({
            userId: p.userId,
            before: p.elo,
            after: p.elo + change,
            delta: change,
        });
    }
    return deltas;
}
function avg(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}
//# sourceMappingURL=elo.js.map