// Run with macOS jsc from the project folder:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/side.js
// The rules for patterns juggled at the sides (side plane), each from the author, checked on
// every side plane pattern in the list, at every ball count it has a path for. The README's
// "Side plane rules" lists the same rules in words. Any new side plane pattern must pass all
// of them before it is shown to the author.
load('engine.js');
var PH = this.PH, G = PH.G;
load('tests/measure.js');

var RULES = [
  ['side',    'Each side\'s three balls stay at that side: caught on the side they were thrown from'],
  ['way',     'Outside patterns arc forwards along the side, inside ones backwards'],
  ['plane',   'Each side\'s arc is in one plane: throw and catch spots within 2.5 cm of one vertical plane, each ball within 6 degrees of its line'],
  ['arc',     'Each side\'s three balls follow one arc from above: throw spots within 6 cm of each other, catch spots likewise'],
  ['outside', 'No throw, catch or ball\'s flight goes between an arm and the body'],
  ['forward', 'The hand is in front of its elbow at every catch (no reverse-hand catches)'],
  ['elbows',  'Elbows follow one path back and forth, never out and in again on the way'],
  ['mirror',  'Both sides are the same: every ball\'s flight mirrors its partner\'s on the other side'],
  ['arms',    'No part of one arm goes through the other: forearms, hands and upper arms all clear (1 cm brush allowed)'],
  ['top',     'The arm on top where the arms cross is the one the letters say'],
  ['cross',   'The arms really cross where the letters say they are crossed: the forearms come together, not kept apart'],
  ['body',    'Hands, forearms and elbows stay out of the body'],
  ['balls',   'Balls never collide, or pass through an arm'],
  ['reach',   'Every hand position can be reached']
];

function yawUn(p) { var y = p.yaw || 0, c = Math.cos(-y), s = Math.sin(-y); return function (q) { return [q[0] * c + q[2] * s, q[1], -q[0] * s + q[2] * c]; }; }
function sidesOf(m) {
  var out = {};
  for (var j = 0; j < m.period; j++) {
    var kc = j + m.digit(j) - 2, A = m.at(j).hands[j % 2], B = m.at(m.catchTime(kc)).hands[kc % 2];
    var g = m.parsed.tokens[j % m.parsed.tokens.length].group + ':' + Math.floor(j / m.parsed.tokens.length);
    (out[g] = out[g] || []).push({ j: j, A: A, B: B, kc: kc });
  }
  return out;
}
function lineFit(pts) {
  var n = pts.length, mx = 0, mz = 0, sxx = 0, szz = 0, sxz = 0;
  pts.forEach(function (p) { mx += p[0] / n; mz += p[1] / n; });
  pts.forEach(function (p) { var dx = p[0] - mx, dz = p[1] - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; });
  var th = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(th), uz = Math.sin(th), ss = 0;
  pts.forEach(function (p) { var d = -(p[0] - mx) * uz + (p[1] - mz) * ux; ss += d * d; });
  return { rms: Math.sqrt(ss / n), ux: ux, uz: uz };
}

