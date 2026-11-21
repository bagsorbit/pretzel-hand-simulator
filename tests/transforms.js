// Checks the pattern tools against the pairs published in the article:
//   jsc tests/transforms.js
load('engine.js');
var PH = this.PH, bad = 0;
function name(src) { var f = PH.findPattern(src); return f ? f.name : '(not in the list)'; }
function expect(label, fn, from, to) {
  var r = fn(PH.PATTERNS.filter(function (p) { return p.name === from; })[0].src);
  var got = r.ok ? name(r.src) : 'error: ' + r.error;
  var ok = got === to;
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
print((r.ok && /^234 o\/ Ul\. Lu Uu : Ur\. Ru Uu$/.test(r.src) ? 'ok   ' : (bad++, 'FAIL ')) + 'Mills/flos of 423 mills mess -> ' + (r.ok ? r.src : r.error) + ' (expected 234 o/ Ul. Lu Uu : Ur. Ru Uu)');
print(bad ? bad + ' check(s) failed' : 'all tool checks passed');
