// Run with macOS jsc from the project folder:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/check.js
// Checks every pattern: it reads, the siteswap works, the slash matches where the
// first throw peaks, arms reach, and the two arms never pass through each other.
load('engine.js');
var PH = this.PH, G = PH.G;

function segDist(p1, q1, p2, q2) {
  // closest distance between segments p1q1 and p2q2, plus the closest points
  var d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  var a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2);
  var den = a * e - b * b, s = den > 1e-9 ? clamp((b * f - c * e) / den) : 0;
  var t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
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

var bad = 0;
PH.PATTERNS.forEach(function (pt) {
  var m = PH.build(pt.src);
  if (!m.ok) { print('FAIL ' + pt.name + ': ' + m.error); bad++; return; }
  var msgs = [];
  if (m.slashSeen !== m.parsed.slash) msgs.push('slash: written ' + m.parsed.slash + ', first throw peaks ' + m.slashSeen);
  var minFore = 1e9, minHand = 1e9, minHandFore = 1e9, maxReach = 0, wrongTop = 0, minElbowBody = 1e9, worstT = 0;
  var steps = m.period * 2 * 40;
  for (var i = 0; i < steps; i++) {
    var t = i / 80;
    var p = m.at(t);
    var R = { s: p.shoulders[0], e: p.elbows[0], h: p.hands[0] }, L = { s: p.shoulders[1], e: p.elbows[1], h: p.hands[1] };
    var ff = segDist(R.e, R.h, L.e, L.h);
    if (ff.d < minFore) { minFore = ff.d; worstT = t; }
    // the arm on top must be in front where the forearms come close
    if (ff.d < 16 && Math.abs(p.w) > 0.4) {
      var rFront = ff.c1[2] + 0.5 * ff.c1[1] > ff.c2[2] + 0.5 * ff.c2[1];
      if (rFront !== (p.w > 0)) wrongTop++;
    }
    minHand = Math.min(minHand, len(sub(R.h, L.h)));
    minHandFore = Math.min(minHandFore, segDist(R.h, R.h, L.e, L.h).d, segDist(L.h, L.h, R.e, R.h).d);
    maxReach = Math.max(maxReach, p.reach);
    // elbows outside the body (body is roughly a box 15 wide each side, 11 deep)
    [R.e, L.e].forEach(function (el) {
      var inside = Math.max(Math.abs(el[0]) - 15, Math.abs(el[2]) - 11);
      minElbowBody = Math.min(minElbowBody, inside);
    });
  }
  var limF = G.foreR * 2, limH = G.handR * 2, limHF = G.handR + G.foreR;
  if (minFore < limF) msgs.push('forearms touch: ' + f1(minFore) + ' cm at beat ' + f1(worstT));
  if (minHand < limH) msgs.push('hands touch: ' + f1(minHand));
  if (minHandFore < limHF) msgs.push('hand touches other forearm: ' + f1(minHandFore));
  if (maxReach > 0.995) msgs.push('arm cannot reach: ' + f1(maxReach * 100) + '%');
  if (wrongTop) msgs.push('wrong arm in front at ' + wrongTop + ' samples');
  if (minElbowBody < 0) msgs.push('elbow inside body');
  print((msgs.length ? 'WARN ' : 'ok   ') + pt.name + '  balls ' + m.balls + ', loop ' + m.loop + ' beats, forearm gap ' + f1(minFore) +
    ', hand gap ' + f1(minHand) + ', reach ' + f1(maxReach * 100) + '%' + (m.notes.length ? '  [' + m.notes.join('; ') + ']' : ''));
  msgs.forEach(function (s) { print('       ' + s); });
  if (msgs.length) bad++;
});
print(bad ? bad + ' pattern(s) need a look' : 'all patterns passed');
