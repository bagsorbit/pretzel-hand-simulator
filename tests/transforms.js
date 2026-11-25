// Checks the pattern tools against the pairs published in the article:
//   jsc tests/transforms.js
load('engine.js');
var PH = this.PH, bad = 0;
function name(src) { var f = PH.findPattern(src); return f ? f.name : '(not in the list)'; }
function expect(label, fn, from, to) {
  var r = fn(PH.PATTERNS.filter(function (p) { return p.name === from; })[0].src);
  var got = r.ok ? name(r.src) : 'error: ' + r.error;
  // (the same pattern counts even under another name: the article lists some patterns twice)
  var ok = got === to || (r.ok && PH.sameKey(r.src) === PH.sameKey(PH.PATTERNS.filter(function (p) { return p.name === to; })[0].src));
  if (!ok) bad++;
  print((ok ? 'ok   ' : 'FAIL ') + label + ' of ' + from + ' -> ' + (r.ok ? r.src : '') + '  = ' + got + (ok ? '' : ' (expected ' + to + ')'));
}
var TR = [['Mills mess', 'TR mills mess'], ['Flipped mess', 'TR flipped mess'], ['Flos mess', 'TR flos mess'], ['Flipped flos mess', 'TR flipped flos mess'],
          ["Rubenstein's Revenge", "TR Rubenstein's Revenge"], ["Alt Rubenstein's Revenge", "TR alt Rubenstein's Revenge"], ["Flos Rubenstein's Revenge", "TR flos Rubenstein's Revenge"],
          ['Cascade', 'Reverse cascade']];
TR.forEach(function (pr) { expect('Time reverse', PH.timeReverse, pr[0], pr[1]); expect('Time reverse', PH.timeReverse, pr[1], pr[0]); });
[['Mills mess', 'Flipped mess'], ['Flos mess', 'Flipped flos mess'], ['TR mills mess', 'TR flipped mess'], ['TR flos mess', 'TR flipped flos mess']].forEach(function (pr) {
  expect('Flip', PH.flip, pr[0], pr[1]); expect('Flip', PH.flip, pr[1], pr[0]);
});
[['Mills mess', 'Flipped flos mess'], ['Flipped flos mess', 'Flipped mess'], ['Flipped mess', 'Flos mess'], ['Flos mess', 'Mills mess']].forEach(function (pr) {
  expect('Mills/flos', PH.millsFlos, pr[0], pr[1]);
});
var r = PH.millsFlos(PH.PATTERNS.filter(function (p) { return p.name === '423 mills mess'; })[0].src);
print((r.ok && /^234 o\\ Ul\. Lu Uu : Ur\. Ru Uu$/.test(r.src) ? 'ok   ' : (bad++, 'FAIL ')) + 'Mills/flos of 423 mills mess -> ' + (r.ok ? r.src : r.error) + ' (expected 234 o\\ Ul. Lu Uu : Ur. Ru Uu)');
// the article's other pairs, now that time reverse handles everything
[['Hectic mills', 'TR hectic mills'], ['Hectic flipped mess', 'TR hectic flipped mess'], ['Hectic flos mess', 'TR hectic flos mess'],
 ['Hectic flipped flos mess', 'TR hectic flipped flos mess'],
 ['Butterfly basic mess Opp1', 'Butterfly TR basic mess Opp3'], ['Butterfly basic mess Opp2', 'Butterfly TR basic mess Opp2'],
 ["Rubenstein's Revenge, butterfly loop", "TR Rubenstein's Revenge, butterfly loop"]].forEach(function (pr) { expect('Time reverse', PH.timeReverse, pr[0], pr[1]); });
expect('Flip', PH.flip, 'Under throw windmill with shower', 'Under catch windmill with shower');
[['Clockwise windmill (under throws)', 'Anticlockwise windmill (under throws)'], ['Half mess', 'Half mess, left hand starts'], ['Less than half a mess (1:1:1:1)', 'Less than half a mess, left hand starts']].forEach(function (pr) { expect('Mirror', PH.mirror, pr[0], pr[1]); expect('Mirror', PH.mirror, pr[1], pr[0]); });
expect('Flip', PH.flip, 'Half mess, left hand starts', 'Half mess, left arm on top, left hand starts');
// every pattern: reversing twice, flipping twice, cycling right round, and a ball on then off
// give back the same pattern
var round = 0;
PH.PATTERNS.forEach(function (pt) {
  if (!PH.build(pt.src).ok) return;
  var k = PH.sameKey(pt.src), probs = [];
  var t1 = PH.timeReverse(pt.src), t2 = t1.ok && PH.timeReverse(t1.src);
  if (!t1.ok || !t2.ok || PH.sameKey(t2.src) !== k) probs.push('time reverse twice');
  var f1 = PH.flip(pt.src), f2 = f1.ok && PH.flip(f1.src);
  if (!f1.ok || !f2.ok || PH.sameKey(f2.src) !== k) probs.push('flip twice');
  var mi = PH.mirror(pt.src), mi2 = mi.ok && PH.mirror(mi.src);
  if (mi.ok && (!mi2.ok || PH.sameKey(mi2.src) !== k)) probs.push('mirror twice');
  var c = pt.src, steps = 0;
  while (steps < 12) { var cr = PH.cycleSiteswap(c); if (!cr.ok) break; c = cr.src; steps++; if (PH.sameKey(c) === k) break; }
  if (steps && PH.sameKey(c) !== k) probs.push('cycling right round');
  // (a thrown 2 comes back as a held one: a 3 one ball down is held, so skip those)   (and patterns kept to their own ball count, fixedBalls)
  var up = PH.addBalls(pt.src, 1), down = up.ok && PH.addBalls(up.src, -1);
  if (!/T/.test(PH.parse(pt.src).head) && !pt.fixedBalls && (!up.ok || !down.ok || PH.sameKey(down.src) !== k)) probs.push('a ball on and off');
  if (probs.length) { bad++; print('FAIL ' + pt.name + ': ' + probs.join(', ')); } else round++;
});
print('ok   ' + round + ' patterns come back to themselves after reversing, flipping, mirroring, cycling and a ball on and off');
print(bad ? bad + ' check(s) failed' : 'all tool checks passed');