// how far an arm lies outside a point, on the point's line out from the body (0 if it doesn't):
// the point is between that arm and the body. armOf: which arm (the other hand's, for a hand)
function betweenPt(p, P0, arm) {
  var un = yawUn(p), H = un(P0), S = un(p.shoulders[arm]), E = un(p.elbows[arm]), Q = un(p.hands[arm]);
  var rh = Math.hypot(H[0], H[2]); if (rh < 1) return 0;
  var ux = H[0] / rh, uz = H[2] / rh, worst = 0;
  [[S, E], [E, Q]].forEach(function (seg) {
    for (var f = 0; f <= 1.001; f += 0.1) {
      var x = seg[0][0] + (seg[1][0] - seg[0][0]) * f, y = seg[0][1] + (seg[1][1] - seg[0][1]) * f, z = seg[0][2] + (seg[1][2] - seg[0][2]) * f;
      var along = x * ux + z * uz, off = Math.abs(-x * uz + z * ux);
      if (off < 7 && along > rh + 3 && y > H[1] - 5) worst = Math.max(worst, along - rh);
    }
  });
  return worst;
}
function between(p, h) { return betweenPt(p, p.hands[h], 1 - h); }
// every ball's flight, not only where it is thrown and caught: the worst arm-and-body gap it goes through
function flightBetween(m) {
  var out = [];
  for (var j = 0; j < m.period; j++) {
    var kc = j + m.digit(j) - 2, t1 = m.catchTime(kc); if (t1 < j) t1 += m.period;
    var from = j % 2, to = kc % 2, worst = 0, at = 0;
    for (var f = 0.1; f < 0.95; f += 0.05) {
      var t = j + (t1 - j) * f, p = m.at(t), Q = null;
      p.balls.forEach(function (bb) { if (bb.fly && bb.t0 === j) Q = bb.pos; });
      if (!Q) continue;
      [0, 1].forEach(function (arm) {
        if ((arm === from && f < 0.3) || (arm === to && f > 0.7)) return;   // (its own throwing or catching arm, at the ends)
        var b = betweenPt(p, Q, arm); if (b > worst) { worst = b; at = t; }
      });
    }
    if (worst) out.push({ j: j, worst: worst, at: at });
  }
  return out;
}
function checkSide(src, outsideDir) {
  var m = PH.build(src), fails = [], r = measure({ src: src, name: src }, 60);
  var sides = sidesOf(m), dir = outsideDir;
  Object.keys(sides).forEach(function (g) {
    var b = sides[g], sx = 0; b.forEach(function (q) { sx += q.A[0] + q.B[0]; }); var s = sx >= 0 ? 1 : -1;
    b.forEach(function (q) {
      if (s * q.B[0] < 0) fails.push(['side', 'ball ' + q.j + ' is caught on the other side']);
      if (dir * (q.B[2] - q.A[2]) < 15) fails.push(['way', 'ball ' + q.j + ' travels ' + Math.round(q.B[2] - q.A[2]) + ' cm along the side']);
    });
    var pts = []; b.forEach(function (q) { pts.push([q.A[0], q.A[2]], [q.B[0], q.B[2]]); });
    var f = lineFit(pts);
    if (f.rms > 2.5) fails.push(['plane', 'side ' + g + ' is ' + f.rms.toFixed(1) + ' cm off one plane']);
    b.forEach(function (q) { var dx = q.B[0] - q.A[0], dz = q.B[2] - q.A[2], L = Math.hypot(dx, dz) || 1, a = Math.acos(Math.min(1, Math.abs(dx * f.ux + dz * f.uz) / L)) * 180 / Math.PI; if (a > 6) fails.push(['plane', 'ball ' + q.j + ' is ' + Math.round(a) + ' degrees off its side\'s line']); });
    var n = b.length, ax = 0, az = 0, bx = 0, bz = 0, st = 0, sc = 0;
    b.forEach(function (q) { ax += q.A[0] / n; az += q.A[2] / n; bx += q.B[0] / n; bz += q.B[2] / n; });
    b.forEach(function (q) { st += (Math.pow(q.A[0] - ax, 2) + Math.pow(q.A[2] - az, 2)) / n; sc += (Math.pow(q.B[0] - bx, 2) + Math.pow(q.B[2] - bz, 2)) / n; });
    if (Math.sqrt(st) > 6) fails.push(['arc', 'side ' + g + ' throws spread ' + Math.sqrt(st).toFixed(1) + ' cm']);
    if (Math.sqrt(sc) > 6) fails.push(['arc', 'side ' + g + ' catches spread ' + Math.sqrt(sc).toFixed(1) + ' cm']);
  });
  // crossed throws outside the other arm's elbow; hands in front of the elbows at catches
  var NT = m.parsed.tokens.length;
  for (var j = 0; j < m.period; j++) {
    var tk = m.parsed.tokens[j % NT].t, h = j % 2;
    // (throws and catches alike: wherever the hand is on the same side as the other arm's elbow, it is further out than the elbow)
    // (seen from above: on the line from the middle of the body out through the hand, the other
    // arm must not lie further out, at or above the hand's height, or the ball goes up or comes
    // down between that arm and the body)
    [[j, h, 'throw ' + j + ' (' + tk + ')'], [m.catchTime(j + m.digit(j) - 2), (j + m.digit(j) - 2) % 2, 'the catch at beat ' + m.catchTime(j + m.digit(j) - 2).toFixed(1)]].forEach(function (ev) {
      var b = between(m.at(ev[0]), ev[1]);
      if (b) fails.push(['outside', ev[2] + ' is between the other arm and the body (that arm is ' + b.toFixed(0) + ' cm further out)']);
    });
    var kc = j + m.digit(j) - 2, tc = m.catchTime(kc), hc = kc % 2, pc = m.at(tc), uc = yawUn(pc), Hc = uc(pc.hands[hc]), Ec = uc(pc.elbows[hc]);
    if (Ec[2] - Hc[2] > 0) fails.push(['forward', 'the catch at beat ' + tc.toFixed(1) + ' has the hand ' + (Ec[2] - Hc[2]).toFixed(0) + ' cm behind its elbow']);
  }
  flightBetween(m).forEach(function (fb) { fails.push(['outside', 'ball ' + fb.j + '\'s flight goes between an arm and the body (beat ' + fb.at.toFixed(1) + ', the arm ' + fb.worst.toFixed(0) + ' cm further out)']); });
  // elbows: one path (no extra side-to-side travel beyond two swings a cycle)
  var NS = m.period * 16, xs = [[], []];
  for (var i = 0; i < NS; i++) { var pe = m.at(i / 16), ue = yawUn(pe); xs[0].push(ue(pe.elbows[0])[0]); xs[1].push(ue(pe.elbows[1])[0]); }
  [0, 1].forEach(function (hh) { var tv = 0, mx = -1e9, mn = 1e9; for (var q = 0; q < NS; q++) { tv += Math.abs(xs[hh][(q + 1) % NS] - xs[hh][q]); mx = Math.max(mx, xs[hh][q]); mn = Math.min(mn, xs[hh][q]); } var extra = tv - 4 * (mx - mn); if (extra > 5) fails.push(['elbows', (hh ? 'left' : 'right') + ' elbow goes out and in again (' + extra.toFixed(0) + ' cm extra)']); });
  // mirror: each ball and its partner half a cycle later
  var half = m.period / 2, worstM = 0;
  for (var jm = 0; jm < half; jm++) {
    var kq = jm + m.digit(jm) - 2, t1 = m.catchTime(kq); if (t1 < jm) t1 += m.period;
    [0.25, 0.5, 0.75].forEach(function (fr) { var t = jm + (t1 - jm) * fr, c1 = null, c2 = null; m.at(t).balls.forEach(function (bb) { if (bb.fly && bb.t0 === jm) c1 = bb.pos; }); m.at(t + half).balls.forEach(function (bb) { if (bb.fly && bb.t0 === jm + half) c2 = bb.pos; }); if (c1 && c2) worstM = Math.max(worstM, Math.hypot(c1[0] + c2[0], c1[1] - c2[1], c1[2] - c2[2])); });
  }
  if (worstM > 1) fails.push(['mirror', 'the two sides differ by up to ' + worstM.toFixed(1) + ' cm']);
  // arms: every part against every part of the other arm
  var uu = 1e9, uf = 1e9;
  for (var ia = 0; ia < m.period * 40; ia++) {
    var pa = m.at(ia / 40), S = pa.shoulders, Ea = pa.elbows, Ha = pa.hands;
    uu = Math.min(uu, segDist(S[0], Ea[0], S[1], Ea[1]).d - 2 * G.upperR);
    uf = Math.min(uf, segDist(S[0], Ea[0], Ea[1], Ha[1]).d - G.upperR - G.foreR, segDist(S[1], Ea[1], Ea[0], Ha[0]).d - G.upperR - G.foreR);
  }
  if (r.minFore < G.foreR * 2 - G.graze) fails.push(['arms', 'the forearms go ' + (G.foreR * 2 - r.minFore).toFixed(1) + ' cm into each other']);
  if (r.minHandFore < G.handR + G.foreR - G.graze) fails.push(['arms', 'a hand goes into the other forearm']);
  if (r.minHand < G.handR * 2 - G.graze) fails.push(['arms', 'the hands go into each other']);
  if (uf < -G.graze) fails.push(['arms', 'an upper arm goes ' + (-uf).toFixed(1) + ' cm into the other forearm']);
  if (uu < -G.graze) fails.push(['arms', 'the upper arms go ' + (-uu).toFixed(1) + ' cm into each other']);
  if (r.wrongTop > 8) fails.push(['top', 'the wrong arm is on top at ' + r.wrongTop + ' samples']);
  // (wherever the letters have the arms crossed, the forearms must come within 9 cm of each other at least once in that stretch)
  var stretch = null, apart = 0;
  for (var ic = 0; ic <= m.period * 20; ic++) {
    var pc2 = m.at(ic / 20), crossed = Math.abs(pc2.w) > 0.7, dd = segDist(pc2.elbows[0], pc2.hands[0], pc2.elbows[1], pc2.hands[1]).d;
    if (crossed) { if (stretch === null) stretch = 1e9; stretch = Math.min(stretch, dd); }
    else if (stretch !== null) { if (stretch > 9) apart++; stretch = null; }
  }
  if (apart) fails.push(['cross', 'the arms stay apart at ' + apart + ' crossing(s) the letters call for']);
  if (r.inBody > 1) fails.push(['body', 'a hand or forearm goes ' + r.inBody.toFixed(1) + ' cm into the body']);
  if (r.minElbowBody < 0) fails.push(['body', 'an elbow goes into the body']);
  if (r.minBB < 0) fails.push(['balls', 'balls collide']);
  if (r.minBall < -G.graze) fails.push(['balls', 'a ball goes ' + (-r.minBall).toFixed(1) + ' cm through an arm']);
  if (r.maxReach > 0.995) fails.push(['reach', 'an arm can\'t reach']);
  return fails;
}

print('Side plane rules:');
RULES.forEach(function (x, i) { print('  ' + (i + 1) + '. ' + x[1]); });
print('');
var bad = 0, done = 0;
PH.PATTERNS.forEach(function (pt) {
  if (pt.group !== 'Side plane messes' || !pt.path) return;
  var dir = /^[0-9T]*\s*o/.test(pt.src) ? 1 : -1, counts = pt.fixedBalls ? [0] : [0, 1, 2];
  counts.forEach(function (k) {
    var src = k ? PH.addBalls(pt.src, k).src : pt.src, m = PH.build(src);
    var fails = checkSide(src, dir);
    done++;
    if (!fails.length) { print('ok   ' + pt.name + ', ' + m.balls + ' balls'); return; }
    bad++;
    print('FAIL ' + pt.name + ', ' + m.balls + ' balls');
    fails.forEach(function (f) { print('       ' + f[0] + ': ' + f[1]); });
  });
});
print(bad ? bad + ' of ' + done + ' break a rule' : 'all ' + done + ' keep every rule');
