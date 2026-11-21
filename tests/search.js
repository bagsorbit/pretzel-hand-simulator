// Random search over the arm-crossing settings. Prints the best settings found.
//   jsc tests/search.js
load('engine.js');
var PH = this.PH, G = PH.G;
load('tests/measure.js');
var RANGES = {
  topElbow0: [8, 28], topElbow1: [100, 122], topElbow2: [-4, 26],
  botElbow0: [14, 32], botElbow1: [92, 112], botElbow2: [-8, 16],
  outUnder: [20, 30], topZ: [3, 12], topY: [2, 10], botZ: [-14, -2], botY: [-12, 0], elbowEarly: [0.3, 1]
};
var base = {}; for (var k in G) base[k] = Array.isArray(G[k]) ? G[k].slice() : G[k];
function apply(x) {
  for (var k in base) G[k] = Array.isArray(base[k]) ? base[k].slice() : base[k];
  G.topElbow = [x.topElbow0, x.topElbow1, x.topElbow2]; G.botElbow = [x.botElbow0, x.botElbow1, x.botElbow2];
  ['outUnder', 'topZ', 'topY', 'botZ', 'botY', 'elbowEarly'].forEach(function (k) { G[k] = x[k]; });
}
function score(x, perBeat) {
  apply(x);
  var s = 0, fails = 0;
  PH.PATTERNS.forEach(function (pt) {
    var r = measure(pt, perBeat), f = 0;
    f += Math.max(0, 8.5 - r.minFore) * 3; f += Math.max(0, 1 - r.minBall) * 3;
    f += Math.max(0, 9.5 - r.minHand) + Math.max(0, 9 - r.minHandFore) * 2;
    f += r.wrongTop * 0.2; f += Math.max(0, r.maxReach - 0.97) * 200;
    f += Math.max(0, -r.minElbowBody) * 3; f += Math.max(0, r.down / r.samples - 0.05) * 100;
    if (f > 0) fails++;
    s += f;
  });
  return { s: s, fails: fails };
}
var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function sample() { var x = {}; for (var k in RANGES) x[k] = RANGES[k][0] + rnd() * (RANGES[k][1] - RANGES[k][0]); return x; }
var best = null, bestS = { s: 1e18 };
var N = this.N || 400;
for (var i = 0; i < N; i++) {
  var x = (best && rnd() < 0.6) ? (function () { var y = {}; for (var k in best) { var w = (RANGES[k][1] - RANGES[k][0]) * 0.12; y[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], best[k] + (rnd() * 2 - 1) * w)); } return y; })() : sample();
  var sc = score(x, 12);
  if (sc.s < bestS.s) { best = x; bestS = sc; }
}
var fine = score(best, 80);
var out = {}; for (var k in best) out[k] = Math.round(best[k] * 10) / 10;
print('best score ' + bestS.s.toFixed(2) + ' (' + bestS.fails + ' failing at coarse steps), fine score ' + fine.s.toFixed(2) + ' (' + fine.fails + ' failing)');
print(JSON.stringify(out));
