// Random search over the hectic flos change-over settings only (the share... settings, and
// shareRaise, which juggles these patterns a little higher all through for room), so
// it can never move the hectic mills or any other pattern. Prints the best settings found.
//   jsc tests/search-flos.js
//   jsc -e 'var SEED=3, N=600' tests/search-flos.js
// Scored on the two hectic flos messes as shown (their TR versions are shown as these
// played backwards, so they come out the same): the arms and balls clear each other, the
// hands don't jolt, the ball caught just before the change-over flies as high as the
// others, and the hands go no lower than in the plain flos messes.
load('engine.js');
var PH = this.PH, G = PH.G;
load('tests/measure.js');
if (this.START) for (var k0 in this.START) G[k0] = this.START[k0];
var RANGES = {
  shareRaise: [0, 10], shareLag: [0.15, 0.8], shareA: [0.05, 0.8], shareB: [0.7, 1], sharePushOther: [0.2, 0.8], sharePushFwd: [0, 2],
  shareOrbitR: [10, 20], shareOrbitRY: [6, 16], shareLift: [0, 12], shareLiftW: [0.2, 1], shareCatchUp: [-4, 10],
  shareOrbitXa: [0.2, 1], shareOrbitAlong: [0.2, 0.7], shareOrbit0: [0, 0.3], shareOrbit1: [0.7, 1.1], shareOrbitIn: [0.05, 0.4], shareOrbitOut: [0.6, 0.95],
  shareSwapRise0: [0.3, 0.7], shareSwapRise1: [0.8, 1], shareSwapEaseIn: [0.1, 0.6], shareSwapEaseOut: [0.7, 1]
};
var PATS = [['Hectic flos mess', 'Flos mess'], ['Hectic flipped flos mess', 'Flipped flos mess']].map(function (pr) {
  function find(n) { return PH.PATTERNS.filter(function (p) { return p.name === n; })[0]; }
  return { pt: find(pr[0]), plain: find(pr[1]) };
});
var base = {}; for (var k in G) base[k] = Array.isArray(G[k]) ? G[k].slice() : G[k];
function apply(x) {
  for (var k in base) G[k] = Array.isArray(base[k]) ? base[k].slice() : base[k];
  for (var k2 in x) G[k2] = x[k2];
}
// how low the plain flos messes' hands go (the hectic ones should go no lower), and how
// even their ball heights are (the hectic ones must be as even: the pattern doesn't work
// if one ball flies noticeably higher or lower than the rest)
apply({});
PATS.forEach(function (P) {
  var r = measure(P.plain, 40), pk = peaks(r.m);
  P.low = Math.min.apply(null, r.yMin);
  P.spread = Math.max.apply(null, pk) - Math.min.apply(null, pk);
  var rc = reach(r.m); P.far = rc.far; P.carry = rc.carry;
  P.rms = rmsAcc(r.m);
});
// how far across the body the hands go, and the most any hand carries on outwards past
// the spot where it caught (a hand should meet the ball, not be swept on past it)
function reach(m) {
  var far = 0, carry = 0;
  for (var t = 0; t < m.period; t += 0.02) m.at(t).hands.forEach(function (h) { far = Math.max(far, Math.abs(h[0])); });
  m.eventTimes.forEach(function (et) {
    var e = m.at(et + 0.001).event;
    if (e.part !== 'catch') return;
    var x0 = m.at(et).hands[e.hand][0], sgn = x0 >= 0 ? 1 : -1, out = 0;
    for (var t = et; t < et + 0.6; t += 0.02) out = Math.max(out, sgn * (m.at(t).hands[e.hand][0] - x0));
    carry = Math.max(carry, out);
  });
  return { far: far, carry: carry };
}
// how smooth the hands are over the whole cycle: the root mean square of their
// acceleration (a stop-and-go anywhere shows up here, not only the single worst jolt)
function rmsAcc(m) {
  var n = Math.round(m.period * 40), dt = m.period / n, s = dt / m.bps, sum = 0, cnt = 0, prev = [m.at(-dt), m.at(0)];
  for (var i = 1; i <= n; i++) {
    var c = m.at(i * dt);
    for (var h = 0; h < 2; h++) {
      var a2 = 0;
      for (var q = 0; q < 3; q++) { var d = (prev[0].hands[h][q] - 2 * prev[1].hands[h][q] + c.hands[h][q]) / (s * s); a2 += d * d; }
      sum += a2; cnt++;
    }
    prev = [prev[1], c];
  }
  return Math.sqrt(sum / cnt);
}
// each throw's peak height, over one cycle
function peaks(m) {
  var pk = {};
  for (var t = 0; t < m.period + 4; t += 0.02) m.at(t).balls.forEach(function (b) {
    if (!b.fly || b.t0 < 0 || b.t0 >= m.period) return;   // (whole flights only)
    var key = b.t0.toFixed(2);
    if (!pk[key] || pk[key] < b.pos[1]) pk[key] = b.pos[1];
  });
  var out = []; for (var q in pk) out.push(pk[q]);
  return out;
}
function score(x, perBeat, show) {
  apply(x);
  var s = 0, fails = 0, notes = [];
  PATS.forEach(function (P) {
    var r = measure(P.pt, perBeat), f = 0;
    if (r.error) { s += 1e6; return; }
    f += Math.max(0, 2 * G.foreR - G.graze + 0.3 - r.minFore) * 3; f += Math.max(0, 0.3 - G.graze - r.minBall) * 3;
    f += Math.max(0, 2 * G.handR + 0.5 - r.minHand) + Math.max(0, G.handR + G.foreR - G.graze + 0.3 - r.minHandFore) * 2;
    f += r.wrongTop * 0.2; f += r.behind * 0.2; f += Math.max(0, r.maxReach - 0.97) * 200;
    f += Math.max(0, -r.minElbowBody) * 3; f += r.inBody * 4;
    f += Math.max(0, r.maxAcc - 25000) / 1000;
    var rms = rmsAcc(r.m);
    f += Math.max(0, rms - P.rms * 1.2) / 300;
    var lowY = Math.min.apply(null, r.yMin);
    f += Math.max(0, P.low - 1 - lowY);
    var pk = peaks(r.m).sort(function (a, b) { return a - b; });
    var even = pk[pk.length - 1] - pk[0];
    f += Math.max(0, even - P.spread - 1) * 2;
    var rc = reach(r.m);
    f += Math.max(0, rc.far - P.far - 1) * 2 + Math.max(0, rc.carry - P.carry - 1) * 2;
    if (f > 0) fails++;
    s += f;
    if (show) notes.push(P.pt.name + ': forearm gap ' + r.minFore.toFixed(1) + ', ball clearance ' + r.minBall.toFixed(1) + ', hand to forearm ' + r.minHandFore.toFixed(1) +
      ', jolt ' + Math.round(r.maxAcc / 1000) + 'k, smoothness ' + (rms / P.rms).toFixed(2) + 'x plain, lowest hand ' + lowY.toFixed(0) + ' (plain ' + P.low.toFixed(0) + '), peaks ' + pk[0].toFixed(0) + ' to ' + pk[pk.length - 1].toFixed(0) + ' (plain spread ' + P.spread.toFixed(0) + ')' +
      ', hands across ' + rc.far.toFixed(0) + ' (plain ' + P.far.toFixed(0) + '), carry past a catch ' + rc.carry.toFixed(0) + ' (plain ' + P.carry.toFixed(0) + ')' +
      ', wrong top ' + r.wrongTop + ', into body ' + r.inBody.toFixed(1));
  });
  if (show) notes.forEach(function (n) { print('  ' + n); });
  return { s: s, fails: fails };
}
var seed = this.SEED || 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function sample() { var x = {}; for (var k in RANGES) x[k] = RANGES[k][0] + rnd() * (RANGES[k][1] - RANGES[k][0]); return x; }
var best = {}; for (var k in RANGES) best[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], G[k]));
var PB = this.PB || 40;   // samples per beat while searching (60 is slower but sees jolts better)
var bestS = score(best, PB);
print('start score ' + bestS.s.toFixed(2) + ' (' + bestS.fails + ' failing)');
score(best, 80, true);
var N = this.N || 400;
for (var i = 0; i < N; i++) {
  var x = rnd() < 0.6 ? (function () { var y = {}; for (var k in best) { var w = (RANGES[k][1] - RANGES[k][0]) * 0.12; y[k] = Math.max(RANGES[k][0], Math.min(RANGES[k][1], best[k] + (rnd() * 2 - 1) * w)); } return y; })() : sample();
  var sc = score(x, PB);
  if (sc.s < bestS.s) { best = x; bestS = sc; }
}
// polish: nudge one setting at a time while it keeps helping, at finer steps
var bestF = score(best, 60);
[0.08, 0.04, 0.02].forEach(function (sf) {
  for (var pass = 0; pass < 2; pass++) {
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
var out = {}; for (var k in best) out[k] = Math.round(best[k] * 100) / 100;
var fine = score(out, 80, true);
print('best score ' + bestS.s.toFixed(2) + ' (coarse), fine score ' + fine.s.toFixed(2) + ' (' + fine.fails + ' failing)');
print(JSON.stringify(out));
