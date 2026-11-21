// Random search over the arm-crossing settings. Prints the best settings found.
//   jsc tests/search.js
load('engine.js');
var PH = this.PH, G = PH.G;
load('tests/measure.js');
var RANGES = {
  topElbow0: [12, 19], topElbow1: [110, 126], topElbow2: [2, 16],
  botElbow0: [18, 34], botElbow1: [96, 112], botElbow2: [0, 18],
  topFloor: [120, 128], underCatch: [0.2, 1], botCap: [104, 116], topZ: [0, 10], botZ: [-18, -4], handZ: [22, 32],
  underDrop: [8, 18], underFwd: [4, 7.5], underOut: [1, 6], underWin: [0.3, 0.6], elbowEarly: [0.5, 1], nearIn: [8, 22], nearOut: [18, 36]
};
var base = {}; for (var k in G) base[k] = Array.isArray(G[k]) ? G[k].slice() : G[k];
function apply(x) {
  for (var k in base) G[k] = Array.isArray(base[k]) ? base[k].slice() : base[k];
  G.topElbow = [x.topElbow0, x.topElbow1, x.topElbow2]; G.botElbow = [x.botElbow0, x.botElbow1, x.botElbow2];
  ['handZ', 'underCatch', 'topFloor', 'botCap', 'topZ', 'botZ', 'elbowEarly', 'underDrop', 'underFwd', 'underOut', 'underWin', 'nearIn', 'nearOut'].forEach(function (k) { G[k] = x[k]; });
}
function score(x, perBeat) {
  apply(x);
  var s = 0, fails = 0;
  PH.PATTERNS.forEach(function (pt) {
    var r = measure(pt, perBeat), f = 0;
    // the same limits as tests/check.js, with a small safety margin
    f += Math.max(0, 2 * G.foreR - G.graze + 0.3 - r.minFore) * 3; f += Math.max(0, 0.3 - G.graze - r.minBall) * 3;
    f += Math.max(0, 2 * G.handR + 0.5 - r.minHand) + Math.max(0, G.handR + G.foreR - G.graze + 0.3 - r.minHandFore) * 2;
    f += r.wrongTop * 0.2; f += r.behind * 0.2; f += Math.max(0, G.minArc + 1 - r.minArc) * 2; f += Math.max(0, r.maxReach - 0.97) * 200;
    f += Math.max(0, -r.minElbowBody) * 3; f += Math.max(0, r.down / r.samples - 0.05) * 100;
    if (f > 0) fails++;
    s += f;
  });
  return { s: s, fails: fails };
}
var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function sample() { var x = {}; for (var k in RANGES) x[k] = RANGES[k][0] + rnd() * (RANGES[k][1] - RANGES[k][0]); return x; }
var best = {}; for (var k in RANGES) best[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], /^(top|bot)Elbow\d$/.test(k) ? G[k.slice(0, -1)][+k.slice(-1)] : G[k]));
var bestS = score(best, 40);
print('start score ' + bestS.s.toFixed(2) + ' (' + bestS.fails + ' failing)');
var N = this.N || 400;
for (var i = 0; i < N; i++) {
  var x = (best && rnd() < 0.6) ? (function () { var y = {}; for (var k in best) { var w = (RANGES[k][1] - RANGES[k][0]) * 0.12; y[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], best[k] + (rnd() * 2 - 1) * w)); } return y; })() : sample();
  var sc = score(x, 40);
  if (sc.s < bestS.s) { best = x; bestS = sc; }
}
// polish: nudge one setting at a time while it keeps helping, at finer steps
var bestF = score(best, 60);
var stepFrac = [0.08, 0.04, 0.02];
stepFrac.forEach(function (sf) {
  for (var pass = 0; pass < 3; pass++) {
    for (var k in RANGES) {
      [-1, 1].forEach(function (dir) {
        var y = {}; for (var q in best) y[q] = best[q];
        y[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], best[k] + dir * sf * (RANGES[k][1] - RANGES[k][0])));
        var sc = score(y, 60);
        if (sc.s < bestF.s) { best = y; bestF = sc; }
      });
    }
  }
});
var fine = score(best, 80);
var out = {}; for (var k in best) out[k] = Math.round(best[k] * 10) / 10;
print('best score ' + bestS.s.toFixed(2) + ' (' + bestS.fails + ' failing at coarse steps), fine score ' + fine.s.toFixed(2) + ' (' + fine.fails + ' failing)');
print(JSON.stringify(out));
