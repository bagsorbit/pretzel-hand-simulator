/* Pretzel Hand engine: reads a Pretzel Hand notation string and works out,
   for any moment, where both hands, elbows, shoulders and balls are.

   Units are centimetres and beats. The juggler faces the audience along +z.
   The juggler's right side is world -x, so from the front the right arm is
   on the viewer's left, as in the article.

   Timing: throw j happens at beat j (right hand on even j), and the same
   hand catches catchLag beats later (0.8, measured from the author's own
   juggling: each hand holds a ball about 60% of the time). The events still
   go throw, catch, throw, catch... A ball thrown as a 3 is in the air for
   1.8 beats and held for 1.2.

   Arm states come straight from the letters: R = arms crossed with the
   right arm on top, L = crossed with the left arm on top, U = uncrossed.
   Throw letters give the state at the throw, catch letters at the catch.
   Crossed means both hands are on the other side of the body. */
(function (root) {
  'use strict';

  var G = {
    shoulderX: 19, shoulderY: 138, shoulderZ: 0,
    upper: 32, fore: 32,            // shoulder to elbow, elbow to hand centre
    handZ: 33.5,                      // how far in front of the body the hands work
    outU: 23, outX: 21, outUnder: 17.2, inner: 4.5,   // throw/catch distance from the middle
    crossMin: 7,                    // a crossed hand is at least this far over
    throwY: 111.9, catchY: 112.3, lowY: 112,       // heights of a hand's scoop: release, catch, and its low point
    loopY: 122.2, lowAt: 0.6,                    // top of the empty hand's loop; where in the hold the low point is
    topLift: 0, botDrop: 0, roleLift: 2, roleDrop: 0, topFloor: 122.1, botCap: 108.4, bandSoft: 1.8, bodyEase: 3, crossEase: 0.2, flowBlur: 0.06, blurSwings: 1, swapRise0: 0.55, swapRise1: 0.95, swapStay: 0.5, swapFwd: 0, swapKey: 0, orbitR: 13, orbitSide: -1, orbitSideDown: -1, sharePushOther: 0.43, shareOrbitR: 14.09, shareOrbitRY: 7.36, shareLag: 0.43, shareOrbitXa: 1, shareOrbitAlong: 0.5, shareCatchUp: 7.95, shareEven: 1, shareRaise: 4.12, shareOrbit0: 0.12, shareOrbit1: 0.95, shareOrbitIn: 0.19, shareOrbitOut: 0.89, shareSwapRise0: 0.62, shareSwapRise1: 1, shareSwapEaseIn: 0.11, shareSwapEaseOut: 0.95, shareLift: 2.5, shareLiftW: 0.78, orbitXa: 0.75, centreKeys: 1, centreMin: 3,  sharePushFwd: 2, orbitElbow: 0, orbitHold: 1, orbit0: 0.1, orbit1: 0.9, orbitIn: 0.2, orbitOut: 0.8, swapOut: 0, swapUnder: 10, swapMidT: 0.4, roomBack: 0, roomDown: 0, swapClear: 2, swapEaseIn: 0.4, shareA: 0.74, shareB: 0.88, swapEaseOut: 0.9, swapPushFwd: 1, swapPushUp: 0.3, swapPushOther: 0.3, swapPushBack: 0.1, nearHold: 0.1, nearBlur: 0.1,                    // while the arms cross, the top hand rides higher and the bottom hand lower
    topZ: 3.1, botZ: -2.8,                     // and the top arm sits a little further forward
    topElbow: [15.1, 119.2, 24], botElbow: [12, 104.7, 14.9], elbowEarly: 0.8, underDrop: 10, underFwd: 8.7, underOut: 1, underWin: 0.5, nearIn: 22, nearOut: 29.6,
    underCatch: 0, minArc: 12, graze: 1, underZMax: 34, oneFlight: 0.25, tempoK: 0.8, compress: 0.5, peak4: 165, peakStep: 7,   // the most a ball or arm may brush another arm, in cm
    throwMatch: 1.3, oneStroke: 0.1, oneOut: 10, oneIn: 13, throwBefore: 0.3, throwAfter: 0.2, catchBefore: 0.4, catchAfter: 0.3, underStroke: 0.5, catchGive: 0.3, maxStroke: 110, elbowOut: 0.1, elbowFwd: 0,
    handR: 4.1, foreR: 3.1, upperR: 3.7, ballR: 3.3,
    bps: 3.2,                       // beats per second at full speed (the author's own mills mess, filmed 2026-11-22)
    catchLag: 0.8,                  // beats from a hand's throw to its next catch
    changeLag: 0.5,                 // the same, when the arms must change over before the next throw
    g: 980
  };
  var OWN = [-1, 1];                // own side of hand 0 (right) and hand 1 (left)

  function lcm(a, b) { var x = a, y = b; while (y) { var t = y; y = x % y; x = t; } return a / x * b; }
  function softMin(a, b, e) { return 0.5 * (a + b - Math.sqrt((a - b) * (a - b) + e * e)); }
  function softMax(a, b, e) { return 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + e * e)); }
  function smoother(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * t * (t * (6 * t - 15) + 10); }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function stateSign(ch) { ch = ch.toUpperCase(); return ch === 'R' ? 1 : ch === 'L' ? -1 : 0; }

  // ---------- reading the notation ----------
  function parse(src) {
    var s = String(src).replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
    var m = s.match(/^([0-9T\[\]]*)\s*([oiOIL]*)\s*([\/\\|])\s*(.*)$/);
    if (!m) return { ok: false, error: 'Expected something like "o\\ Ru Ul Ll : Lu Ur Rr".' };
    var head = m[1], dirs = m[2], slash = m[3], body = m[4];
    if (/[\[\]]/.test(head)) return { ok: false, error: 'Multiplexes are not in the simulator yet.' };
    if (/[IL]/.test(dirs)) return { ok: false, error: 'I (columns) and the L start are not in the simulator yet.' };
    if (!dirs) dirs = 'o';
    var digits = [], active = [];
    for (var i = 0; i < head.length; i++) {
      var c = head[i];
      if (c === 'T') { if (digits.length) active[digits.length - 1] = true; continue; }
      digits.push(+c); active.push(false);
    }
    if (!digits.length) { digits = [3]; active = [false]; }
    if (/-/.test(body)) return { ok: false, error: 'Direction changes (-) are not in the simulator yet.' };
    if (/_/.test(body)) return { ok: false, error: 'Empty hands (_) are not in the simulator yet.' };
    var tokens = [], group = 0, parts = body.replace(/:/g, ' : ').split(' ');
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (p === ':') { group++; continue; }
      // a throw letter, then for a 1 the other hand's catch of it in brackets, then this hand's catch
      var tm = p.match(/^([RLU])(?:\(([rlu])\))?([rlu])?(\.?)$/);
      if (!tm) return { ok: false, error: 'Cannot read "' + p + '". Each throw is a capital R, L or U, then a small r, l or u for the catch.' };
      tokens.push({ t: tm[1], br: tm[2] || null, c: tm[3] || null, hold: tm[4] === '.', group: group, text: p });
    }
    if (!tokens.length) return { ok: false, error: 'No throws found.' };
    // a throw written without its catch (just before a 1) is caught as the bracket in the next throw says
    for (i = 0; i < tokens.length; i++) {
      var nx = tokens[(i + 1) % tokens.length];
      if (!tokens[i].c) {
        if (!nx.br) return { ok: false, error: '"' + tokens[i].text + '" has no catch letter. That is only allowed just before a 1, written like U(u).' };
        tokens[i].c = nx.br; tokens[i].cFromNext = true;
      } else if (nx.br) return { ok: false, error: '"' + nx.text + '" is a 1, so the throw before it should have no catch letter of its own.' };
    }
    for (i = 0; i < digits.length; i++)
      if (digits[i] === 0) return { ok: false, error: 'Empty hands (0s) are not in the simulator yet.' };
    return { ok: true, src: s, head: head, dirs: dirs, slash: slash, digits: digits, active: active, tokens: tokens };
  }

  // ---------- building the movement ----------
  function build(src, opts) {
    opts = opts || {};
    var p = typeof src === 'string' ? parse(src) : src;
    if (!p.ok) return p;
    var N = p.tokens.length, D = p.digits.length;
    var P = lcm(lcm(N, D), 2);           // throws in one full cycle
    var n = [], act = [];
    for (var j = 0; j < P; j++) { n[j] = p.digits[j % D]; act[j] = p.active[j % D]; }
    var sum = 0, seen = {};
    for (j = 0; j < P; j++) {
      sum += n[j];
      var land = (j + n[j]) % P;
      if (seen[land]) return { ok: false, error: 'The siteswap ' + p.head + ' does not work with these throws (two balls land together).' };
      seen[land] = true;
    }
    var balls = sum / P;
    function tok(j) { return p.tokens[mod(j, N)]; }
    function nOf(j) { return n[mod(j, P)]; }
    function dirOf(j) { var k = mod(j, N); return p.dirs[k % p.dirs.length]; }
    function flies(j) { var v = nOf(j); return v >= 3 || v === 1 || (v === 2 && act[mod(j, P)]); }
    for (j = 0; j < P; j++) {
      var is1 = nOf(j) === 1, br = !!tok(j).br;
      if (is1 !== br) return { ok: false, error: is1 ? 'Throw ' + (mod(j, N) + 1) + ' is a 1 in the siteswap, so write it like U(u)l.' : '"' + tok(j).text + '" is written as a 1 but the siteswap has a ' + nOf(j) + ' there.' };
    }

    // more balls are juggled faster, so the pattern stays compact rather than towering
    var BPS = G.bps * (balls > 3 ? ((balls - 1.5) / 1.5) / Math.pow(balls / 3, G.tempoK / 2) : 1);

    // Throws higher than the pattern's basic throw are compressed, as jugglers do: a 4 or 5
    // goes only a little higher than a 3. A pattern whose highest throw is a 4 or more is
    // juggled so that throw peaks at a set height (peak4 for a 4, peakStep higher for each
    // step above), and its other throws scale with it. From the author: the 4s in a shower
    // pattern peak definitely below the top of the head, and the 5s in Rubenstein's Revenge
    // and Mike's mess about the top of the head (with Rubenstein's 3s about the mouth).
    // Short throws (1s, thrown 2s) keep real gravity. Each ball still follows a smooth arc,
    // with the gravity that gives it its height.
    var F0 = (Math.max(3, balls) - 2 + G.catchLag) / BPS, H0 = G.g * F0 * F0 / 8, hScale = null;
    function rawRise(F) { return H0 * Math.pow(F / F0, G.compress); }
    function flightOf(q) { return (catchTime(q + nOf(q) - 2) - q) / BPS; }
    // how high throw q peaks when every rise is scaled by sc
    function peakOf(q, sc) {
      var k = q + nOf(q) - 2, tc = catchTime(k), F = (tc - q) / BPS;
      var a = ballOn(baseAt(handOf(q), q)), b = ballOn(baseAt(handOf(k), tc));
      var gg = 8 * rawRise(F) * sc / (F * F), vy = (b[1] - a[1]) / F + gg * F / 2, tp = Math.min(F, Math.max(0, vy / gg));
      return a[1] + vy * tp - gg * tp * tp / 2;
    }
    // (a 3 or higher whose flight is cut short only because it is caught early for a hectic
    // flos change-over keeps the evened-out height of the others, not real gravity: shareEven)
    function gFor(F, j) {
      var even = j !== undefined && G.shareEven && nOf(j) >= 3 && shareCatchK(j + nOf(j) - 2);
      if (F < F0 * 0.999 && !even) return G.g;
      if (hScale === null) {
        hScale = 1;
        var top = 0, q;
        for (q = 0; q < P; q++) if (flies(q)) top = Math.max(top, nOf(q));
        if (top >= 4) {
          var target = G.peak4 + (top - 4) * G.peakStep, lo = 0.05, hi = 4;
          for (var it = 0; it < 30; it++) {
            var mid = (lo + hi) / 2, pk = 0;
            for (q = 0; q < P; q++) if (flies(q) && nOf(q) === top) pk = Math.max(pk, peakOf(q, mid));
            if (pk > target) hi = mid; else lo = mid;
          }
          hScale = (lo + hi) / 2;
        }
      }
      return 8 * rawRise(F) * hScale / (F * F);
    }

    // which throw lands at catch k (null for a held ball)
    var incoming = [];
    for (j = 0; j < P; j++) incoming[j] = null;
    for (j = 0; j < P; j++) if (flies(j)) incoming[mod(j + nOf(j) - 2, P)] = j;
    // when each catch happens: catchLag beats after that hand's throw, except that a 1 is
    // caught by the other hand a moment after it is thrown ("throw, throw, catch, catch")
    function catchTime(k) {
      var inc = incoming[mod(k, P)];
      if (inc !== null && nOf(inc) === 1) return k + 1 + G.oneFlight;   // = the 1's throw time + oneFlight
      // when the arms must cross or uncross between this catch and the next throw (its catch
      // letter differs from the next throw letter), the catch comes earlier, leaving time for it
      // (a hectic flos change-over, from one crossing straight to the other, gets its own)
      var cU = tok(k).c.toUpperCase(), tN = tok(k + 1).t;
      if (cU !== tN && cU !== 'U' && tN !== 'U') return k + G.shareLag;
      if (tok(k).c.toUpperCase() !== tok(k + 1).t) return k + G.changeLag;
      return k + G.catchLag;
    }

    function handOf(j) { return mod(j, 2); }
    function sideFor(h, st) { return st === 'U' ? OWN[h] : -OWN[h]; }

    // every throw and catch in one cycle, in time order
    var events = [];
    for (j = 0; j < P; j++) {
      events.push({ t: j, j: j, part: 'throw', hand: handOf(j), st: stateSign(tok(j).t) });
      events.push({ t: mod(catchTime(j), P), j: j, part: 'catch', hand: handOf(j), st: stateSign(tok(j).c) });
    }
    events.sort(function (a, b) { return a.t - b.t || (a.part === 'throw' ? -1 : 1); });
    var E = events.length;
    var evTimes = events.map(function (e) { return e.t; });
    // index of the last event at or before beat tb
    function eventAt(tb) {
      var t = mod(tb, P), lo = 0, hi = E - 1;
      if (t < evTimes[0]) return E - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (evTimes[mid] <= t + 1e-9) lo = mid; else hi = mid - 1; }
      return lo;
    }
    function evTime(i) { return evTimes[mod(i, E)] + Math.floor(i / E) * P; }   // unwrapped time of event i

    // active key positions: where the hand that throws or catches must be
    function throwKey(j) {
      var h = handOf(j), s = tok(j).t, crossed = s !== 'U';
      var under = crossed && s !== (h === 0 ? 'R' : 'L');
      var far = crossed ? (under ? G.outUnder : G.outX) : G.outU;
      // (a 1 is passed straight across from near where the hand holds it, not carried out wide first: oneOut)
      if (nOf(j) === 1) far = Math.min(far, G.oneOut);
      var x = sideFor(h, s) * (dirOf(j) === 'i' ? G.inner : far);
      return [x, G.throwY, G.handZ];
    }
    function catchKey(j) {
      var h = handOf(j), s = tok(j).c.toUpperCase(), crossed = s !== 'U';
      var under = crossed && s !== (h === 0 ? 'R' : 'L');
      var far = crossed ? (under ? G.outUnder : G.outX) : G.outU;
      var inc = incoming[mod(j, P)];
      var d = dirOf(inc === null ? j - 1 : inc);
      var x = sideFor(h, s) * (d === 'o' ? G.inner : far);
      // (a 1 is caught where the other hand already is, without reaching in for it, so the
      // hands stay apart: oneIn, how far out on its own side. Not when that hand crosses over
      // straight after, as in the flos showers: it catches nearer the middle, on its way across)
      if (inc !== null && nOf(inc) === 1 && !crossed && tok(j + 2).t === 'U') x = sideFor(h, s) * G.oneIn;
      return [x, G.catchY, G.handZ];
    }

    // key positions of each hand: at its own throws and catches, and in between (at the
    // other hand's events) drifting along its path but kept on the side the arms state says
    var keys = [[], []];
    events.forEach(function (ev, i) {
      keys[ev.hand].push({ t: ev.t, i: i, pos: ev.part === 'throw' ? throwKey(ev.j) : catchKey(ev.j), own: true });
    });
    // a pattern whose throws all come from one side (the windmill: both hands throw on the
    // left and catch on the right) is moved sideways as a whole, so it sits in front of the
    // middle of the body (centreKeys 1 = fully centred)
    var keyMid = 0, nKeys = 0;
    keys.forEach(function (ks) { ks.forEach(function (q) { keyMid += q.pos[0]; nKeys++; }); });
    keyMid = nKeys ? keyMid / nKeys : 0;
    keyMid = Math.abs(keyMid) > G.centreMin ? keyMid * G.centreKeys : 0;   // (small leanings are left alone)
    keys.forEach(function (ks) { ks.forEach(function (q) { q.pos = [q.pos[0] - keyMid, q.pos[1], q.pos[2]]; }); });
    for (var h = 0; h < 2; h++) {
      var own = keys[h].slice();
      events.forEach(function (ev, i) {
        if (ev.hand === h) return;
        // own keys just before and after this time (wrapping round the cycle)
        var a = null, b = null;
        for (var q = 0; q < own.length; q++) { if (own[q].t <= ev.t) a = own[q]; }
        for (q = own.length - 1; q >= 0; q--) { if (own[q].t >= ev.t) b = own[q]; }
        var ta, tb2;
        if (!a) { a = own[own.length - 1]; ta = a.t - P; } else ta = a.t;
        if (!b) { b = own[0]; tb2 = b.t + P; } else tb2 = b.t;
        var f = tb2 > ta ? (ev.t - ta) / (tb2 - ta) : 0;
        var x = a.pos[0] + (b.pos[0] - a.pos[0]) * f;
        var need = ev.st === 0 ? OWN[h] : -OWN[h];
        if (x * need < G.crossMin) x = need * G.crossMin;
        keys[h].push({ t: ev.t, i: i, pos: [x, G.lowY, G.handZ], own: false });
      });
      keys[h].sort(function (u, v) { return u.t - v.t; });
    }

    // Hectic swaps (the arms change over while staying crossed, e.g. Lr): as the author
    // describes it, the hand making that throw and catch goes round the middle of the other
    // forearm (just under it, then up and over), while the other arm stays put. The spot is
    // set once the other arm's path is known (see the under-arm block below)
    for (var si2 = 0; si2 < E; si2++) {
      var a1 = events[si2], a2 = events[mod(si2 + 1, E)];
      if (!(a1.st && a2.st && a1.st !== a2.st)) continue;
      var mH = a1.hand, sT0 = a1.t, sT1 = sT0 + (mod(a2.t - sT0, P) || P);
      if (G.swapKey) keys[mH].push({ t: mod(sT0 + (sT1 - sT0) * G.swapMidT, P), pos: [-OWN[mH] * G.swapOut, G.lowY, G.handZ + G.swapFwd], own: false, swing: true });
      keys[mH].sort(function (u, v) { return u.t - v.t; });
    }

    // Each hand follows one smooth looping curve through its key positions (a periodic
    // cubic spline in time), so its speed and acceleration change gradually, with no joins.
    // Its height follows scoops, as in the author's own juggling: it catches high while
    // moving down with the ball, carries it down to a low point, drives up and lets go on
    // the way up, then follows through over the top of its loop to the next catch.
    function loopSpline(pts) {
      pts = pts.slice().sort(function (a, b) { return a[0] - b[0]; });
      var tt = [], vv = [];
      pts.forEach(function (q) { if (!tt.length || q[0] - tt[tt.length - 1] > 1e-6) { tt.push(q[0]); vv.push(q[1]); } });
      var n = tt.length;
      if (n < 2) return function () { return vv[0]; };
      var hh = [], i, j, A = [], B = [];
      for (i = 0; i < n; i++) hh[i] = (i < n - 1 ? tt[i + 1] : tt[0] + P) - tt[i];
      for (i = 0; i < n; i++) { A[i] = []; for (j = 0; j < n; j++) A[i][j] = 0; }
      for (i = 0; i < n; i++) {
        var ip = mod(i - 1, n), inx = mod(i + 1, n), h0 = hh[ip], h1 = hh[i];
        A[i][ip] += h0; A[i][i] += 2 * (h0 + h1); A[i][inx] += h1;
        B[i] = 6 * ((vv[inx] - vv[i]) / h1 - (vv[i] - vv[ip]) / h0);
      }
      for (i = 0; i < n; i++) {               // Gaussian elimination (n is small)
        var pv = i;
        for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[pv][i])) pv = j;
        var tr = A[i]; A[i] = A[pv]; A[pv] = tr; var tb0 = B[i]; B[i] = B[pv]; B[pv] = tb0;
        for (j = i + 1; j < n; j++) {
          var f = A[j][i] / A[i][i];
          if (!f) continue;
          for (var c = i; c < n; c++) A[j][c] -= f * A[i][c];
          B[j] -= f * B[i];
        }
      }
      var M = [];
      for (i = n - 1; i >= 0; i--) { var sum = B[i]; for (j = i + 1; j < n; j++) sum -= A[i][j] * M[j]; M[i] = sum / A[i][i]; }
      return function (tb) {
        var t = mod(tb, P), k = n - 1;
        for (var q = 0; q < n; q++) if (tt[q] <= t) k = q;
        var t0 = tt[k], h = hh[k], k1 = mod(k + 1, n);
        if (t < t0) t += P;
        var a = t0 + h - t, b = t - t0;
        return M[k] * a * a * a / (6 * h) + M[k1] * b * b * b / (6 * h) + (vv[k] / h - M[k] * h / 6) * a + (vv[k1] / h - M[k1] * h / 6) * b;
      };
    }
    function makeSplines() {
      // sideways and forward paths first: the crossing (crossW) is worked out from them
      var sx = [0, 1].map(function (h) {
        var xs = [], zs = [];
        keys[h].forEach(function (k) { xs.push([k.t, k.pos[0]]); zs.push([k.t, k.pos[2]]); });
        return [loopSpline(xs), null, loopSpline(zs)];
      });
      splines = sx;
      // Heights follow the hand's role, as in the author's juggling: while the arms cross,
      // the top hand's catches, throws and loop sit higher (roleLift) and the bottom hand's
      // lower (roleDrop), so the scoops themselves keep the top forearm over the other
      return [0, 1].map(function (h) {
        var ys = (swingY[h] || []).slice(), own = [], fill = [];
        events.forEach(function (ev) { if (ev.hand === h) own.push(ev); });
        function role(t) { var w = handRole(h, t); return w > 0 ? w * G.roleLift : w * G.roleDrop; }
        own.forEach(function (ev, i) {
          var nx = own[(i + 1) % own.length], d = mod(nx.t - ev.t, P) || P;
          // a held 2 is no throw and brings no catch: the hand just carries the ball on,
          // smoothly from its last catch to its next throw, with no little throwing scoop
          if ((ev.part === 'throw' && !flies(ev.j)) || (ev.part === 'catch' && incoming[mod(ev.j, P)] === null)) { fill.push(ev.t); return; }
          var y = ev.yKey !== undefined ? ev.yKey : (ev.part === 'throw' ? G.throwY : G.catchY) + role(ev.t);
          if (ev.part === 'catch' && G.shareCatchUp && shareCatch(ev)) y += G.shareCatchUp;   // (caught higher, just before a hectic flos change-over)
          var tm = mod(ev.t + d * (ev.part === 'throw' ? 0.5 : G.lowAt), P);
          ys.push([ev.t, y]);
          ys.push([tm, (ev.part === 'throw' ? G.loopY : G.lowY) + role(tm)]);
        });
        // held moments get a key on the straight line between their neighbours, which keeps
        // the curve anchored without adding any up and down
        ys.sort(function (a, b) { return a[0] - b[0]; });
        var add = fill.map(function (t) {
          var ia = -1, ib = -1;
          for (var q = 0; q < ys.length; q++) { if (ys[q][0] <= t) ia = q; if (ib < 0 && ys[q][0] > t) ib = q; }
          var a = ia < 0 ? ys[ys.length - 1] : ys[ia], ta = ia < 0 ? a[0] - P : a[0];
          var b = ib < 0 ? ys[0] : ys[ib], tb2 = ib < 0 ? b[0] + P : b[0];
          return [t, a[1] + (b[1] - a[1]) * (t - ta) / (tb2 - ta)];
        });
        return [sx[h][0], loopSpline(ys.concat(add)), sx[h][2]];
      });
    }
    var splines = null, underInKeys = false, swingY = [[], []];
    splines = makeSplines();
    function baseHand(h, tb) {
      var S = splines[h];
      return [S[0](tb), S[1](tb), S[2](tb)];
    }
    // nearest crossed state before/after an event, for when both ends are uncrossed
    function crossedNear(i, dir) {
      for (var k = 1; k <= E; k++) { var v = events[mod(i + dir * k, E)].st; if (v) return v; }
      return 0;
    }
    // which arm is over: +1 right, -1 left. Averaged over a short window (crossEase beats
    // either side), so the arms swap over smoothly even when two events come close together
    // Direct swaps while the arms stay crossed (the hectic messes, e.g. Lr): the hand making
    // that throw and catch moves around the other arm, coming up in front of it and over the
    // top, while the other arm stays where it is and only becomes the under arm once the
    // moving one has passed over it
    var swaps = null;
    // a setting for this swap: the hectic flos change-over ('shared') has its own copy of
    // the orbit timings (share + the name), so tuning it never moves the hectic mills
    function swG(sw, name) {
      if (sw.kind === 'shared') { var k = 'share' + name.charAt(0).toUpperCase() + name.slice(1); if (G[k] !== undefined) return G[k]; }
      return G[name];
    }
    function shareCatchK(k) {
      swapAt(0);
      var t = mod(catchTime(k), P);
      return swaps.some(function (sw) { return sw.kind === 'shared' && Math.abs(mod(t - sw.t0 + P / 2, P) - P / 2) < 1e-6; });
    }
    // is this catch the one just before a hectic flos change-over?
    function shareCatch(ev) {
      swapAt(0);
      return swaps.some(function (sw) { return sw.kind === 'shared' && Math.abs(mod(ev.t - sw.t0 + P / 2, P) - P / 2) < 1e-6; });
    }
    // how far into a swap beat tb is (0..1), and which arm was on top, or null
    function swapAt(tb) {
      if (!swaps) {
        swaps = [];
        for (var si = 0; si < E; si++) {
          var e1 = events[si], e2 = events[mod(si + 1, E)];
          var e3 = events[mod(si + 2, E)];
          // the other arm has until its own next event (usually its throw from under) to settle
          if (e1.st && e2.st && e1.st !== e2.st) swaps.push({ t0: e1.t, t1: e1.t + (mod(e2.t - e1.t, P) || P), t2: e1.t + (mod(e2.t - e1.t, P) || P) + (mod(e3.t - e2.t, P) || P), from: e1.st, mover: e1.hand === e2.hand ? e1.hand : e2.hand, kind: e1.hand === e2.hand && e1.part === 'throw' && e2.part === 'catch' ? 'hectic' : 'shared', dir: e2.part === 'throw' ? dirOf(e2.j) : '' });
        }
      }
      for (var q = 0; q < swaps.length; q++) {
        var sw = swaps[q], t = sw.t0 + mod(tb - sw.t0, P);
        if (t <= sw.t2) return { f: Math.min(1, (t - sw.t0) / (sw.t1 - sw.t0)), fu: (t - sw.t0) / (sw.t1 - sw.t0), fe: (sw.t2 - sw.t0) / (sw.t1 - sw.t0), f2: (t - sw.t0) / (sw.t2 - sw.t0), from: sw.from, mover: sw.mover, done: t > sw.t1, t0: sw.t0, t1: sw.t1, kind: sw.kind };
      }
      return null;
    }
    // the role of hand h: +1 on top, -1 underneath, 0 apart
    function handRole(h, tb) {
      var me = h === 0 ? 1 : -1, sw = swapAt(tb);
      if (!sw) return crossW(tb) * me;
      var olap = smoother(-26, -6, splines[0][0](tb) - splines[1][0](tb));
      var r0 = sw.from === me ? 1 : -1;
      // (in a change-over between one hand's catch and the other hand's throw, as in the
      // hectic flos messes, the hand about to throw is the one that goes round)
      if (sw.mover === h) return sw.done ? crossW(tb) * me : olap * (r0 + (-r0 - r0) * smoother(swG(sw, 'swapRise0'), swG(sw, 'swapRise1'), sw.f));   // moves around the other arm
      // (the hand that has just caught, in a hectic flos change-over, rises to the top by the throw)
      // (it only has to be over at the throw, so it may finish rising a little after it:
      // shareB above 1, kept short of the next event so it joins up smoothly)
      if (sw.kind === 'shared') {
        var sB = Math.min(G.shareB, sw.fe), sA = Math.min(G.shareA, sB - 0.05);
        if (sw.done && sw.fu >= sB) return crossW(tb) * me;
        return olap * (r0 - 2 * r0 * smoother(sA, sB, sw.fu));
      }
      return olap * (r0 + (-r0 - r0) * smoother(G.swapStay, 1, sw.f2));                                    // stays, then is the other way round
    }
    // In a hectic flos change-over both arms rise a little to do the trick, so the moving
    // hand has a shorter, quicker path round the other forearm. The lift swells smoothly
    // from shareLiftW beats before the catch to shareLiftW beats after the throw.
    function shareLift(tb) {
      if (!swaps) swapAt(0);
      // (and a pattern with these change-overs is juggled a little higher all through, for room: shareRaise)
      var raise = G.shareRaise && swaps.some(function (sw) { return sw.kind === 'shared'; }) ? G.shareRaise : 0;
      if (!G.shareLift) return raise;
      var best = 0;
      for (var q = 0; q < swaps.length; q++) {
        var sw = swaps[q];
        if (sw.kind !== 'shared') continue;
        var a = sw.t0 - G.shareLiftW, b = sw.t1 + G.shareLiftW, t = a + mod(tb - a, P);
        if (t > b) continue;
        var up = smoother(a, sw.t0, t) * (1 - smoother(sw.t1, b, t));
        best = Math.max(best, up);
      }
      return raise + G.shareLift * best;
    }
    // the other arm gives a little room: its hand eases back towards the body and down while
    // the hectic arm comes past (the hectic arm does the travelling: see the swing key)
    function swapRoom(h, tb) {
      var sw = swapAt(tb);
      if (!sw || sw.mover === h) return 0;
      return Math.sin(Math.PI * smoother(0, 1, sw.f2));
    }
    // How crossed the arms are, and which is on top: +1 right arm over, -1 left arm over,
    // 0 apart. It is the arm on top times how far the hands overlap sideways, averaged over
    // a short window (crossEase beats either side), so the arms cross, swap and part smoothly.
    function crossW(tb) {
      var s = 0, ws = 0;
      for (var k = -4; k <= 4; k++) {
        var tk = tb + k * G.crossEase / 4, wt = 1 + Math.cos(Math.PI * k / 5);
        s += wt * overSignRaw(tk) * smoother(-26, -6, splines[0][0](tk) - splines[1][0](tk));
        ws += wt;
      }
      return s / ws;
    }
    // which arm is on top, from the last crossed event to the next one
    // in between, so it never jumps
    function overSignRaw(tb) {
      var i = eventAt(tb), t = mod(tb, P);
      if (t < evTimes[i] - 1e-6) t += P;   // (eventAt allows a hair of rounding either side of an event)
      var ia = i, ib = i + 1, k = 0;
      while (!events[mod(ia, E)].st && k++ < E) ia--;
      k = 0;
      while (!events[mod(ib, E)].st && k++ < E) ib++;
      var pa = events[mod(ia, E)].st, pb = events[mod(ib, E)].st;
      if (!pa) return 0;
      if (pa === pb) return pa;
      var ta = evTime(ia), tb2 = evTime(ib);
      if (ib === ia + 1) return pa + (pb - pa) * smooth(ta, tb2, t);     // a direct swap
      // hold the crossing until the hands uncross, and swap while they are apart
      var z1 = evTime(ia + 1), z2 = evTime(ib - 1);
      if (z2 - z1 < 0.3) { var zc = (z1 + z2) / 2; z1 = Math.max(ta, zc - 0.15); z2 = Math.min(tb2, zc + 0.15); }
      return pa + (pb - pa) * smooth(z1, z2, t);
    }
    function herm(p0, m0, p1, m1, u) {
      var u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
    }

    // under-the-arm throws and catches: made by a crossed hand whose arm is not on top.
    // A catch is the time reverse of a throw, so both are made in the same place.
    var underThrows = [[], []];
    for (j = 0; j < P; j++) {
      var tt = tok(j).t, tc = tok(j).c.toUpperCase(), hh = handOf(j), mine = hh === 0 ? 'R' : 'L';
      // only the ones made out wide: an outside throw, or a catch of an inside throw.
      // After an outside under-arm throw, a hand still under the arm catches about where
      // it threw from (as in the mills mess)
      // (pulled only partway there, so the ball it catches still arcs across)
      var wideThrow = tt !== 'U' && tt !== mine && flies(j) && dirOf(j) === 'o';
      if (wideThrow) underThrows[hh].push({ t: j, w: 1 });
      if (tc !== 'U' && tc !== mine && incoming[j] !== null) {
        if (dirOf(incoming[j]) === 'i') underThrows[hh].push({ t: catchTime(j), w: 1 });
        else if (wideThrow && tc === tt) underThrows[hh].push({ t: catchTime(j), w: G.underCatch });
      }
    }
    // how strongly hand h is reaching under the other arm's elbow at beat tb (1 at the throw or catch)
    function underPull(h, tb) {
      var best = 0, list = underThrows[h];
      for (var i = 0; i < list.length; i++) {
        var d = Math.abs(mod(tb - list[i].t + P / 2, P) - P / 2);
        var u = (1 - smoother(0, G.underWin, d)) * list[i].w;
        best = 1 - (1 - best) * (1 - u);      // overlapping reaches blend smoothly
      }
      return best;
    }

    var elbowBias = [0, 0], orbitRef = {}, orbitOff = false;       // extra forward lean for an elbow (the hectic arm's, during its orbit)
    function arm(h, P0, top, bot) {
      var own = OWN[h];
      var across = smooth(-6, 12, P0[0] * -own);
      var S = [own * (G.shoulderX - 2 * across), G.shoulderY, G.shoulderZ + 5 * across];
      // elbows hang low by the body, so forearms angle up to the hands. When the
      // arms cross, the top arm's elbow aims for a spot by the ribs, and the bottom
      // arm's elbow sits further out and back
      var pole = [own * G.elbowOut, -1, G.elbowFwd];
      var k = Math.max(across, G.elbowEarly);
      var aim = function (spot, wgt) {
        if (wgt <= 0) return;
        var d = [own * spot[0] - S[0], spot[1] - S[1], spot[2] - S[2]], l = Math.hypot(d[0], d[1], d[2]);
        var pl = Math.hypot(pole[0], pole[1], pole[2]);
        for (var c = 0; c < 3; c++) pole[c] = pole[c] / pl * (1 - wgt) + d[c] / l * wgt;
      };
      aim(G.topElbow, top * k);
      aim(G.botElbow, bot * across);
      if (elbowBias[h]) { var pn = Math.hypot(pole[0], pole[1], pole[2]); pole = [pole[0] / pn, pole[1] / pn, pole[2] / pn + elbowBias[h]]; }
      var El = ik(S, P0, G.upper, G.fore, pole);
      El.shoulder = S;
      return El;
    }

    // The throwing movement: each throw is one smooth swing laid over the hand's path. The
    // hand draws back and down, drives through so that it is moving at the ball's own speed
    // as it lets go, then follows through and settles. On a catch the hand meets the ball
    // moving partly with it and gives a little along its path. (throwMatch below 1 lets the
    // ball leave a little faster than the hand, which keeps the swings compact.) Each swing is
    // tau * cos^2(pi tau / 2T): zero at the moment of the throw or catch, with exactly the
    // speed needed there, and fading smoothly to nothing T beats either side, so the hand
    // never jolts.
    var strokes = null;
    function baseAt(h, t) { if (G.flowBlur > 0 && !G.blurSwings) { if (!flow) bakeFlow(); return flowHand(h, t); } return pose(t, true).hands[h]; }
    function handVel(h, t) {       // cm a beat, along the path without swings
      var d = 0.01, a = baseAt(h, t - d), b = baseAt(h, t + d);
      return [(b[0] - a[0]) / (2 * d), (b[1] - a[1]) / (2 * d), (b[2] - a[2]) / (2 * d)];
    }
    function capSpeed(v) {
      var l = Math.hypot(v[0], v[1], v[2]), k = l > G.maxStroke ? G.maxStroke / l : 1;
      return v.map(function (x) { return x * k; });
    }
    function buildStrokes() {
      strokes = [[], []];
      for (var j = 0; j < P; j++) {
        if (!flies(j)) continue;
        var h = handOf(j), k = j + nOf(j) - 2, hk = handOf(k), tc = catchTime(k), F = (tc - j) / BPS;
        var a = baseAt(h, j), b = baseAt(hk, tc);
        var gg = gFor(F, j);
        var v = [(b[0] - a[0]) / F, (b[1] - a[1]) / F + gg * F / 2, (b[2] - a[2]) / F];   // cm/s at release
        var vl = [v[0], v[1] - gg * F, v[2]];                                              // cm/s at the catch
        var under = underThrows[h].some(function (u) { return u.t === j; }) ? G.underStroke : 1;
        // a 1 is flicked across from the wrist: the hand barely moves from its spot (oneStroke)
        if (nOf(j) === 1) under *= G.oneStroke;
        var hv = handVel(h, j), hc = handVel(hk, tc);
        strokes[h].push({ t: j, catch: false, v: capSpeed([0, 1, 2].map(function (c) { return (v[c] / BPS - hv[c]) * under * G.throwMatch; })) });
        strokes[hk].push({ t: tc, catch: true, v: capSpeed([0, 1, 2].map(function (c) { return (vl[c] / BPS - hc[c]) * G.catchGive; })) });
      }
    }
    function swing(tau, before, after) {
      var T = tau < 0 ? before : after;
      if (Math.abs(tau) >= T) return 0;
      var c = Math.cos(Math.PI * tau / (2 * T));
      return tau * c * c;
    }
    function strokeAt(h, tb) {
      if (!strokes) buildStrokes();
      var o = [0, 0, 0], list = strokes[h];
      for (var i = 0; i < list.length; i++) {
        var st = list[i], tau = mod(tb - st.t + P / 2, P) - P / 2;
        var f = st.catch ? swing(tau, G.catchBefore, G.catchAfter) : swing(tau, G.throwBefore, G.throwAfter);
        if (f) for (var c = 0; c < 3; c++) o[c] += f * st.v[c];
      }
      return o;
    }

    // how far (cm) a hand or forearm sinks into the body as drawn (torso and hips)
    var BODY = [[0, 113, 0, 17, 30, 12], [0, 89, 0, 15.5, 11, 10.5]];
    function sinkInto(q, rad) {
      var worst = 0;
      for (var i = 0; i < BODY.length; i++) {
        var e = BODY[i];
        var dx = (q[0] - e[0]) / (e[3] + rad), dy = (q[1] - e[1]) / (e[4] + rad), dz = (q[2] - e[2]) / (e[5] + rad);
        var k = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (k < 1) worst = Math.max(worst, (1 - k) * Math.min(e[3], e[5]));
      }
      return worst;
    }
    function armInBody(El, extra) {
      extra = extra || 0;
      var d = sinkInto(El.hand, G.handR + extra);
      for (var q = 0; q <= 4; q++) {
        var f = q / 4, pt = [El.elbow[0] + (El.hand[0] - El.elbow[0]) * f, El.elbow[1] + (El.hand[1] - El.elbow[1]) * f, El.elbow[2] + (El.hand[2] - El.elbow[2]) * f];
        d = Math.max(d, sinkInto(pt, G.foreR + extra));
      }
      return d;
    }

    function pose(tb, plain) {
      var R = baseHand(0, tb), L = baseHand(1, tb);
      var w = crossW(tb);                      // >0: right arm on top
      var hands = [R, L], out = { w: w, hands: [], elbows: [], shoulders: [], reach: 0 };
      // the top arm first, so the bottom hand can reach under its elbow
      var roles = [handRole(0, tb), handRole(1, tb)];
      var order = roles[0] >= roles[1] ? [0, 1] : [1, 0];
      // In a hectic swap (between the L and the r of Lr), the hectic hand orbits the middle
      // of the other forearm: from below it, round the front, to above it (or the reverse),
      // close in. The other arm is placed first and stays put.
      var swo = underInKeys && !orbitOff ? swapAt(tb) : null, orbitArm = null;
      if (swo && swo.done) swo = null;
      if (swo) { order = [1 - swo.mover, swo.mover]; }
      var topEl = null;
      order.forEach(function (h) {
        var top = Math.max(0, roles[h]), bot = Math.max(0, -roles[h]);
        var P0 = hands[h].slice();
        var room = swapRoom(h, tb);
        P0[2] -= room * G.roomBack; P0[1] -= room * G.roomDown;
        // when the arms cross, the top hand stays above a floor and the bottom hand below a
        // ceiling (just above its elbow), so the top forearm passes well over the other. Both
        // limits are soft, so the hands ease along them instead of hitting an edge.
        P0[1] += top * (softMax(P0[1], G.topFloor, G.bandSoft) - P0[1]) + bot * (softMin(P0[1], G.botCap, G.bandSoft) - P0[1]);
        P0[1] += top * G.topLift - bot * G.botDrop;
        P0[2] += top * G.topZ + bot * G.botZ;
        P0[1] += shareLift(tb);
        if (bot > 0 && topEl) {
          var e = topEl.elbow;
          // an under-the-arm throw is made just below and slightly in front of the top arm's elbow
          var u = underInKeys ? 0 : underPull(h, tb) * bot;
          if (u > 0) {
            var tgt = [e[0] + OWN[1 - h] * G.underOut, e[1] - G.underDrop, e[2] + G.underFwd];
            for (var c = 0; c < 3; c++) P0[c] += (tgt[c] - P0[c]) * u;
          }
          // near the top arm's elbow, the bottom hand passes in front of it, never behind
          // (worked out over the whole cycle first, then eased in and out: see nearAt)
          if (!nearCorr) {
            var near = (1 - smooth(G.nearIn, G.nearOut, Math.hypot(P0[0] - e[0], P0[1] - e[1]))) * bot;
            var front = e[2] + G.underFwd;
            if (near > 0) { nearRaw[h] = (softMax(P0[2], front, 3) - P0[2]) * near; P0[2] += nearRaw[h]; }
          }
        }
        if (nearCorr) P0[2] += nearAt(h, tb);
        if (!plain) { var so = strokeAt(h, tb); for (var c2 = 0; c2 < 3; c2++) P0[c2] += so[c2]; }
        if (swo && !swo.done && h === swo.mover && orbitArm) {
          // (round the middle of the other forearm; the hectic flos one may sit nearer its elbow, where the under-arm throw is made: shareOrbitAlong, 0 = elbow, 0.5 = middle)
          var al = swo.kind === 'shared' ? G.shareOrbitAlong : 0.5;
          var mid = [0, 1, 2].map(function (c) { return orbitArm.elbow[c] + (orbitArm.hand[c] - orbitArm.elbow[c]) * al; });
          // circle where the other forearm is as the orbit starts, so its later settling
          // doesn't drag the hectic hand about (orbitHold 1 = fully held)
          var ref = orbitRef[mod(swo.t0, P).toFixed(3)];
          if (G.orbitHold > 0 && ref) mid = mid.map(function (v, c) { return v + (ref[c] - v) * G.orbitHold; });
          var rising = swo.from !== (h === 0 ? 1 : -1);
          var th = Math.PI * (smoother(swG(swo, 'orbit0'), swG(swo, 'orbit1'), swo.f) - 0.5) * (rising ? 1 : -1);   // -90 below .. +90 above
          var oR = swo.kind === 'shared' ? G.shareOrbitR : G.orbitR, oRy = swo.kind === 'shared' ? G.shareOrbitRY : G.orbitR;   // (the flos one is flatter: wide behind, not so deep below)
          // (late in the circle, once it is over the other forearm, it drifts sideways on
          // towards its catch, so it never stops at the top and then dashes)
          var xa = swG(swo, 'orbitXa'), xs = xa < 1 ? smoother(xa, 1, swo.f) : 0;
          var tgo = [mid[0] + (P0[0] - mid[0]) * xs, mid[1] + oRy * Math.sin(th), mid[2] + (rising ? G.orbitSide : G.orbitSideDown) * oR * Math.cos(th)];   // orbitSide -1: round the back, towards the navel
          var bw = smoother(0, swG(swo, 'orbitIn'), swo.f) * (1 - smoother(swG(swo, 'orbitOut'), 1, swo.f));
          for (var c3 = 0; c3 < 3; c3++) P0[c3] += (tgo[c3] - P0[c3]) * bw;
          elbowBias[h] = G.orbitElbow * bw * Math.max(0, Math.cos(th));   // the elbow comes forward too, so the whole forearm passes in front
        } else elbowBias[h] = 0;
        var El = arm(h, P0, top, bot);
        // the body pushes the arm out: if the hand or forearm comes near the torso or hips,
        // ease the hand forward so it clears, and work the arm out again. The push starts
        // gently a few cm before contact, so the hand never jolts.
        for (var pass = 0; pass < 3; pass++) {
          var dep = armInBody(El, G.bodyEase);
          if (dep <= 0) break;
          P0[2] += dep < G.bodyEase ? dep * dep / (2 * G.bodyEase) : dep - G.bodyEase / 2;
          El = arm(h, P0, top, bot);
        }
        if (top > 0) topEl = El;
        if (swo && !swo.done && h !== swo.mover) orbitArm = El;
        out.hands[h] = El.hand; out.elbows[h] = El.elbow; out.shoulders[h] = El.shoulder; out.reach = Math.max(out.reach, El.reach);
        out.targets = out.targets || []; out.targets[h] = { P0: P0, top: top, bot: bot };
      });
      // In a hectic swap the hectic arm goes round the other one: wherever its forearm
      // would come too close, its hand is moved forward (and up as it comes over, or down
      // as it goes under) until the forearms clear. The blending pass smooths this out.
      resolveSwap(out, roles, tb);
      return out;
    }
    function resolveSwap(out, roles, tb) {
        var sw = swapAt(tb);
        // (not while the throw spots are being worked out, and easing in after the throw has
        // left the hand, so the hand makes its throw from the right place)
        if (sw && !sw.done && underInKeys && sw.f > 0) {
          var ease = smoother(0, swG(sw, 'swapEaseIn'), sw.f) * (1 - smoother(swG(sw, 'swapEaseOut'), 1, sw.f));   // eases in after the throw and out before the catch
          var mh = sw.mover, oh = 1 - mh, tg = out.targets[mh], to = out.targets[oh], need = 2 * G.foreR + G.swapClear;
          // rising (under to over, as the author describes Lr in the hectic mess): first down
        // and back towards the navel, then up and forward over the other arm. Going the other
        // way (over to under, as in the TR hectic mess) is the time reverse: down in front of
        // the other arm first, then back towards the navel
        var rising = sw.from !== (mh === 0 ? 1 : -1);
        var upDown = rising ? (roles[mh] >= 0 ? 1 : -1) : -1, fwd = roles[mh] >= 0, Q = tg.P0.slice(), Qo = to.P0.slice(), Em, Eo;
          for (var it = 0; it < 8; it++) {
            var d = segGap(out.elbows[mh], out.hands[mh], out.elbows[oh], out.hands[oh]);
            if (d >= need) break;
            var k = (need - d) * ease, share = Em && Em.reach > 0.95 ? 0.3 : 1 - (sw.kind === 'shared' ? G.sharePushOther : G.swapPushOther);   // the hectic arm moves most, unless it is at full stretch
            // (going over to under round the back, in a hectic flos change-over, the moving hand
            // keeps towards the body and the other hand eases forward out of its way)
            var backDown = !rising && G.orbitSideDown < 0, oz = backDown ? G.sharePushFwd : -G.swapPushFwd;
            Q[2] += k * share * (fwd && !backDown ? G.swapPushFwd : -G.swapPushBack); Q[1] += upDown * k * share * G.swapPushUp;
            Qo[2] += k * (1 - share) * oz; Qo[1] -= upDown * k * (1 - share) * G.swapPushUp;
            Em = arm(mh, Q, tg.top, tg.bot); Eo = arm(oh, Qo, to.top, to.bot);
            out.hands[mh] = Em.hand; out.elbows[mh] = Em.elbow; out.hands[oh] = Eo.hand; out.elbows[oh] = Eo.elbow;
            out.reach = Math.max(out.reach, Em.reach, Eo.reach);
          }
        }
    }
    // closest distance between two segments (forearms)
    function segGap(p1, q1, p2, q2) {
      var d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
      function dt(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
      var a = dt(d1, d1), e = dt(d2, d2), f = dt(d2, r), c = dt(d1, r), b = dt(d1, d2), den = a * e - b * b, sP, tP;
      sP = den > 1e-9 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
      tP = (b * sP + f) / e;
      if (tP < 0) { tP = 0; sP = Math.max(0, Math.min(1, -c / a)); } else if (tP > 1) { tP = 1; sP = Math.max(0, Math.min(1, (b - c) / a)); }
      var x = [p1[0] + d1[0] * sP - p2[0] - d2[0] * tP, p1[1] + d1[1] * sP - p2[1] - d2[1] * tP, p1[2] + d1[2] * sP - p2[2] - d2[2] * tP];
      return Math.sqrt(dt(x, x));
    }

    // The push that keeps the bottom hand in front of the top elbow, worked out for the
    // whole cycle, then held a little longer and eased in and out, so the hand glides
    // forward past the elbow instead of being shoved
    var nearRaw = [0, 0], nearCorr = null, NR = 40;
    function bakeNear() {
      var n = Math.round(P * NR), raw = [[], []], i, j;
      for (i = 0; i < n; i++) { nearRaw = [0, 0]; pose(i / NR, true); raw[0][i] = nearRaw[0]; raw[1][i] = nearRaw[1]; }
      var hold = Math.round(G.nearHold * NR), blur = Math.max(1, Math.round(G.nearBlur * NR));
      nearCorr = raw.map(function (r) {
        var d = [], o = [];
        for (i = 0; i < n; i++) { var m = 0; for (j = -hold; j <= hold; j++) m = Math.max(m, r[mod(i + j, n)]); d[i] = m; }
        for (i = 0; i < n; i++) {
          var sum = 0, ws = 0;
          for (j = -blur; j <= blur; j++) { var wt = 1 + Math.cos(Math.PI * j / (blur + 1)); sum += wt * d[mod(i + j, n)]; ws += wt; }
          o[i] = sum / ws;
        }
        return o;
      });
    }
    function nearAt(h, tb) {      // smooth (Catmull-Rom) reading of the baked push
      var c = nearCorr[h], n = c.length, x = mod(tb, P) * NR, i = Math.floor(x), u = x - i;
      var p0 = c[mod(i - 1, n)], p1 = c[mod(i, n)], p2 = c[mod(i + 1, n)], p3 = c[mod(i + 2, n)];
      return herm(p1, (p2 - p0) / 2, p2, (p3 - p1) / 2, u);
    }

    // Under-the-arm throws and catches: each one's key position is set to the spot just
    // below and in front of where the top arm's elbow will be, and the hand's smooth path
    // is rebuilt through it. (Chasing the elbow as it moved made the under hand jolt.)
    (function () {
      var changes = [];
      [0, 1].forEach(function (h) {
        underThrows[h].forEach(function (u) {
          var t = mod(u.t, P), ps = pose(t, true), bot = Math.max(0, h === 0 ? -ps.w : ps.w);
          if (bot < 0.05) return;
          var e = ps.elbows[1 - h];
          var tgt = [e[0] + OWN[1 - h] * G.underOut, e[1] - G.underDrop + bot * G.botDrop, e[2] + G.underFwd - bot * G.botZ];   // (the ceiling is soft, so a spot below it stays put)
          keys[h].forEach(function (q) {
            if (q.own && Math.abs(mod(q.t - t + P / 2, P) - P / 2) < 1e-6) changes.push({ k: q, ev: events[q.i], tgt: tgt, w: u.w * bot });
          });
        });
      });
      changes.forEach(function (c) {
        var y0 = c.ev.part === 'throw' ? G.throwY : G.catchY;
        c.k.pos = [c.k.pos[0] + (c.tgt[0] - c.k.pos[0]) * c.w, c.k.pos[1], c.k.pos[2] + (c.tgt[2] - c.k.pos[2]) * c.w];
        c.ev.yKey = y0 + (c.tgt[1] - y0) * c.w;
      });
      // hectic swings: round the middle of the other forearm, just under it
      [0, 1].forEach(function (h) {
        keys[h].forEach(function (q) {
          if (!q.swing) return;
          var ps = pose(q.t, true), o = 1 - h;
          var mid = [0, 1, 2].map(function (c) { return (ps.elbows[o][c] + ps.hands[o][c]) / 2; });
          q.pos = [mid[0] - OWN[h] * G.swapOut, q.pos[1], mid[2] + G.swapFwd];
          swingY[h].push([q.t, mid[1] - G.swapUnder]);
        });
      });
      splines = makeSplines();
      underInKeys = true;
      // where the other forearm's middle is as each hectic orbit starts (worked out with the
      // orbits off, so they don't feed back into themselves)
      if (swapAt(0) !== undefined) {
        orbitOff = true;
        swaps.forEach(function (sw) {
          var pr = pose(sw.t0 + swG(sw, 'orbitIn') * (sw.t1 - sw.t0), true), o = 1 - sw.mover;
          var al2 = sw.kind === 'shared' ? G.shareOrbitAlong : 0.5;
          orbitRef[mod(sw.t0, P).toFixed(3)] = [0, 1, 2].map(function (c) { return pr.elbows[o][c] + (pr.hands[o][c] - pr.elbows[o][c]) * al2; });
        });
        orbitOff = false;
      }
      bakeNear();
    })();

    // ball paths
    var maxN = 0;
    for (j = 0; j < P; j++) maxN = Math.max(maxN, n[j]);
    // colours: follow each ball from throw to throw
    var col = {}, nextCol = 0, J = P * 64 + maxN * 4;
    var lands = {};
    for (j = 0; j < J; j++) {
      if (col[j] === undefined) col[j] = nextCol++;
      col[j + nOf(j)] = col[j];
    }
    var L = 1;
    var base = Math.ceil((maxN * 2) / P) * P;
    for (L = 1; L <= 60; L++) {
      var okL = true;
      for (j = base; j < base + P; j++) if (col[j] !== col[j + L * P]) { okL = false; break; }
      if (okL) break;
    }
    // relabel colours seen in the steady window 0..balls-1
    var remap = {}, nr = 0;
    for (j = base; j < base + L * P + maxN; j++) if (remap[col[j]] === undefined) remap[col[j]] = nr++;
    var loop = L * P;                     // beats until the balls are back where they started
    var colAt = function (j) { return remap[col[base + mod(j, loop)]]; };

    var bps = BPS, g = G.g;
    function ballOn(hp) { return [hp[0], hp[1] + G.handR * 0.55 + G.ballR * 0.6, hp[2]]; }
    function ballsAt(tb, poseNow) {
      var res = [];
      var j0 = Math.floor(tb) - maxN - 1;
      for (var j = j0; j <= Math.floor(tb); j++) {
        var nj = nOf(j);
        if (!nj || tb < j || tb >= j + nj) continue;
        var hand = handOf(j), pos;
        if (flies(j)) {
          var k = j + nj - 2, tc = catchTime(k);
          if (tb < tc) {
            var a = ballOn(flowPose(j).hands[hand]), bpt = ballOn(flowPose(tc).hands[handOf(k)]);
            var F = (tc - j) / bps, tau = (tb - j) / bps, gg = gFor(F, j);
            var vy = (bpt[1] - a[1]) / F + gg * F / 2;
            pos = [a[0] + (bpt[0] - a[0]) * tau / F, a[1] + vy * tau - gg * tau * tau / 2, a[2] + (bpt[2] - a[2]) * tau / F];
            res.push({ pos: pos, col: colAt(j), fly: true, from: hand, to: handOf(k), t0: j, t1: tc });
            continue;
          } else pos = ballOn(poseNow.hands[handOf(k)]);
        } else pos = ballOn(poseNow.hands[hand]);
        res.push({ pos: pos, col: colAt(j) });
      }
      return res;
    }

    // A last smoothing pass for flow: every hand position over the cycle (without the
    // throw and catch swings) is worked out, then blended with its neighbours in time (a
    // Gaussian flowBlur beats wide). The swings, already smooth, go on top afterwards, so
    // the hand still moves at the ball's speed as it lets go; then the arms are placed.
    var flow = null, FR = 40;
    function bakeFlow() {
      var n = Math.round(P * FR), raw = [[], []], i, j, c;
      for (i = 0; i < n; i++) { var ps = pose(i / FR, !G.blurSwings); raw[0][i] = ps.hands[0]; raw[1][i] = ps.hands[1]; }
      var sig = Math.max(1e-6, G.flowBlur * FR), R = Math.ceil(sig * 3), wts = [], ws = 0;
      for (j = -R; j <= R; j++) { wts.push(Math.exp(-0.5 * j * j / (sig * sig))); ws += wts[wts.length - 1]; }
      flow = raw.map(function (arr) {
        var o = [];
        for (i = 0; i < n; i++) {
          var v = [0, 0, 0];
          for (j = -R; j <= R; j++) { var q = arr[mod(i + j, n)], wt = wts[j + R] / ws; for (c = 0; c < 3; c++) v[c] += q[c] * wt; }
          o[i] = v;
        }
        return o;
      });
    }
    function flowHand(h, tb) {
      var a = flow[h], n = a.length, x = mod(tb, P) * FR, i = Math.floor(x), u = x - i, out = [0, 0, 0];
      var p0 = a[mod(i - 1, n)], p1 = a[mod(i, n)], p2 = a[mod(i + 1, n)], p3 = a[mod(i + 2, n)];
      for (var c = 0; c < 3; c++) out[c] = herm(p1[c], (p2[c] - p0[c]) / 2, p2[c], (p3[c] - p1[c]) / 2, u);
      return out;
    }
    function flowPose(tb) {
      if (!(G.flowBlur > 0)) return pose(tb);
      if (!flow) bakeFlow();
      var roles = [handRole(0, tb), handRole(1, tb)], out = { w: crossW(tb), hands: [], elbows: [], shoulders: [], reach: 0 };
      for (var h = 0; h < 2; h++) {
        var P0 = flowHand(h, tb), so = G.blurSwings ? [0, 0, 0] : strokeAt(h, tb), top = Math.max(0, roles[h]), bot = Math.max(0, -roles[h]);
        for (var c = 0; c < 3; c++) P0[c] += so[c];
        var El = arm(h, P0, top, bot);
        for (var pass = 0; pass < 3; pass++) {       // the body pushes the arm out, as in pose
          var dep = armInBody(El, G.bodyEase);
          if (dep <= 0) break;
          P0[2] += dep < G.bodyEase ? dep * dep / (2 * G.bodyEase) : dep - G.bodyEase / 2;
          El = arm(h, P0, top, bot);
        }
        out.hands[h] = El.hand; out.elbows[h] = El.elbow; out.shoulders[h] = El.shoulder; out.reach = Math.max(out.reach, El.reach);
      }
      return out;
    }

    function at(tb) {
      var ps = flowPose(tb);
      ps.balls = ballsAt(tb, ps);
      var ei = eventAt(tb), ev = events[ei];
      var whole = Math.floor(tb / P) * P + (ev.t > mod(tb, P) + 1e-9 ? -P : 0);
      ps.event = { index: ei, token: mod(ev.j, N), part: ev.part, hand: ev.hand, throwIndex: whole + ev.j };
      ps.state = ev.st;
      return ps;
    }

    // checks against the article's rules, used by the tests and the page
    var notes = [];
    for (j = 0; j < N; j++) {
      var nxt = p.tokens[(j + 1) % N];
      if (p.tokens[j].c.toUpperCase() !== nxt.t) notes.push('catch ' + (j + 1) + ' (' + p.tokens[j].c + ') differs from the next throw (' + nxt.t + ')');
    }
    for (j = 0; j < N; j++) {
      var dg = p.digits[j % D];
      if (p.tokens[j].hold && dg !== 2) notes.push('throw ' + (j + 1) + ' has a hold dot but the siteswap has a ' + dg + ' there');
    }
    var slashSeen = null;
    for (j = 0; j < P && slashSeen === null; j++) {
      if (handOf(j) !== 0) continue;
      var t0 = tok(j);
      if (!flies(j)) { slashSeen = sideFor(0, t0.t) < 0 ? '/' : '\\'; break; }
      var k = j + nOf(j) - 2, tc = catchTime(k);
      var a0 = pose(j).hands[0], b0 = pose(tc).hands[handOf(k)];
      var F = (tc - j) / bps, gs = gFor(F, j), vy = (b0[1] - a0[1]) / F + gs * F / 2, tp = Math.min(F, vy / gs);
      var xp = a0[0] + (b0[0] - a0[0]) * tp / F;
      slashSeen = xp < 0 ? '/' : '\\';
      break;
    }

    var model = {
      ok: true, parsed: p, balls: balls, period: P, loop: loop, events: E, eventTimes: evTimes.slice(), at: at, pose: pose,
      tokens: p.tokens, slashSeen: slashSeen, notes: notes, maxN: maxN, bps: BPS, catchTime: catchTime, digit: nOf, baseHand: baseHand
    };

    // A hectic pattern whose swap goes over to under (the TR hectic messes) is shown as its
    // time reverse played backwards, as the author describes it: the same movement as the
    // hectic mess with time flowing the other way. Played backwards each throw is a catch and
    // each catch a throw, and beat tb here is beat (catchLag - tb) there.
    if (!opts.noReverse) {
      swapAt(0);
      var descending = swaps.some(function (sw) { return sw.kind === 'hectic' ? sw.from === (sw.mover === 0 ? 1 : -1) : sw.dir === 'i'; });
      if (descending) {
        var rv = timeReverse(p.src), srcM = rv.ok ? build(rv.src, { noReverse: true }) : null;
        if (srcM && srcM.ok && srcM.period === P) {
          var C = G.catchLag + 64 * srcM.loop;
          model.reversedFrom = rv.src;
          model.at = function (tb) {
            var own = at(tb), ps = srcM.at(C - tb);
            own.hands = ps.hands; own.elbows = ps.elbows; own.shoulders = ps.shoulders; own.w = ps.w; own.reach = ps.reach;
            own.balls = ps.balls.map(function (b) {
              if (!b.fly) return b;
              return { pos: b.pos, col: b.col, fly: true, from: b.to, to: b.from, t0: C - b.t1, t1: C - b.t0 };
            });
            return own;
          };
        }
      }
    }
    return model;
  }

  // two-bone arm: shoulder S, hand target T, bone lengths a and b, elbow pointing towards pole
  function ik(S, T, a, b, pole) {
    var d = [T[0] - S[0], T[1] - S[1], T[2] - S[2]];
    var len = Math.hypot(d[0], d[1], d[2]), reach = len / (a + b);
    var maxL = (a + b) * 0.995, minL = Math.abs(a - b) + 1;
    var L = Math.max(minL, Math.min(maxL, len));
    var u = [d[0] / len, d[1] / len, d[2] / len];
    var hand = [S[0] + u[0] * L, S[1] + u[1] * L, S[2] + u[2] * L];
    var dp = pole[0] * u[0] + pole[1] * u[1] + pole[2] * u[2];
    var w = [pole[0] - dp * u[0], pole[1] - dp * u[1], pole[2] - dp * u[2]];
    var wl = Math.hypot(w[0], w[1], w[2]) || 1;
    w = [w[0] / wl, w[1] / wl, w[2] / wl];
    var ca = (a * a + L * L - b * b) / (2 * a * L), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    var elbow = [S[0] + a * (ca * u[0] + sa * w[0]), S[1] + a * (ca * u[1] + sa * w[1]), S[2] + a * (ca * u[2] + sa * w[2])];
    return { hand: hand, elbow: elbow, reach: reach };
  }

  // The patterns, as written in the article (typos settled with the author on 2026-11-20).
  var PATTERNS = [
    { group: 'Cascades', name: 'Cascade', src: 'i\\ Uu : Uu' },
    { group: 'Cascades', name: 'Reverse cascade', src: 'o/ Uu : Uu' },
    { group: 'Cascades', name: 'Crossed-arm cascade', src: 'o\\ Rr : Rr' },
    { group: 'Cascades', name: 'Windmill', src: 'o\\ Lu Ul' },
    { group: 'Mills messes', name: 'Mills mess', src: 'o\\ Ru Ul Ll : Lu Ur Rr' },
    { group: 'Mills messes', name: 'Flipped mess', src: 'o\\ Lu Ur Rr : Ru Ul Ll' },
    { group: 'Mills messes', name: 'TR mills mess', src: '3 i/ Ur Rr Ru : Ul Ll Lu' },
    { group: 'Mills messes', name: 'TR flipped mess', src: '3 i/ Ul Ll Lu : Ur Rr Ru' },
    { group: 'Mills messes', name: 'Hectic mills', src: 'o\\ Lu Ul Lr : Ru Ur Rl' },
    { group: 'Mills messes', name: 'TR hectic mills', src: '3 i/ Ul Lr Ru : Ur Rl Lu' },
    { group: 'Mills messes', name: 'Hectic flipped mess', src: 'o\\ Ru Ur Rl : Lu Ul Lr' },
    { group: 'Mills messes', name: 'TR hectic flipped mess', src: '3 i/ Ur Rl Lu : Ul Lr Ru' },
    { group: 'Flos messes', name: 'Hectic flos mess', src: 'o/ Ul Ru Uu : Ur Lu Uu' },
    { group: 'Flos messes', name: 'Hectic flipped flos mess', src: 'o/ Ur Lu Uu : Ul Ru Uu' },
    { group: 'Flos messes', name: 'TR hectic flos mess', src: '3 i\\ Lu Uu Ul : Ru Uu Ur' },
    { group: 'Flos messes', name: 'TR hectic flipped flos mess', src: '3 i\\ Ru Uu Ur : Lu Uu Ul' },
    { group: 'Flos messes', name: 'Flos mess', src: 'o/ Ur Ru Uu : Ul Lu Uu' },
    { group: 'Flos messes', name: 'Flipped flos mess', src: 'o/ Ul Lu Uu : Ur Ru Uu' },
    { group: 'Flos messes', name: 'TR flos mess', src: '3 i\\ Ru Uu Ul : Lu Uu Ur' },
    { group: 'Flos messes', name: 'TR flipped flos mess', src: '3 i\\ Lu Uu Ur : Ru Uu Ul' },
    { group: 'Extras (first try)', name: 'Half mess', src: 'o\\ Ru Uu : Ur Rr' },
    { group: 'Extras (first try)', name: 'Alternating half mess', src: 'o\\ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Extras (first try)', name: 'Mills mess with windmill', src: 'o\\ Ru Ul Lu Ul Ll : Lu Ur Ru Ur Rr' },
    { group: 'Extras (first try)', name: '4 ball mills mess', src: '4 o\\ Ru Ul Ll : Lu Ur Rr' },
    { group: 'Extras (first try)', name: '423 mills mess', src: '423 o\\ Ru Ul. Ll : Lu Ur. Rr' },
    { group: 'Extras (first try)', name: '234 flos mess', src: '234 o/ Ur. Ru Uu : Ul. Lu Uu' },
    // main article, siteswap 1s (U(u) is a 1, caught straight away by the other hand)
    { group: 'Showers (siteswap 1s)', name: '414 mills mess', src: '414 o\\ R U(u)l Ll : L U(u)r Rr' },
    { group: 'Showers (siteswap 1s)', name: 'Mills mess with shower', src: '44133 o\\ Ru U U(u)u Ul Ll : Lu U U(u)u Ur Rr' },
    // Appendix B: building ingenious messes from hulking windmills
    { group: 'Appendix B: windmills', name: 'Under throw windmill', src: 'O\\ Lu Ul' },
    { group: 'Appendix B: windmills', name: 'Under catch windmill', src: 'O\\ Ru Ur' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill', src: 'O\\ Ru Ul Lu Ur' },
    { group: 'Appendix B: windmills', name: 'Flip flop flos mess', src: 'o/ Ul Lu Ur Ru Uu : Ur Ru Ul Lu Uu' },
    { group: 'Appendix B: windmills', name: 'Under throw 4233 windmill', src: '4233 O\\ Lu Ul. Lu Ul' },
    { group: 'Appendix B: windmills', name: '34233 flos mess', src: '34233 o/ Ur Ru Ur. Ru Uu : Ul Lu Ul. Lu Uu' },
    { group: 'Appendix B: windmills', name: 'Under throw 342T3 windmill', src: '342T3 O\\ Lu Ul Lu Ul' },
    { group: 'Appendix B: windmills', name: '342T33 mills mess', src: '342T33 o\\ Ru Ul Lu Ul Ll : Lu Ur Ru Ur Rr' },
    { group: 'Appendix B: windmills', name: '5223 alternating windmill', src: '5223 O/ Ur Ru. Ul. Lu' },
    { group: 'Appendix B: windmills', name: "Mike's mess", src: '225 o\\ Ru. Ul. Ll : Lu. Ur. Rr' },
    { group: 'Appendix B: windmills', name: 'Under throw windmill with shower', src: '4413 O/ Ul L U(u)l Lu' },
    { group: 'Appendix B: windmills', name: 'Under catch windmill with shower', src: '4413 O/ Ur R U(u)r Ru' },
    { group: 'Appendix B: windmills', name: '44133 flos mess', src: '44133 o/ Ur R U(u)r Ru Uu : Ul L U(u)l Lu Uu' },
    { group: 'Appendix B: windmills', name: '44133 flipped flos mess', src: '44133 o/ Ul L U(u)l Lu Uu : Ur R U(u)r Ru Uu' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill with showers', src: '4413 O/ Ur R U(u)l Lu Ul L U(u)r Ru' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill with showers mess', src: '441344133 o/ Ur R U(u)l Lu Ul L U(u)r Ru Uu : Ul L U(u)r Ru Ur R U(u)l Lu Uu' },
    // Appendix C: the six pure Rubenstein's Revenges, and each with its halves swapped (butterfly loop)
    { group: "Appendix C: Rubenstein's Revenges", name: "Rubenstein's Revenge", src: '22335 o\\ Ru. Ul. Lu Ul Ll : Lu. Ur. Ru Ur Rr' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR Rubenstein's Revenge", src: '52233 i/ Ul Lu. Ur. Rr Ru : Ur Ru. Ul. Ll Lu' },
    { group: "Appendix C: Rubenstein's Revenges", name: "Alt Rubenstein's Revenge", src: '35223 o\\ Ru Ur Ru. Ul. Ll : Lu Ul Lu. Ur. Rr' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR alt Rubenstein's Revenge", src: '35223 i/ Ur Rr Ru. Ul. Lu : Ul Ll Lu. Ur. Ru' },
    { group: "Appendix C: Rubenstein's Revenges", name: "Flos Rubenstein's Revenge", src: '52233 o/ Ul Lu. Ur. Ru Uu : Ur Ru. Ul. Lu Uu' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR flos Rubenstein's Revenge", src: '33522 i\\ Lu Uu Ul Lu. Ur. : Ru Uu Ur Ru. Ul.' },
    { group: "Appendix C: Rubenstein's Revenges", name: "Rubenstein's Revenge, butterfly loop", src: '22335 o\\ Lu. Ur. Ru Ur Rr : Ru. Ul. Lu Ul Ll' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR Rubenstein's Revenge, butterfly loop", src: '52233 i/ Ur Ru. Ul. Ll Lu : Ul Lu. Ur. Rr Ru' },
    { group: "Appendix C: Rubenstein's Revenges", name: "Alt Rubenstein's Revenge, butterfly loop", src: '35223 o\\ Lu Ul Lu. Ur. Rr : Ru Ur Ru. Ul. Ll' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR alt Rubenstein's Revenge, butterfly loop", src: '35223 i/ Ul Ll Lu. Ur. Ru : Ur Rr Ru. Ul. Lu' },
    { group: "Appendix C: Rubenstein's Revenges", name: "Flos Rubenstein's Revenge, butterfly loop", src: '52233 o/ Ur Ru. Ul. Lu Uu : Ul Lu. Ur. Ru Uu' },
    { group: "Appendix C: Rubenstein's Revenges", name: "TR flos Rubenstein's Revenge, butterfly loop", src: '33522 i\\ Ru Uu Ur Ru. Ul. : Lu Uu Ul Lu. Ur.' }
  ];

  // ---------- pattern tools: time reverse, flip, mills <-> flos ----------
  // Each takes a notation string and returns { ok, src } or { ok: false, error }.
  function headFor(digits, active) {
    var allThree = digits.every(function (d) { return d === 3; });
    if (allThree) return '3';
    return digits.map(function (d, i) { return d + (active[i] ? 'T' : ''); }).join('');
  }
  function write(digits, active, dirs, tokens, groups, keepPlainHead) {
    var head = headFor(digits, active);
    if (keepPlainHead && head === '3') head = '';
    var body = [], at = 0;
    groups.forEach(function (size, gi) {
      if (gi) body.push(':');
      for (var q = 0; q < size; q++, at++) body.push(tokens[at]);
    });
    while (at < tokens.length) body.push(tokens[at++]);
    var src0 = (head ? head + ' ' : '') + dirs + '/ ' + body.join(' ');
    var m = build(src0, { noReverse: true });
    if (!m.ok) return { ok: false, error: m.error };
    return { ok: true, src: src0.replace(dirs + '/', dirs + m.slashSeen) };
  }
  function groupSizes(p) {
    var g = [];
    p.tokens.forEach(function (t) { g[t.group] = (g[t.group] || 0) + 1; });
    return g;
  }
  function tokenText(t, c, hold) { return t + c + (hold ? '.' : ''); }
  function noOnes(p) { return p.digits.every(function (d) { return d !== 1; }); }

  function timeReverse(src) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    var p = m.parsed;
    if (!noOnes(p)) return { ok: false, error: 'Time reverse does not handle 1s yet.' };
    var N = p.tokens.length, D = p.digits.length, P = m.period;
    // played backwards, each catch becomes a throw and each throw a catch. The new throw m is
    // the old catch k = -m; the ball leaving there is the one that landed there, so it keeps
    // that throw's height, and its direction swaps (a catch out wide becomes a throw from outside)
    var swap = { o: 'i', i: 'o', O: 'O' };
    var tokens = [], digits = [], active = [], dirs = '';
    function incomingTo(k) {
      for (var i = k - 6; i <= k + 1; i++) { var n = m.digit(i); if ((n >= 3 || (n === 2 && p.active[((i % D) + D) % D])) && i + n - 2 === k) return i; }
      return null;
    }
    for (var q = 0; q < P; q++) {
      var k = ((-q) % P + P) % P, inc = incomingTo(k);
      var d = inc === null ? 2 : m.digit(inc);
      var act = inc !== null && d === 2;
      if (q < N) tokens.push(tokenText(p.tokens[k % N].c.toUpperCase(), p.tokens[k % N].t.toLowerCase(), d === 2 && !act));
      if (q < D) { digits.push(d); active.push(act); }
      if (q < p.dirs.length) dirs += swap[p.dirs[(inc === null ? k : inc) % N % p.dirs.length]] || 'o';
    }
    var gs = groupSizes(p);
    return write(digits, active, dirs, tokens, gs.every(function (x) { return x === gs[0]; }) ? gs : [N], false);
  }

  function flip(src) {
    var m = build(src);
    if (!m.ok) return m;
    var p = m.parsed, sw = { R: 'L', L: 'R', U: 'U', r: 'l', l: 'r', u: 'u' };
    var tokens = p.tokens.map(function (t) {
      return sw[t.t] + (t.br ? '(' + sw[t.br] + ')' : '') + (t.cFromNext ? '' : sw[t.c]) + (t.hold ? '.' : '');
    });
    return write(p.digits, p.active, p.dirs, tokens, groupSizes(p), !/^\s*[0-9]/.test(p.src));
  }

  // Appendix C: move the first throw and catch to the end, then switch the red letters (the first
  // throw and last catch of each half) between crossed and uncrossed; the digits rotate too
  function millsFlos(src) {
    var m = build(src);
    if (!m.ok) return m;
    var p = m.parsed;
    if (!noOnes(p)) return { ok: false, error: 'Mills/flos conversion does not handle 1s yet.' };
    var N = p.tokens.length, gs = groupSizes(p);
    var t = p.tokens.map(function (x) { return { t: x.t, c: x.c, hold: x.hold, redT: false, redC: false }; });
    var at = 0;
    gs.forEach(function (size) { t[at].redT = true; t[at + size - 1].redC = true; at += size; });
    t.push(t.shift());
    var digits = p.digits.slice(), active = p.active.slice();
    digits.push(digits.shift()); active.push(active.shift());
    for (var i = 0; i < N; i++) {
      if (!t[i].redT) continue;
      if (t[i].t !== 'U') t[i].t = 'U';
      else {
        if (t[i].c === 'u') return { ok: false, error: 'Cannot tell which arm goes on top for throw ' + (i + 1) + '.' };
        t[i].t = t[i].c.toUpperCase();
      }
    }
    for (i = 0; i < N; i++) {
      if (!t[i].redC) continue;
      t[i].c = t[i].c !== 'u' ? 'u' : t[(i + 1) % N].t.toLowerCase();
    }
    return write(digits, active, p.dirs, t.map(function (x) { return tokenText(x.t, x.c, x.hold); }), gs, !/^\s*[0-9]/.test(p.src));
  }

  // the same pattern? (same throws, catches, heights and directions, from any right-hand start)
  function sameKey(src) {
    var m = build(src);
    if (!m.ok) return null;
    var p = m.parsed, P = m.period, seq = [];
    for (var j = 0; j < P; j++) {
      var tk = p.tokens[j % p.tokens.length];
      seq.push(tk.t + (tk.br || '') + tk.c + m.digit(j) + p.dirs[(j % p.tokens.length) % p.dirs.length]);
    }
    var best = null;
    for (var r = 0; r < P; r += 2) {
      var k = seq.slice(r).concat(seq.slice(0, r)).join(' ');
      if (best === null || k < best) best = k;
    }
    return best;
  }
  function findPattern(src) {
    var k = sameKey(src);
    if (!k) return null;
    for (var i = 0; i < PATTERNS.length; i++) if (sameKey(PATTERNS[i].src) === k) return PATTERNS[i];
    return null;
  }

  var PH = { G: G, parse: parse, build: build, ik: ik, PATTERNS: PATTERNS,
             timeReverse: timeReverse, flip: flip, millsFlos: millsFlos, sameKey: sameKey, findPattern: findPattern };
  if (typeof module !== 'undefined' && module.exports) module.exports = PH;
  root.PH = PH;
})(typeof window !== 'undefined' ? window : this);
