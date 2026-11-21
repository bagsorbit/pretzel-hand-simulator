// Run with macOS jsc from the project folder:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/check.js
// Checks every pattern: it reads, the siteswap works, the slash matches where the
// first throw peaks, arms reach, elbows stay out of the body, forearms angle up,
// the two arms never pass through each other, and balls never pass through an arm.
load('engine.js');
var PH = this.PH, G = PH.G;
// trial settings: jsc -e 'var OVERRIDES={outUnder:30}' tests/check.js
if (this.OVERRIDES) for (var k in this.OVERRIDES) G[k] = this.OVERRIDES[k];
load('tests/measure.js');
function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
var bad = 0;
PH.PATTERNS.forEach(function (pt) {
  var r = measure(pt, 80);
  if (r.error) { print('FAIL ' + pt.name + ': ' + r.error); bad++; return; }
  var m = r.m, msgs = [];
  if (!r.slashOk) msgs.push('slash: written ' + m.parsed.slash + ', first throw peaks ' + m.slashSeen);
  if (r.minFore < G.foreR * 2) msgs.push('forearms touch: ' + f1(r.minFore) + ' cm at beat ' + f1(r.worstT));
  if (r.minHand < G.handR * 2) msgs.push('hands touch: ' + f1(r.minHand));
  if (r.minHandFore < G.handR + G.foreR) msgs.push('hand touches other forearm: ' + f1(r.minHandFore));
  if (r.maxReach > 0.995) msgs.push('arm cannot reach: ' + f1(r.maxReach * 100) + '%');
  if (r.minBall < 0.5) msgs.push('ball goes through an arm: ' + f1(r.minBall) + ' cm at beat ' + f1(r.ballT));
  if (r.wrongTop) msgs.push('wrong arm in front at ' + r.wrongTop + ' samples');
  if (r.minElbowBody < 0) msgs.push('elbow inside body');
  if (r.behind) msgs.push('under hand goes behind the top elbow at ' + r.behind + ' samples');
  if (r.down / r.samples > 0.1) msgs.push('forearm slopes down ' + Math.round(100 * r.down / r.samples) + '% of the time');
  print((msgs.length ? 'WARN ' : 'ok   ') + pt.name + '  balls ' + m.balls + ', forearm gap ' + f1(r.minFore) +
    ', ball clearance ' + f1(r.minBall) + ', hand gap ' + f1(r.minHand) + ', reach ' + f1(r.maxReach * 100) + '%, forearm down ' +
    Math.round(100 * r.down / r.samples) + '%' + (m.notes.length ? '  [' + m.notes.join('; ') + ']' : ''));
  msgs.forEach(function (s) { print('       ' + s); });
  if (msgs.length) bad++;
});
print(bad ? bad + ' pattern(s) need a look' : 'all patterns passed');
