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
  if (!r.slashOk) msgs.push('slash: written ' + m.parsed.slash + ', but the first throw peaks on the juggler\'s ' + (m.slashSeen === '/' ? 'left (/)' : 'right (\\)'));
  if (r.minFore < G.foreR * 2 - G.graze) msgs.push('forearms touch: ' + f1(r.minFore) + ' cm at beat ' + f1(r.worstT));
  if (r.minHand < G.handR * 2) msgs.push('hands touch: ' + f1(r.minHand));
  if (r.minHandFore < G.handR + G.foreR - G.graze) msgs.push('hand touches other forearm: ' + f1(r.minHandFore));
  if (r.maxReach > 0.995) msgs.push('arm cannot reach: ' + f1(r.maxReach * 100) + '%');
  if (r.minBall < -G.graze) msgs.push('ball goes through an arm: ' + f1(r.minBall) + ' cm at beat ' + f1(r.ballT));
  if (r.minBB < 0) msgs.push('balls collide in the air: ' + f1(r.minBB) + ' cm at beat ' + f1(r.bbT));
  if (r.wrongTop) msgs.push('wrong arm in front at ' + r.wrongTop + ' samples');
  if (r.minElbowBody < 0) msgs.push('elbow inside body');
  if (r.inBody > 0.5) msgs.push('hand or forearm goes ' + f1(r.inBody) + ' cm into the body at beat ' + f1(r.inBodyT));
  if (r.minArc < G.minArc) msgs.push('a ball barely arcs: ' + f1(r.minArc) + ' cm sideways');
  if (r.underZ > G.underZMax) msgs.push('under hand reaches ' + f1(r.underZ) + ' cm forward at an under-arm throw (limit ' + G.underZMax + ')');
  if (r.behind) msgs.push('under hand goes behind the top elbow at ' + r.behind + ' samples');
  // flow: hands mustn't jolt (the author's hands peak about 1500 cm/s/s carrying a ball; 1s need quick hands)
  var accLimit = FOOT.maxAcc * (/1/.test(pt.src.split(/[oiOI]/)[0]) ? 2 : 1);
  if (r.maxAcc > accLimit) msgs.push('a hand jolts: ' + Math.round(r.maxAcc) + ' cm/s/s at beat ' + f1(r.accT) + ' (limit ' + accLimit + ')');
  if (r.down / r.samples > 0.1) msgs.push('forearm slopes down ' + Math.round(100 * r.down / r.samples) + '% of the time');
  // the author's filmed mills mess: hands 35-45 cm out in front, elbows in by the body, top hand at the lower chest
  // (the cascades weren't filmed, so they keep their own shape)
  if (pt.group !== 'Cascades') {
  if (r.scoop < FOOT.scoop) msgs.push('hands barely scoop: ' + f1(r.scoop) + ' cm up and down (footage: about 25)');
  if (r.handZ < FOOT.handZ) msgs.push('hands work only ' + f1(r.handZ) + ' cm in front on average (footage: ' + FOOT.handZ + '+)');
  if (r.handY > FOOT.handY) msgs.push('hands work at ' + f1(r.handY) + ' cm high on average (footage: up to ' + FOOT.handY + ')');
  if (r.elbowY > FOOT.elbowY || r.elbowZ > FOOT.elbowZ) msgs.push('elbows sit at ' + f1(r.elbowY) + ' cm high, ' + f1(r.elbowZ) + ' cm forward on average (footage: up to ' + FOOT.elbowY + ' and ' + FOOT.elbowZ + ')');
  if (r.crossed && r.elbowX > FOOT.elbowX) msgs.push('an elbow sticks out ' + f1(r.elbowX) + ' cm while crossed (footage: up to ' + FOOT.elbowX + ')');
  if (r.crossed && r.topY > FOOT.topY) msgs.push('top hand goes up to ' + f1(r.topY) + ' cm while crossed (footage: up to ' + FOOT.topY + ')');
  }
  print((msgs.length ? 'WARN ' : 'ok   ') + pt.name + '  balls ' + m.balls + ', forearm gap ' + f1(r.minFore) +
    ', jolt ' + Math.round(r.maxAcc) + ', in front ' + f1(r.handZ) + ', hands at ' + f1(r.handY) + ', elbows at ' + f1(r.elbowY) + '/' + f1(r.elbowZ) + ', elbow out ' + f1(r.elbowX) + ', top hand ' + f1(r.topY) + ', ball clearance ' + f1(r.minBall) + ', ball gap ' + (r.minBB < 1e8 ? f1(r.minBB) : '-') + ', hand gap ' + f1(r.minHand) + ', into body ' + f1(r.inBody) + ', arc ' + f1(r.minArc) + ', reach ' + f1(r.maxReach * 100) + '%, forearm down ' +
    Math.round(100 * r.down / r.samples) + '%' + (m.notes.length ? '  [' + m.notes.join('; ') + ']' : ''));
  msgs.forEach(function (s) { print('       ' + s); });
  if (msgs.length) bad++;
});
print(bad ? bad + ' pattern(s) need a look' : 'all patterns passed');
