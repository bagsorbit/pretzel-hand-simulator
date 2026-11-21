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


var BALL_R = 4.2;
function measure(pt, perBeat) {
  var G = PH.G, m = PH.build(pt.src);
  if (!m.ok) return { error: m.error };
  var r = { m: m, minFore: 1e9, minHand: 1e9, minHandFore: 1e9, maxReach: 0, wrongTop: 0, minElbowBody: 1e9, worstT: 0,
            minBall: 1e9, ballT: 0, down: 0, samples: 0, slashOk: m.slashSeen === m.parsed.slash };
  var steps = m.period * perBeat;
  for (var i = 0; i < steps; i++) {
    var t = i / perBeat, p = m.at(t);
    var R = { s: p.shoulders[0], e: p.elbows[0], h: p.hands[0] }, L = { s: p.shoulders[1], e: p.elbows[1], h: p.hands[1] };
    var ff = segDist(R.e, R.h, L.e, L.h);
    if (ff.d < r.minFore) { r.minFore = ff.d; r.worstT = t; }
    if (ff.d < 16 && Math.abs(p.w) > 0.4) {
      var rFront = ff.c1[2] + 0.5 * ff.c1[1] > ff.c2[2] + 0.5 * ff.c2[1];
      if (rFront !== (p.w > 0)) r.wrongTop++;
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
    r.minHand = Math.min(r.minHand, len(sub(R.h, L.h)));
    r.minHandFore = Math.min(r.minHandFore, segDist(R.h, R.h, L.e, L.h).d, segDist(L.h, L.h, R.e, R.h).d);
    r.maxReach = Math.max(r.maxReach, p.reach);
    [R, L].forEach(function (A) { r.samples++; if (A.h[1] < A.e[1] - 3) r.down++; });
    [R.e, L.e].forEach(function (el) { r.minElbowBody = Math.min(r.minElbowBody, Math.max(Math.abs(el[0]) - 14, Math.abs(el[2]) - 10)); });
  }
  return r;
}
