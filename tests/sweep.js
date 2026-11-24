// Collision sweep: every pattern in the list, as written and with a ball fewer and one or two
// more (2 to 5 balls), checked for balls meeting in the air, balls through arms, forearms,
// hands, hand against forearm, arms in the body and the wrong arm on top.
//   jsc tests/sweep.js          (a few minutes; XX lines have something to look at)
load('engine.js'); var PH = this.PH, G = PH.G; load('tests/measure.js');
if (this.OV) for (var k in OV) G[k] = OV[k];
var PB = this.PB || 30, rows = [];
PH.PATTERNS.forEach(function (pt) {
  if (!PH.build(pt.src).ok) return;
  var vars = [[0, pt.src]];
  [-1, 1, 2].forEach(function (k) { var r = PH.addBalls(pt.src, k); if (r.ok) vars.push([k, r.src]); });
  vars.forEach(function (v) {
    var m = PH.build(v[1], pt.turn ? { turn: pt.turn } : undefined); if (!m.ok) return;
    var r = measure({ name: pt.name, src: v[1], turn: pt.turn }, PB);
    if (r.error) return;
    rows.push({ name: pt.name, src: v[1], balls: m.balls, k: v[0], bb: r.minBB, ball: r.minBall, fore: r.minFore, hand: r.minHand, hf: r.minHandFore, body: r.inBody, wrong: r.wrongTop });
  });
});
var lim = { bb: 0, ball: -G.graze, fore: 2 * G.foreR - G.graze, hand: 2 * G.handR, hf: G.handR + G.foreR - G.graze };
rows.forEach(function (x) {
  var p = [];
  if (x.bb < lim.bb) p.push('balls meet ' + x.bb.toFixed(1));
  if (x.ball < lim.ball) p.push('ball through arm ' + x.ball.toFixed(1));
  if (x.fore < lim.fore) p.push('forearms ' + x.fore.toFixed(1));
  if (x.hand < lim.hand) p.push('hands ' + x.hand.toFixed(1));
  if (x.hf < lim.hf) p.push('hand-forearm ' + x.hf.toFixed(1));
  if (x.body > 0.5) p.push('into body ' + x.body.toFixed(1));
  if (x.wrong > 0) p.push('wrong arm on top ' + x.wrong);
  print((p.length ? 'XX ' : 'ok ') + x.balls + ' balls ' + x.name + (x.k ? ' (' + (x.k > 0 ? '+' : '') + x.k + ')' : '') + (p.length ? ': ' + p.join(', ') : ''));
});
