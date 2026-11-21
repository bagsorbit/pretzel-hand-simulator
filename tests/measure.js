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
            minBall: 1e9, ballT: 0, down: 0, samples: 0, behind: 0, inBody: 0, inBodyT: 0, slashOk: m.slashSeen === m.parsed.slash };
  // every ball should arc across a little, not go straight up and down
  r.minArc = 1e9; r.underZ = 0;
  for (var j = 0; j < m.period; j++) {
    // how far forward the hand is at an outside under-the-arm throw
    var tk = m.tokens[j % m.tokens.length], own = j % 2 ? 'L' : 'R';
    if (tk.t !== 'U' && tk.t !== own && m.parsed.dirs[(j % m.tokens.length) % m.parsed.dirs.length] === 'o')
      r.underZ = Math.max(r.underZ, m.pose(j).hands[j % 2][2]);
    var nn = m.parsed.digits[j % m.parsed.digits.length];
    if (nn < 3) continue;
    var k = j + nn - 2, a = m.pose(j).hands[j % 2], b = m.pose(k + 0.5).hands[k % 2];
    r.minArc = Math.min(r.minArc, Math.abs(b[0] - a[0]));
  }
  var steps = m.period * perBeat;
  for (var i = 0; i < steps; i++) {
    var t = i / perBeat, p = m.at(t);
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
      [R, L].forEach(function (A, h) {
        if (h === b.from && t - b.t0 < 0.2) return;
        if (h === b.to && b.t1 - t < 0.2) return;
        var d = Math.min(segDist(b.pos, b.pos, A.e, A.h).d - G.foreR, segDist(b.pos, b.pos, A.s, A.e).d - G.upperR) - BALL_R;
        if (d < r.minBall) { r.minBall = d; r.ballT = t; }
      });
    });
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
    r.minHand = Math.min(r.minHand, len(sub(R.h, L.h)));
    r.minHandFore = Math.min(r.minHandFore, segDist(R.h, R.h, L.e, L.h).d, segDist(L.h, L.h, R.e, R.h).d);
    r.maxReach = Math.max(r.maxReach, p.reach);
    [R, L].forEach(function (A) { r.samples++; if (A.h[1] < A.e[1] - 3) r.down++; });
    [R.e, L.e].forEach(function (el) { r.minElbowBody = Math.min(r.minElbowBody, Math.max(Math.abs(el[0]) - 14, Math.abs(el[2]) - 10)); });
  }
  return r;
}
