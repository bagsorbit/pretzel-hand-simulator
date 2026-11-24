function segDist(p1, q1, p2, q2) {
  // closest distance between segments p1q1 and p2q2, plus the closest points
  var d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  var a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2);
  var s, t;
  if (a < 1e-9) { s = 0; t = clamp(f / e); }            // first segment is a point
  else {
    var den = a * e - b * b;
    s = den > 1e-9 ? clamp((b * f - c * e) / den) : 0;
    t = (b * s + f) / e;
    if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
  }
  var c1 = add(p1, mul(d1, s)), c2 = add(p2, mul(d2, t));
  return { d: len(sub(c1, c2)), c1: c1, c2: c2 };
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function len(a) { return Math.sqrt(dot(a, a)); }
function clamp(x) { return Math.max(0, Math.min(1, x)); }
function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }


var BALL_R = PH.G.ballR;
var FOOT = { maxAcc: 15000, scoop: 16, handZ: 32, handY: 117, elbowY: 111, elbowZ: 18, elbowX: 25, topY: 127 };   // targets from the author's filmed mills mess
// how far a sphere of radius rad at point q sinks into the body (torso and hips, as drawn), in cm (0 = clear)
function bodyDepth(q, rad) {
  var worst = 0;
  [[0, 113, 0, 17, 30, 12], [0, 89, 0, 15.5, 11, 10.5]].forEach(function (e) {
    var dx = (q[0] - e[0]) / (e[3] + rad), dy = (q[1] - e[1]) / (e[4] + rad), dz = (q[2] - e[2]) / (e[5] + rad);
    var k = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (k < 1) worst = Math.max(worst, (1 - k) * Math.min(e[3], e[5]));
  });
  return worst;
}
function measure(pt, perBeat) {
  var G = PH.G, m = PH.build(pt.src);
  if (!m.ok) return { error: m.error };
  var r = { m: m, minFore: 1e9, minHand: 1e9, minHandFore: 1e9, maxReach: 0, wrongTop: 0, minElbowBody: 1e9, worstT: 0,
            minBall: 1e9, ballT: 0, minBB: 1e9, bbT: 0, down: 0, samples: 0, behind: 0, inBody: 0, inBodyT: 0, slashOk: m.slashSeen === m.parsed.slash || !m.parsed.slash || !m.slashSeen || !!m.turn || /^[OI]/.test(m.parsed.dirs),   // (the slash points to the side the first throw peaks on; columns have none, and sebs is the exception)
              // (an O throw goes outside to outside, so it peaks on the centre line: the key says O doesn't go by the slash)
           
            maxAcc: 0, accT: 0, yMin: [1e9, 1e9], yMax: [-1e9, -1e9], handZ: 0, handY: 0, elbowY: 0, elbowZ: 0, elbowX: 0, topY: 0, crossed: 0 };
  // every ball should arc across a little, not go straight up and down
  r.minArc = 1e9; r.underZ = 0;
  for (var j = 0; j < m.period; j++) {
    // how far forward the hand is at an outside under-the-arm throw
    var tk = m.tokens[j % m.tokens.length], own = j % 2 ? 'L' : 'R';
    if (tk.t !== 'U' && tk.t !== own && m.parsed.dirs[(j % m.tokens.length) % m.parsed.dirs.length] === 'o')
      r.underZ = Math.max(r.underZ, m.pose(j).hands[j % 2][2]);
    var nn = m.digit(j);
    if (nn < 3) continue;
    var k = j + nn - 2, a = m.pose(j).hands[j % 2], b = m.pose(m.catchTime(k)).hands[k % 2];
    r.minArc = Math.min(r.minArc, Math.abs(b[0] - a[0]));
  }
  var steps = m.period * perBeat, prev = [], dts = 1 / (perBeat * m.bps);
  for (var i = 0; i < steps; i++) {
    var t = i / perBeat, p = m.at(t);
    // a turning pattern (Mike's mess, sebs) is checked in the juggler's own frame: turn it back
    if (p.yaw) {
      var cy = Math.cos(-p.yaw), sy = Math.sin(-p.yaw), un = function (q) { return [q[0] * cy + q[2] * sy, q[1], -q[0] * sy + q[2] * cy]; };
      p.hands = p.hands.map(un); p.elbows = p.elbows.map(un); p.shoulders = p.shoulders.map(un);
      p.balls = p.balls.map(function (b) { var c = {}; for (var k in b) c[k] = b[k]; c.pos = un(b.pos); return c; });
    }
    var R = { s: p.shoulders[0], e: p.elbows[0], h: p.hands[0] }, L = { s: p.shoulders[1], e: p.elbows[1], h: p.hands[1] };
    var ff = segDist(R.e, R.h, L.e, L.h);
    if (ff.d < r.minFore) { r.minFore = ff.d; r.worstT = t; }
    // where the forearms come close enough to overlap, the top one must be over the other
    // (higher). Near the top arm's elbow the under hand is in front of it, which is right.
    if (ff.d < 12 && Math.abs(p.w) > 0.4) {
      var topP = p.w > 0 ? ff.c1 : ff.c2, botP = p.w > 0 ? ff.c2 : ff.c1;
      if (topP[1] < botP[1] + 2) r.wrongTop++;
    }
    p.balls.forEach(function (b) {
      if (!b.fly) return;
      if (b.t1 - b.t0 < 0.35) return;   // (a 1 goes hand to hand, or straight across close to the hands)
      [R, L].forEach(function (A, h) {
        if (h === b.from && t - b.t0 < 0.2) return;
        if (h === b.to && b.t1 - t < 0.2) return;
        var d = Math.min(segDist(b.pos, b.pos, A.e, A.h).d - G.foreR, segDist(b.pos, b.pos, A.s, A.e).d - G.upperR) - BALL_R;
        if (d < r.minBall) { r.minBall = d; r.ballT = t; }
      });
    });
    // balls in the air never pass through each other (gap between their surfaces; balls just
    // thrown or about to be caught are near a hand that may hold another, so are left out)
    var fl = p.balls.filter(function (b) { return b.fly && t - b.t0 > 0.1 && b.t1 - t > 0.1; });
    for (var bi = 0; bi < fl.length; bi++) for (var bj = bi + 1; bj < fl.length; bj++) {
      var dd = len(sub(fl[bi].pos, fl[bj].pos)) - 2 * BALL_R;
      if (dd < r.minBB) { r.minBB = dd; r.bbT = t; }
    }
    // the bottom hand never goes behind the top arm's elbow when it is close to it
    if (Math.abs(p.w) > 0.4) {
      var TA = p.w > 0 ? R : L, BA = p.w > 0 ? L : R;
      if (Math.hypot(BA.h[0] - TA.e[0], BA.h[1] - TA.e[1]) < 18 && BA.h[2] < TA.e[2]) r.behind++;
    }
    // hands and forearms stay out of the body
    [R, L].forEach(function (A) {
      var d = bodyDepth(A.h, G.handR);
      for (var q = 0; q <= 4; q++) d = Math.max(d, bodyDepth(add(A.e, mul(sub(A.h, A.e), q / 4)), G.foreR));
      if (d > r.inBody) { r.inBody = d; r.inBodyT = t; }
    });
    // footage targets (the author's mills mess, 2026-11-22): hands well out in front,
    // elbows in by the body while crossed, and the top hand no higher than the lower chest
    // flow: how hard each hand accelerates (cm/s/s), from the last three samples
    [R.h, L.h].forEach(function (hp, h) {
      var q = prev[h] || (prev[h] = []);
      q.push(hp.slice()); if (q.length > 3) q.shift();
      if (q.length === 3) {
        var a = len(add(sub(q[2], q[1]), sub(q[0], q[1]))) / (dts * dts);
        if (a > r.maxAcc) { r.maxAcc = a; r.accT = t; }
      }
    });
    [R.h, L.h].forEach(function (hp, h) { r.yMin[h] = Math.min(r.yMin[h], hp[1]); r.yMax[h] = Math.max(r.yMax[h], hp[1]); });
    r.handZ += (R.h[2] + L.h[2]) / 2 / steps; r.handY += (R.h[1] + L.h[1]) / 2 / steps;
    r.elbowY += (R.e[1] + L.e[1]) / 2 / steps; r.elbowZ += (R.e[2] + L.e[2]) / 2 / steps;
    if (Math.abs(p.w) > 0.8) {
      r.crossed++;
      r.elbowX = Math.max(r.elbowX, Math.abs(R.e[0]), Math.abs(L.e[0]));
      r.topY = Math.max(r.topY, (p.w > 0 ? R : L).h[1]);
    }
    r.minHand = Math.min(r.minHand, len(sub(R.h, L.h)));
    r.minHandFore = Math.min(r.minHandFore, segDist(R.h, R.h, L.e, L.h).d, segDist(L.h, L.h, R.e, R.h).d);
    r.maxReach = Math.max(r.maxReach, p.reach);
    [R, L].forEach(function (A) { r.samples++; if (A.h[1] < A.e[1] - 3) r.down++; });
    [R.e, L.e].forEach(function (el) { r.minElbowBody = Math.min(r.minElbowBody, Math.max(Math.abs(el[0]) - 14, Math.abs(el[2]) - 10)); });
  }
  r.scoop = Math.min(r.yMax[0] - r.yMin[0], r.yMax[1] - r.yMin[1]);   // how far each hand rises and falls in its loop
  return r;
}
