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
    bodyTurnMax: 45,      // degrees: a turning pattern turns the body this far at most (forwards sebs: body 45, pattern 90)
    sideX: 30, sideFront: 30, sideBack: 5, carryFwd: 15, sidePole: [0.5, 0.6],
    lateFwd: 28, crossLift: 0, crossOut: 0, crossDrop: 0, sideUnderDrop: 10, sideUnderFwd: 3, sideUnderWin: 0.5, underPole: [0.8, 0], catchOut: 0, lateElbow: -0.6, lateWin: 0.7,   // a catch a hand rushes back across for: brought forward (cm), the elbow back, over lateWin beats either side   // side-plane patterns (cm): how far out the side plane is, its front and back ends, and how far forward a hand carries round between sides
    sideIn: 5, sideOutX: 22,   // where a hand is across the front pattern at its middle and outside (cm), read as front and back of the side
    shoulderX: 19, shoulderY: 138, shoulderZ: 0,
    upper: 32, fore: 32,            // shoulder to elbow, elbow to hand centre
    handZ: 33.5,                      // how far in front of the body the hands work
    outU: 23, outX: 21, outUnder: 17.2, inner: 4.5,   // throw/catch distance from the middle
    crossMin: 7,                    // a crossed hand is at least this far over
    throwY: 111.9, catchY: 112.3, lowY: 112,       // heights of a hand's scoop: release, catch, and its low point
    loopY: 122.2, lowAt: 0.6,                    // top of the empty hand's loop; where in the hold the low point is
    topLift: 0, botDrop: 0, roleLift: 2, roleDrop: 0, topFloor: 122.1, botCap: 108.4, bandSoft: 1.8, bodyEase: 3, crossEase: 0.2, flowBlur: 0.06, blurSwings: 1, swapRise0: 0.55, swapRise1: 0.95, swapStay: 0.5, swapFwd: 0, swapKey: 0, orbitR: 13, orbitSide: -1, orbitSideDown: -1, sharePushOther: 0.51, shareOrbitR: 10.53, shareOrbitRY: 7.37, shareLag: 0.46, shareOrbitXa: 1, shareOrbitAlong: 0.7, shareCatchUp: 8.08, shareEven: 1, shareRaise: 5.59, shareOrbit0: 0.09, shareOrbit1: 1.1, shareOrbitIn: 0.22, shareOrbitOut: 0.91, shareSwapRise0: 0.39, shareSwapRise1: 0.98, shareSwapEaseIn: 0.12, shareSwapEaseOut: 0.71, shareLift: 0, shareLiftW: 0.64, orbitXa: 0.75, centreKeys: 1, centreMin: 3,  sharePushFwd: 2, shareElbowIn: 1, shareElbowX: 22.48, shareElbowY: 104.01, shareElbowZ: 4.38, orbitElbow: 0, orbitHold: 1, orbit0: 0.1, orbit1: 0.9, orbitIn: 0.2, orbitOut: 0.8, swapOut: 0, swapUnder: 10, swapMidT: 0.4, roomBack: 0, roomDown: 0, swapClear: 2, swapEaseIn: 0.4, shareA: 0.47, shareB: 0.89, swapEaseOut: 0.9, swapPushFwd: 1, swapPushUp: 0.3, swapPushOther: 0.3, swapPushBack: 0.1, nearHold: 0.1, nearBlur: 0.1,                    // while the arms cross, the top hand rides higher and the bottom hand lower
    topZ: 3.1, botZ: -2.8,                     // and the top arm sits a little further forward
    topElbow: [15.1, 119.2, 24], botElbow: [12, 104.7, 14.9], elbowEarly: 0.8, underDrop: 10, underFwd: 8.7, underOut: 1, underWin: 0.5, nearIn: 22, nearOut: 29.6,
    underCatch: 0, contHold: 0.8, contTopIn: 4, contCatchOut: 10, contCatchFwd: 10, minArc: 12, graze: 1, underZMax: 34, oneFlight: 0.25, tempoK: 0.8, compress: 0.5, peak4: 165, peakStep: 7,   // the most a ball or arm may brush another arm, in cm
    throwMatch: 1.3, oneStroke: 0.1, ballLane: 6, ballLaneStep: 1, leanPow: 0.7, maxBalls: 5, oWide: 18, oLift: 16, oNarrow: 0.7, ballGap: 0.5, colStep: 18, popRise: 18, oneOut: 10, oneIn: 13, onePass: 0, passY: 116, passWin: 0.45, passGap: 4, palmWin: 0.45, throwBefore: 0.3, throwAfter: 0.2, catchBefore: 0.4, catchAfter: 0.3, underStroke: 0.5, catchGive: 0.3, maxStroke: 110, elbowOut: 0.1, elbowFwd: 0,
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
    // (the directions and slash may be left out, as in "Rr : Rr" or "Lu Ul": outside throws)
    var m = s.match(/^([0-9T\[\]]*)\s*([oiOIL]*)\s*([\/\\|])\s*(.*)$/) || s.match(/^([0-9T\[\]]*)\s*()()([RLU].*)$/);
    if (!m) return { ok: false, error: 'Expected something like "o\\ Ru Ul Ll : Lu Ur Rr".' };
    var head = m[1], dirs = m[2], slash = m[3], body = m[4];
    if (/[\[\]]/.test(head)) return { ok: false, error: 'Multiplexes are not in the simulator yet.' };
    // an L among the directions: the pattern starts with the left hand
    var lstart = /L/.test(dirs);
    dirs = dirs.replace(/L/g, '');
    if (!dirs) dirs = 'o';
    var digits = [], active = [];
    for (var i = 0; i < head.length; i++) {
      var c = head[i];
      if (c === 'T') { if (digits.length) active[digits.length - 1] = true; continue; }
      digits.push(+c); active.push(false);
    }
    if (!digits.length) { digits = [3]; active = [false]; }
    if (/_/.test(body)) return { ok: false, error: 'Empty hands (_) are not in the simulator yet.' };
    var tokens = [], group = 0, parts = body.replace(/:/g, ' : ').replace(/-/g, ' - ').split(' '), dash = false;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (p === ':') { group++; continue; }
      if (p === '-') { dash = true; continue; }   // (a change of throw direction on the same side, as in the butterfly messes)
      // a throw letter, then for a 1 the other hand's catch of it in brackets, then this hand's catch
      var tm = p.match(/^([RLU])(?:\(([rlu])\))?([rlu])?(\.?)$/);
      if (!tm) return { ok: false, error: 'Cannot read "' + p + '". Each throw is a capital R, L or U, then a small r, l or u for the catch.' };
      tokens.push({ t: tm[1], br: tm[2] || null, c: tm[3] || null, hold: tm[4] === '.', group: group, dash: dash, text: p });
      dash = false;
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
    // a pattern of only 2s (the 2 ball messes) throws them, or nothing would fly
    if (digits.every(function (d) { return d === 2; })) active = digits.map(function () { return true; });
    return { ok: true, src: s, head: head, dirs: dirs, slash: slash, digits: digits, active: active, tokens: tokens, lstart: lstart, body: body };
  }

  // ---------- building the movement ----------
  // A pattern that starts with the left hand (an L before the slash) is the mirror image of
  // the same pattern with R and L swapped, starting with the right: built that way, then
  // mirrored back (hands swap over and every x changes sign)
  function buildLeftStart(p, opts) {
    var SWP = { R: 'L', L: 'R', r: 'l', l: 'r' };
    var src2 = (p.head ? p.head + ' ' : '') + p.dirs + p.slash + ' ' + p.body.replace(/[RLrl]/g, function (c) { return SWP[c]; });
    var inner = build(src2, opts);
    if (!inner.ok) return inner;
    function mx(q) { return [-q[0], q[1], q[2]]; }
    function mirror(ps) {
      var o = {}; for (var k in ps) o[k] = ps[k];
      ['hands', 'elbows', 'shoulders', 'palms'].forEach(function (k) { if (ps[k]) o[k] = [mx(ps[k][1]), mx(ps[k][0])]; });
      if (typeof ps.w === 'number') o.w = -ps.w;
      if (ps.yaw) o.yaw = -ps.yaw;
      if (ps.balls) o.balls = ps.balls.map(function (b) { var c = {}; for (var q in b) c[q] = b[q]; c.pos = mx(b.pos); if (b.from !== undefined) c.from = 1 - b.from; if (b.to !== undefined) c.to = 1 - b.to; return c; });
      if (ps.event) { o.event = {}; for (var e in ps.event) o.event[e] = ps.event[e]; o.event.hand = 1 - ps.event.hand; }
      return o;
    }
    var model = {}; for (var k in inner) model[k] = inner[k];
    model.parsed = p; model.tokens = p.tokens; model.leftStart = true;
    if (inner.slashSeen) model.slashSeen = inner.slashSeen === '/' ? '\\' : '/';   // (the first throw, mirrored back, goes the other way)
    model.at = function (tb) { return mirror(inner.at(tb)); };
    model.pose = function (tb, plain) { return mirror(inner.pose(tb, plain)); };
    return model;
  }

  function build(src, opts) {
    opts = opts || {};
    var p = typeof src === 'string' ? parse(src) : src;
    if (!p.ok) return p;
    if (p.lstart) return buildLeftStart(p, opts);
    var N = p.tokens.length, D = p.digits.length;
    var P = lcm(lcm(lcm(N, D), 2), p.dirs.length);   // throws in one full cycle (the directions may cycle on their own, as in tennis's Oii)
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
    function dirOf(j) { return p.dirs[mod(j, p.dirs.length)]; }
    // an O throw mixed with other throws (tennis) goes over the top of the others' arcs and
    // wide of them, as in a reverse cascade, only as much as it needs to stay clear (oLift, oWide);
    // the whole pattern is drawn in a little (oNarrow), so it isn't so wide
    var MIXED_O = /O/.test(p.dirs) && /[io]/.test(p.dirs);
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
      // (tennis: the O ball goes over the top of the others, oLift cm higher)
      if (j !== undefined && G.oLift > 0 && MIXED_O && dirOf(j) === 'O') { var base0 = gFor(F); return 8 * (base0 * F * F / 8 + G.oLift) / (F * F); }
      // (a thrown 2 is a little pop over the other arm: it rises popRise cm, as low as still clears it)
      if (j !== undefined && G.popRise > 0 && nOf(j) === 2 && act[mod(j, P)]) return 8 * G.popRise / (F * F);
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
      // (with the arms crossed a 1 is passed straight to the other hand: the wrists twist and the
      // hands come briefly together near the middle, onePass out each)
      if (nOf(j) === 1 && crossed) far = G.onePass;
      if (dirOf(j) === 'O' && MIXED_O) far += G.oWide;   // (tennis: the O ball goes round the outside of the others)
      var x = sideFor(h, s) * (dirOf(j) === 'i' ? G.inner : far) * (MIXED_O ? G.oNarrow : 1);
      if (dirOf(j) === 'I') x = columnOf(j);
      return [x, G.throwY, G.handZ];
    }
    // Columns (I): right, centre and left (four with an even ball count: see below). A ball goes up the column on the
    // side where both the throwing hand (by its throw letter) and the catching hand (by its
    // catch letter) are; if they are on opposite sides, it goes up the centre.
    function columnOf(j) {
      var h = handOf(j), k = j + nOf(j) - 2;
      var sT = sideFor(h, tok(j).t), sC = sideFor(handOf(k), tok(k).c.toUpperCase());
      // (a ball that comes back to the hand that threw it, as in the 4 ball Boston mess, goes up
      // a centre column just over on the other hand's side, so there are four columns in all:
      // the throwing hand is still the nearer one, uncrossed, and the other hand passes across it
      // to its own centre column before the catch, so the arms cross as the letters say).
      // Neighbouring columns are always colStep apart, so they are evenly spaced.
      var four = nOf(j) % 2 === 0;
      if (sT === sC) return sT * G.colStep * (four ? 1.5 : 1);
      return four ? -OWN[h] * G.colStep / 2 : 0;
    }
    function catchKey(j) {
      var h = handOf(j), s = tok(j).c.toUpperCase(), crossed = s !== 'U';
      var under = crossed && s !== (h === 0 ? 'R' : 'L');
      var far = crossed ? (under ? G.outUnder : G.outX) : G.outU;
      var inc = incoming[mod(j, P)];
      var d = dirOf(inc === null ? j - 1 : inc);
      if (d === 'O' && MIXED_O) far += G.oWide;
      var x = sideFor(h, s) * (d === 'o' ? G.inner : far) * (MIXED_O ? G.oNarrow : 1);
      if (d === 'I' && inc !== null) x = columnOf(inc);   // (a column comes straight down where it went up)
      // (continuous under-arm catches: the catching hand reaches across under the other forearm,
      // just in front of it, so the ball comes down past it)
      if (CONT_UNDER && crossed && under && inc !== null) return [sideFor(h, s) * G.contCatchOut, G.catchY, G.handZ + G.contCatchFwd];
      // (a 1 is caught where the other hand already is, without reaching in for it, so the
      // hands stay apart: oneIn, how far out on its own side. Not when that hand crosses over
      // straight after, as in the flos showers: it catches nearer the middle, on its way across)
      if (inc !== null && nOf(inc) === 1 && !crossed && tok(j + 2).t === 'U') x = sideFor(h, s) * G.oneIn;
      if (inc !== null && nOf(inc) === 1 && tok(inc).t !== 'U') x = sideFor(h, s) * G.onePass;   // (a crossed 1 is passed hand to hand)
      return [x, G.catchY, G.handZ];
    }

    // key positions of each hand: at its own throws and catches, and in between (at the
    // other hand's events) drifting along its path but kept on the side the arms state says
    // the letter that says where this event's hand is: its throw letter or its catch letter
    function ownLetter(ev) { var tk = tok(ev.j); return ev.part === 'throw' ? tk.t : tk.c.toUpperCase(); }
    function underEvent(ev) { var l = ownLetter(ev); return l !== 'U' && l !== (ev.hand === 0 ? 'R' : 'L'); }
    var CONT_UNDER = p.tokens.length > 0 && (p.tokens.every(function (tk) { return tk.t === 'U' && tk.c && tk.c.toUpperCase() !== 'U'; }) ||
                                             p.tokens.every(function (tk) { return tk.t !== 'U' && tk.c && tk.c.toUpperCase() === 'U'; }));
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
        // Continuous under-arm throws or catches (every throw, or every catch, made under the
        // other arm): the arm on top waits at its own uncrossed spot while the other hand
        // reaches under it, so the hand going under does nearly all the moving (the author,
        // 2026-11-25). contHold 1 = held right there
        if (CONT_UNDER && underEvent(ev)) {
          var ua = ownLetter(events[a.i]) === 'U', ub = ownLetter(events[b.i]) === 'U';
          var hold = ua && ub ? (ev.t - ta <= tb2 - ev.t ? a : b) : ua ? a : ub ? b : null;
          if (hold) x += (hold.pos[0] - x) * G.contHold;
          // (for a catch the top forearm still has to reach over the spot where the ball comes
          // down, so the top hand comes in only to just inside its own side: contTopIn)
          if (ev.part === 'catch') x = OWN[h] * G.contTopIn;
        }
        var held = CONT_UNDER && underEvent(ev) && G.contHold > 0;
        var need = ev.st === 0 ? OWN[h] : -OWN[h];
        // (in columns a hand throws from the spot where it caught, carrying the ball nowhere,
        // so between a catch and a throw at the same spot it stays put)
        var still = dirOf(events[b.i].j) === 'I' && Math.abs(a.pos[0] - b.pos[0]) < 0.01;
        if (!still && !held && x * need < G.crossMin) x = need * G.crossMin;   // (a held top arm stays on its own side)
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
    // 1s passed hand to hand with the arms crossed: the thrower at its throw and the catcher at
    // its catch come to the same height (passY), eased in and out over passWin beats
    var passes = [[], []];
    for (j = 0; j < P; j++) if (nOf(j) === 1 && tok(j).t !== 'U') {
      passes[handOf(j)].push(j);
      passes[1 - handOf(j)].push(j + G.oneFlight);
    }
    function passPull(h, tb) {
      var best = 0, list = passes[h];
      for (var i = 0; i < list.length; i++) {
        var d = Math.abs(mod(tb - list[i] + P / 2, P) - P / 2);
        best = Math.max(best, 1 - smoother(0, G.passWin, d));
      }
      return best;
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

    var elbowPin = [0, 0], elbowBias = [0, 0], orbitRef = {}, orbitOff = false;       // extra forward lean for an elbow (the hectic arm's, during its orbit)
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
      // (in the hectic flos change-over the moving arm's elbow stays in low by the body, as in the
      // hectic mills: the hand goes round with the wrist, not by swinging the elbow out)
      if (elbowPin[h] > 0) aim([G.shareElbowX, G.shareElbowY, G.shareElbowZ], elbowPin[h]);
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
        // a 1 passed with the arms crossed: both hands come briefly to the same height to meet
        var pw = passPull(h, tb);
        if (pw > 0) P0[1] += (G.passY + (top - bot) * G.passGap / 2 - P0[1]) * pw;   // (the top wrist stays just over the other)
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
          elbowPin[h] = swo.kind === 'shared' ? G.shareElbowIn * bw : 0;
        } else { elbowBias[h] = 0; elbowPin[h] = 0; }
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
    // (a ball in the hand sits in the palm, whichever way the palm faces)
    function ballIn(ps, h) { var hp = ps.hands[h], pm = ps.palms ? ps.palms[h] : [0, 1, 0], d = G.handR * 0.55 + G.ballR * 0.6; return [hp[0] + pm[0] * d, hp[1] + pm[1] * d, hp[2] + pm[2] * d]; }
    // Which way a throw's arc leans (from -1, back, to 1, forward). Where the arcs of
    // neighbouring throws would meet (most patterns with 4 or 5 balls, and a few with 3, like
    // the half shower and some butterflies), each arc leans a little forward or back, as real
    // jugglers' arcs do: up to leanCm at the top, none at the ends. A 3 ball pattern that is
    // already clear isn't touched. The leans are chosen once per pattern: each throw tries each lean in turn, keeping
    // whichever leaves the balls furthest apart, until nothing better is found.
    var laneTab = null;
    // (how far along its lean an arc is, from 0 at the throw to 1 at the top and back to 0 at the
    // catch; leanPow below 1 leans sooner after the throw)
    function leanShape(f) { return Math.pow(Math.max(0, Math.sin(Math.PI * f)), G.leanPow); }
    function leanCm() { return G.ballLane + G.ballLaneStep * Math.max(0, balls - 3); }   // (the most an arc leans, at its top)
    function laneOf(j) {
      if (!laneTab) laneTab = chooseLanes();
      return laneTab[mod(j, P)];
    }
    function chooseLanes() {
      var none = []; for (var q = 0; q < P; q++) none.push(0);
      if (balls < 3 || !G.ballLane || (pathDef && G.pathNoLean)) return none;   // (side plane paths: no lean, so each side's balls follow one arc, if they stay clear)
      var Lw = leanCm(), R2 = 2 * G.ballR;
      // every flight in the cycle, as it would be with no lean
      var fl = {};
      function flight(j) {
        var key = mod(j, P);
        if (fl[key]) return fl[key];
        var nj = nOf(j), k = j + nj - 2, tc = catchTime(k), j0 = mod(j, P), tc0 = tc - (j - j0);
        var a = ballIn(flowPose(j0), handOf(j)), b = ballIn(flowPose(tc0), handOf(k));
        var F = (tc0 - j0) / bps, gg = gFor(F, j0), vy = (b[1] - a[1]) / F + gg * F / 2;
        return (fl[key] = { j0: j0, tc: tc0, a: a, b: b, F: F, gg: gg, vy: vy });
      }
      function at(f, tb) {   // tb measured from that flight's own throw
        var tau = tb / bps;
        return [f.a[0] + (f.b[0] - f.a[0]) * tau / f.F, f.a[1] + f.vy * tau - f.gg * tau * tau / 2, f.a[2] + (f.b[2] - f.a[2]) * tau / f.F, leanShape(tau / f.F)];
      }
      // pairs of balls in the air at the same moment, and balls near an arm, sampled over the cycle
      var pairs = [], arms = [];
      for (var t = 0; t < P; t += 0.05) {
        var live = [], ps = null;
        for (var j = Math.floor(t) - maxN - 1; j <= Math.floor(t); j++) {
          if (!flies(j)) continue;
          var f = flight(j), since = t - j, len = f.tc - f.j0;
          if (since <= 0.1 || since >= len - 0.1) continue;
          live.push({ i: f.j0, p: at(f, since), from: handOf(j), to: handOf(j + nOf(j) - 2), since: since, left: len - since });
        }
        for (var u = 0; u < live.length; u++) {
          for (var v = u + 1; v < live.length; v++) {
            var A = live[u].p, B = live[v].p, dxy = (A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]);
            if (dxy > 400) continue;   // (more than 20 cm apart already)
            pairs.push([dxy, A[2] - B[2], A[3], B[3], live[u].i, live[v].i]);
          }
          // (the forearms, except the hand that has just thrown or is about to catch this ball)
          for (var hh = 0; hh < 2; hh++) {
            if ((hh === live[u].from && live[u].since < 0.2) || (hh === live[u].to && live[u].left < 0.2)) continue;
            if (!ps) ps = flowPose(t);
            var E = ps.elbows[hh], H = ps.hands[hh], Q = live[u].p;
            var mx = (E[0] + H[0]) / 2 - Q[0], my = (E[1] + H[1]) / 2 - Q[1], mz = (E[2] + H[2]) / 2 - Q[2];
            if (mx * mx + my * my + mz * mz > 900) continue;
            arms.push([Q, live[u].i, E, H]);
          }
        }
      }
      if (!pairs.length) return none;
      function segGap(Q, E, H) {
        var dx = H[0] - E[0], dy = H[1] - E[1], dz = H[2] - E[2], L2 = dx * dx + dy * dy + dz * dz;
        var tt = L2 ? Math.max(0, Math.min(1, ((Q[0] - E[0]) * dx + (Q[1] - E[1]) * dy + (Q[2] - E[2]) * dz) / L2)) : 0;
        var px = E[0] + dx * tt - Q[0], py = E[1] + dy * tt - Q[1], pz = E[2] + dz * tt - Q[2];
        return Math.sqrt(px * px + py * py + pz * pz) - G.foreR - G.ballR + G.graze;
      }
      function ballGap(l) {
        var worst = 1e9;
        for (var q = 0; q < pairs.length; q++) {
          var pr = pairs[q], dz = pr[1] + Lw * (l[pr[4]] * pr[2] - l[pr[5]] * pr[3]);
          var d = Math.sqrt(pr[0] + dz * dz) - R2;
          if (d < worst) worst = d;
        }
        return worst;
      }
      // (with 3 balls, only where balls would meet: a pattern already clear is left as it is)
      if (balls === 3 && ballGap(none) >= G.ballGap) return none;
      // how badly balls overlap each other and the arms, summed (smaller is better), with the
      // closest gap to break ties
      function score(l) {
        var bad = 0, worst = 1e9, q, d;
        for (q = 0; q < pairs.length; q++) {
          var pr = pairs[q], dz = pr[1] + Lw * (l[pr[4]] * pr[2] - l[pr[5]] * pr[3]);
          d = Math.sqrt(pr[0] + dz * dz) - R2;
          if (d < 0) bad += d * d;
          if (d < worst) worst = d;
        }
        for (q = 0; q < arms.length; q++) {
          var ar = arms[q], Q = ar[0], Qz = [Q[0], Q[1], Q[2] + Lw * l[ar[1]] * Q[3]];
          d = segGap(Qz, ar[2], ar[3]);
          if (d < 0) bad += d * d;
          if (d < worst) worst = d;
        }
        return -bad + 0.001 * worst;
      }
      var tries = [[], [], []];
      for (q = 0; q < P; q++) { tries[0].push(handOf(q) === 0 ? 1 : -1); tries[1].push(P % 3 === 0 ? mod(q, 3) - 1 : 0); tries[2].push(0); }
      var best = none, bestS = -1e9, STEPS = [-1, -0.5, 0, 0.5, 1];
      tries.forEach(function (l0) {
        var l = l0.slice(), sc = score(l);
        for (var pass = 0; pass < 8; pass++) {
          var better = false;
          for (var q2 = 0; q2 < P; q2++) {
            if (!flies(q2)) continue;
            var keep = l[q2];
            STEPS.forEach(function (v) { l[q2] = v; var s2 = score(l); if (s2 > sc + 1e-6) { sc = s2; keep = v; better = true; } });
            l[q2] = keep;
          }
          if (!better) break;
        }
        if (sc > bestS) { bestS = sc; best = l; }
      });
      // (a pattern on a path is the same on both sides, its left hand the mirror of its right half
      // a cycle later: the left side's leans, the first half, are copied onto the right, so the
      // right side matches it; the author, 2026-11-26: 5 ball backwards sebs looked right on the
      // left side and wrong on the right)
      if (pathDef && P % 2 === 0) { var hf = P / 2; best = best.slice(); for (var q5 = 0; q5 < hf; q5++) best[q5 + hf] = best[q5]; }
      return best;
    }
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
            var a = ballIn(flowPose(j), hand), bpt = ballIn(flowPose(tc), handOf(k));
            var F = (tc - j) / bps, tau = (tb - j) / bps, gg = gFor(F, j);
            var vy = (bpt[1] - a[1]) / F + gg * F / 2;
            pos = [a[0] + (bpt[0] - a[0]) * tau / F, a[1] + vy * tau - gg * tau * tau / 2, a[2] + (bpt[2] - a[2]) * tau / F];
            // (where arcs would meet, each leans a little forward or back: see laneOf)
            if (balls >= 3 && G.ballLane) pos[2] += leanCm() * laneOf(j) * leanShape(tau / F);
            res.push({ pos: pos, col: colAt(j), fly: true, from: hand, to: handOf(k), t0: j, t1: tc });
            continue;
          } else pos = ballIn(poseNow, handOf(k));
        } else pos = ballIn(poseNow, hand);
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
    // how strongly the moving arm's elbow is held in by the body (the hectic flos change-over)
    function pinAt(h, tb) {
      if (!(G.shareElbowIn > 0)) return 0;
      var sw = swapAt(tb);
      if (!sw || sw.done || sw.kind !== 'shared' || sw.mover !== h) return 0;
      return G.shareElbowIn * smoother(0, swG(sw, 'orbitIn'), sw.f) * (1 - smoother(swG(sw, 'orbitOut'), 1, sw.f));
    }
    // Turning patterns (Mike's mess, sebs): each half is done at one side of the body, and the
    // whole juggler turns towards that side (turn degrees), passing through facing the front
    // between halves. The arms keep their own movement relative to the body; everything is
    // turned about the spine, and the balls fly between the turned hands.
    var TURN = opts.turn !== undefined ? opts.turn : 0;
    if (opts.turn === undefined) PATTERNS.forEach(function (pt) { if (pt.turn && sameMoves(parse(pt.src), p)) TURN = pt.turn; });
    // A pivot (the author, 2026-11-25): each group of throws has a place, written like
    // BL:FL:FR:BR:FR:FL (Back or Front, Left or Right). At a Back group the juggler is turned
    // to that side; at a Front group the body faces the front.
    var PIVOT = opts.pivot !== undefined ? opts.pivot : null;
    if (opts.pivot === undefined) PATTERNS.forEach(function (pt) { if (pt.pivot && sameMoves(parse(pt.src), p)) PIVOT = pt.pivot; });
    var pivotPos = PIVOT ? PIVOT.split(':') : null;
    // A turn (the author, 2026-11-26): the juggler spins right round, SPIN degrees each cycle
    // (negative: to the right), always the same way, facing the front at beat SPINAT. A pivot
    // turns to one side and back; a turn keeps going.
    var SPIN = opts.spin !== undefined ? opts.spin : 0, SPINAT = opts.spinAt || 0;
    if (opts.spin === undefined) PATTERNS.forEach(function (pt) { if (pt.spin && sameMoves(parse(pt.src), p)) { SPIN = pt.spin; SPINAT = pt.spinAt || 0; } });
    var PATH = opts.path !== undefined ? opts.path : null;
    if (opts.path === undefined) PATTERNS.forEach(function (pt) { if (pt.path && sameMoves(parse(pt.src), p)) PATH = pt.path; });
    // a path may have its own version for a ball count (forwardsSebs4 ...): with more balls each
    // ball is caught a beat later, so the catches move to keep each side's three balls together
    var pathName = PATH && PATHS[PATH + Math.round(balls)] ? PATH + Math.round(balls) : PATH;
    var pathDef = pathName && PATHS[pathName] && PATHS[pathName].period === P ? PATHS[pathName] : null, pathSpl = null;
    function pathHand(h, tb) {      // a hand on its filmed path, in the body's own frame
      if (!pathSpl) pathSpl = periodicSpline(pathDef.keys.map(function (k) { return k[0]; }), pathDef.keys.map(function (k) { var v = k.slice(1); while (v.length < 5) v.push(0); return v; }), P);
      if (h === 0) return pathSpl(tb);
      var v = pathSpl(tb - P / 2);
      return [-v[0], v[1], v[2], v[3], v[4]];
    }
    function pathYaw(tb) {
      // (a path may set its own turn through the cycle, yawKeys [beat, share of turn], as the
      // pivot does: held at a side through a side group and square to the front for the front ones)
      if (pathDef.yawKeys) {
        // (eased from one key to the next, so it holds still at each and never overshoots)
        var ks = pathDef.yawKeys, t = mod(tb, P), n = ks.length, i = n - 1;
        for (var q = 0; q < n; q++) if (ks[q][0] <= t) i = q;
        var a = ks[i], b = ks[(i + 1) % n], ta = a[0], tb2 = b[0], av = a[1], bv = b[1];
        if (t < ta) ta -= P;
        if (tb2 <= ta) tb2 += P;
        // (a turn keeps going round: from the last key to the first, yawWrap turns more is added)
        if (pathDef.yawWrap) { if (i === n - 1) bv += pathDef.yawWrap; if (t < a[0] && i === n - 1) { av -= pathDef.yawWrap; bv -= pathDef.yawWrap; } }
        return pathDef.turn * Math.PI / 180 * (av + (bv - av) * smoother(ta, tb2, t));
      }
      return pathDef.turn * Math.PI / 180 * Math.cos(2 * Math.PI * (tb - pathDef.turnAt) / P);
    }
    var turnKeys = null;
    function yawAt(tb) {
      if (SPIN) return SPIN * Math.PI / 180 * (tb - SPINAT) / P;
      if (!TURN) return 0;
      if (!turnKeys) {
        // each half's middle throw time, and the side its throws are made on
        turnKeys = [];
        var cyc = P / N;
        for (var r = 0; r < cyc; r++) {
          var byG = {};
          for (var k = 0; k < N; k++) { var g = p.tokens[k].group; (byG[g] = byG[g] || []).push(r * N + k); }
          Object.keys(byG).forEach(function (g) {
            var js = byG[g], tm = 0, x = 0;
            js.forEach(function (j) { tm += j; x += throwKey(j)[0]; });
            var side = x >= 0 ? 1 : -1, pos = pivotPos && pivotPos[+g % pivotPos.length];
            if (pos) side = pos.charAt(0) === 'B' ? (pos.charAt(1) === 'L' ? 1 : -1) : 0;
            turnKeys.push({ t: tm / js.length, side: side });
          });
        }
        turnKeys.sort(function (a, b) { return a.t - b.t; });
      }
      var t = mod(tb, P), n = turnKeys.length, i = n - 1;
      for (var q = 0; q < n; q++) if (turnKeys[q].t <= t) i = q;
      var a = turnKeys[i], b = turnKeys[(i + 1) % n], ta = a.t, tb2 = b.t;
      if (t < ta) ta -= P;
      if (tb2 <= ta) tb2 += P;
      var v = a.side + (b.side - a.side) * smoother(0, 1, (t - ta) / (tb2 - ta));
      return v * TURN * Math.PI / 180;
    }
    // turn a point about the spine by yaw (positive turns the chest towards the juggler's left, +x)
    function turnPt(q, c, sn) { return [q[0] * c + q[2] * sn, q[1], -q[0] * sn + q[2] * c]; }
    // Side-plane patterns (turned more than bodyTurnMax; both sebs now follow paths, PATHS, so
    // this is only for a shared link with a large turn): each half is juggled at one side of the
    // body, in a plane square to the front, and the body turns bodyTurnMax towards it. Every
    // throw is made at one end of that side and caught at the other: the hand's position across
    // the front pattern (middle or outside) becomes how far forward it is at the side (middle =
    // front, outside = back, level with the side of the body), so an inside pattern throws front
    // to back and an outside one back to front. Every ball is caught on the side it was thrown from;
    // between its throws and catches a hand carries round the front to the next one's side.
    // The body follows the two hands.
    var handKeys = null, lateCatches = null;
    // how near beat tb is to one of hand h's rushed catches (1 at the catch, 0 lateWin beats away)
    function lateNear(h, tb) {
      if (!handKeys) handSide(h, tb);
      var w = 0, L = lateCatches[h];
      for (var i = 0; i < L.length; i++) w = Math.max(w, 1 - smoother(0, G.lateWin, Math.abs(mod(tb - L[i] + P / 2, P) - P / 2)));
      return w;
    }
    var underThrowTimes = null;
    function underNear(h, tb) {
      if (!underThrowTimes) {
        underThrowTimes = [[], []];
        for (var j = 0; j < P; j++) if (flies(j) && tok(j).t !== 'U') underThrowTimes[handOf(j)].push(j);
      }
      var w = 0, L = underThrowTimes[h];
      for (var i = 0; i < L.length; i++) w = Math.max(w, 1 - smoother(0, G.sideUnderWin, Math.abs(mod(tb - L[i] + P / 2, P) - P / 2)));
      return w;
    }
    function handSide(h, tb) {
      if (!handKeys) {
        var gx = {}, gSide = {};
        for (var k = 0; k < N; k++) { var g = p.tokens[k].group; gx[g] = (gx[g] || 0) + throwKey(k)[0]; }
        for (var g2 in gx) gSide[g2] = gx[g2] >= 0 ? 1 : -1;
        // each hand's throws are at their own half's side, and each catch at the side the ball
        // was thrown from, so every ball is thrown and caught on the same side
        handKeys = [[], []];
        for (var j = 0; j < P; j++) {
          var gj = gSide[p.tokens[mod(j, N)].group];
          handKeys[handOf(j)].push({ t: j, side: gj });
          if (flies(j)) { var kc = j + nOf(j) - 2; handKeys[handOf(kc)].push({ t: mod(catchTime(kc), P), side: gj, c: 1 }); }
        }
        handKeys.forEach(function (ks) { ks.sort(function (u, v) { return u.t - v.t; }); });
        // a catch the hand has to rush back across for (its event before was on the other side)
        lateCatches = [[], []];
        handKeys.forEach(function (ks, hh) {
          ks.forEach(function (e, i) { var pr = ks[(i + ks.length - 1) % ks.length]; if (e.c && pr.side !== e.side) lateCatches[hh].push(e.t); });
        });
      }
      var ks = handKeys[h], t = mod(tb, P), n = ks.length, i = n - 1;
      for (var q = 0; q < n; q++) if (ks[q].t <= t) i = q;
      var a = ks[i], b = ks[(i + 1) % n], ta = a.t, tn = b.t;
      if (t < ta) ta -= P;
      if (tn <= ta) tn += P;
      return a.side === b.side ? a.side : a.side + (b.side - a.side) * smoother(ta, tn, t);
    }
    function flowPose(tb) {
      var o = flowPoseBody(tb), ya = yawAt(tb);
      if (pathDef) {
        // a filmed path: the body turns, the hands follow their loops, and each arm reaches
        // its hand from the turned shoulder with the elbow down and out, or forward when across
        var yp = pathYaw(tb), cp = Math.cos(yp), sp0 = Math.sin(yp), rch = 0, po = pathDef.pole, pf = pathDef.poleFar, pt = pathDef.poleTuck || po;
        o.yaw = yp;
        for (var hp = 0; hp < 2; hp++) {
          var q = pathHand(hp, tb), far = Math.max(0, Math.min(1, q[3])), tk = Math.max(0, Math.min(1, q[4] || 0));
          var rs = pathDef.reachShoulder || [0, 0];   // (reaching across, the shoulder comes in and forward)
          var Sp = turnPt([OWN[hp] * (G.shoulderX - rs[0] * far), G.shoulderY, G.shoulderZ + rs[1] * far], cp, sp0);
          var Tp = turnPt([q[0], G.shoulderY + q[1], G.shoulderZ + q[2]], cp, sp0);
          var pl = [0, 1, 2].map(function (c) { var v = po[c] + (pf[c] - po[c]) * far; return v + (pt[c] - v) * tk; });   // (out, or forward when across; tucked in to the side when tk is 1)
          var Pp = turnPt([OWN[hp] * pl[0], pl[1], pl[2]], cp, sp0);
          var Ep = ik(Sp, Tp, G.upper, G.fore, Pp);
          o.shoulders[hp] = Sp; o.hands[hp] = Ep.hand; o.elbows[hp] = Ep.elbow; rch = Math.max(rch, Ep.reach);
        }
        o.reach = rch;
      } else if (TURN > G.bodyTurnMax) {
        var sd = [handSide(0, tb), handSide(1, tb)], yb = (sd[0] + sd[1]) / 2 * G.bodyTurnMax * Math.PI / 180;
        var cb = Math.cos(yb), sb = Math.sin(yb), reach = 0, sp = [];
        o.yaw = yb;
        for (var h = 0; h < 2; h++) {
          var S0 = o.shoulders[h], E0 = o.elbows[h], H0 = o.hands[h];
          var u = smooth(G.sideIn, G.sideOutX, Math.abs(H0[0]));          // 0 middle .. 1 outside
          var lw = lateNear(h, tb);
          var z = G.sideBack + (G.sideFront - G.sideBack) * (1 - u) + G.carryFwd * (1 - sd[h] * sd[h]) + G.lateFwd * lw;
          // the side plane is TURN degrees round from the front: short of 90, its front end comes in
          var rl = handRole(h, tb);   // (+1 this arm on top where the arms cross, -1 underneath)
          var Hh = [sd[h] * (G.sideX + G.catchOut * u - (z - G.sideBack) * Math.tan((90 - TURN) * Math.PI / 180)), H0[1] + G.crossLift * rl, z];   // (catches a little further out than throws)   // (the top arm's hand a little higher, the other's lower)
          var S = turnPt(S0, cb, sb);
          var pole = turnPt([OWN[h] * (G.sidePole[0] + G.crossOut * Math.max(rl, 0)), -1 - G.crossDrop * Math.max(-rl, 0), G.sidePole[1] + (G.lateElbow - G.sidePole[1]) * lw], cb, sb);   // (crossed: the top elbow out, the bottom one dropped; neither ever points up)   // (elbows out, down and forward from the turned shoulders; back for a rushed catch)
          var El = ik(S, Hh, G.upper, G.fore, pole);
          o.shoulders[h] = S; o.hands[h] = El.hand; o.elbows[h] = El.elbow; reach = Math.max(reach, El.reach);
          sp[h] = { S: S, H: Hh, pole: pole };
        }
        // a crossed throw (R or L) is made with the throwing hand close in, just under the other
        // arm's elbow: eased in and out over sideUnderWin beats either side of the throw
        for (var h3 = 0; h3 < 2; h3++) {
          var uw = underNear(h3, tb);
          if (!uw) continue;
          var Eo = o.elbows[1 - h3], tgt = [Eo[0], Eo[1] - G.sideUnderDrop, Eo[2] + G.sideUnderFwd], Hc = sp[h3].H;
          var Hm = [Hc[0] + (tgt[0] - Hc[0]) * uw, Hc[1] + (tgt[1] - Hc[1]) * uw, Hc[2] + (tgt[2] - Hc[2]) * uw];
          var tp = turnPt([OWN[h3] * G.underPole[0], -1, G.underPole[1]], cb, sb), pl = sp[h3].pole;   // (that arm tucked low: its elbow down and back)
          var E3 = ik(sp[h3].S, Hm, G.upper, G.fore, [pl[0] + (tp[0] - pl[0]) * uw, pl[1] + (tp[1] - pl[1]) * uw, pl[2] + (tp[2] - pl[2]) * uw]);
          o.hands[h3] = E3.hand; o.elbows[h3] = E3.elbow; reach = Math.max(reach, E3.reach);
        }
        o.reach = Math.max(o.reach, reach);
      } else {
        o.yaw = ya;
        if (ya) {
          var c0 = Math.cos(ya), s0 = Math.sin(ya);
          ['hands', 'elbows', 'shoulders'].forEach(function (k) { o[k] = o[k].map(function (q) { return turnPt(q, c0, s0); }); });
        }
      }
      o.palms = [palmAt(0, tb, o), palmAt(1, tb, o)];
      return o;
    }
    // Which way each palm faces: up, holding the ball, except around a 1, when the hand that
    // throws it and the hand that catches it briefly turn a quarter turn about the forearm,
    // always the same way: the thumb rolls over the top and inwards (as it would towards the
    // middle with the arm on its own side), wherever the hand is. Eased in and out over palmWin
    // beats either side of the throw and the catch.
    var oneEvents = null;
    function palmAt(h, tb, ps) {
      if (!oneEvents) {
        oneEvents = [[], []];
        for (var q = 0; q < P; q++) if (nOf(q) === 1) { oneEvents[handOf(q)].push(q); oneEvents[1 - handOf(q)].push(q + G.oneFlight); }
      }
      var w = 0, list = oneEvents[h];
      for (var i = 0; i < list.length; i++) w = Math.max(w, 1 - smoother(0, G.palmWin, Math.abs(mod(tb - list[i] + P / 2, P) - P / 2)));
      if (!w) return [0, 1, 0];
      // the forearm, elbow to hand, and the palm turned a quarter turn about it (right hand:
      // up x forearm; the left hand, its mirror image: forearm x up)
      var Hh = ps.hands[h], E = ps.elbows[h], a = [Hh[0] - E[0], Hh[1] - E[1], Hh[2] - E[2]];
      var t = h === 0 ? [a[2], 0, -a[0]] : [-a[2], 0, a[0]], tl = Math.hypot(t[0], t[1], t[2]) || 1;
      t = [t[0] / tl, 0, t[2] / tl];
      var ang = w * Math.PI / 2, v = [t[0] * Math.sin(ang), Math.cos(ang), t[2] * Math.sin(ang)];
      return v;
    }
    function flowPoseBody(tb) {
      if (!(G.flowBlur > 0)) return pose(tb);
      if (!flow) bakeFlow();
      var roles = [handRole(0, tb), handRole(1, tb)], out = { w: crossW(tb), hands: [], elbows: [], shoulders: [], reach: 0 };
      for (var h = 0; h < 2; h++) {
        var P0 = flowHand(h, tb), so = G.blurSwings ? [0, 0, 0] : strokeAt(h, tb), top = Math.max(0, roles[h]), bot = Math.max(0, -roles[h]);
        for (var c = 0; c < 3; c++) P0[c] += so[c];
        elbowPin[h] = pinAt(h, tb);
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
    // The slash shows the side of the body the first throw peaks on: the top of the slash points
    // there as you watch, so / is a peak on the juggler's left (your right) and \ on the juggler's
    // right. The peak is taken as halfway between the throw and the catch, from the first
    // right-hand throw that flies; columns, which go straight up, and throws that peak on the
    // centre line (O throws, outside to outside) have no slash of their own.
    var slashSeen = null;
    for (j = 0; j < P && slashSeen === null; j++) {
      if (handOf(j) !== 0 || !flies(j)) continue;
      var k = j + nOf(j) - 2, tc = catchTime(k);
      var x0 = pose(j).hands[0][0], x1 = pose(tc).hands[handOf(k)][0];
      if (Math.abs(x1 - x0) < 3) break;
      var mid = (x0 + x1) / 2;
      if (Math.abs(mid) < 2) break;
      slashSeen = mid > 0 ? '/' : '\\';
    }

    var model = {
      ok: true, parsed: p, balls: balls, period: P, loop: loop, events: E, eventTimes: evTimes.slice(), at: at, pose: pose,
      tokens: p.tokens, slashSeen: slashSeen, turn: TURN, notes: notes, maxN: maxN, bps: BPS, catchTime: catchTime, digit: nOf, baseHand: baseHand
    };

    // A hectic pattern whose swap goes over to under (the TR hectic messes) is shown as its
    // time reverse played backwards, as the author describes it: the same movement as the
    // hectic mess with time flowing the other way. Played backwards each throw is a catch and
    // each catch a throw, and beat tb here is beat (catchLag - tb) there.
    if (!opts.noReverse && !pathDef) {   // (a pattern on a path moves as its path says)
      swapAt(0);
      var descending = swaps.some(function (sw) { return sw.kind === 'hectic' ? sw.from === (sw.mover === 0 ? 1 : -1) : sw.dir === 'i'; });
      if (descending) {
        var rv = timeReverse(p.src), srcM = rv.ok ? build(rv.src, { noReverse: true, turn: TURN }) : null;
        if (srcM && srcM.ok && srcM.period === P) {
          var C = G.catchLag + 64 * srcM.loop;
          model.reversedFrom = rv.src;
          model.at = function (tb) {
            var own = at(tb), ps = srcM.at(C - tb);
            own.hands = ps.hands; own.elbows = ps.elbows; own.shoulders = ps.shoulders; own.w = ps.w; own.reach = ps.reach; own.yaw = ps.yaw; own.palms = ps.palms;
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

  // Two patterns share their arm movement when they are written alike, or when they differ only
  // in the ball count: the same letters, directions and slash, each with every throw the same
  // height (3, 4, 5 ...). So sebs with 4 or 5 balls keeps the sebs paths and turn.
  function sameMoves(a, b) {
    if (!a.ok || !b.ok) return false;
    if (a.src === b.src) return true;
    function even(q) { return q.digits.every(function (d) { return d === q.digits[0] && d >= 3; }); }
    function moves(q) { return q.dirs + (q.lstart ? 'L' : '') + q.slash + ' ' + q.body.replace(/\s+/g, ' ').trim(); }
    return even(a) && even(b) && moves(a) === moves(b);
  }
  // two-bone arm: shoulder S, hand target T, bone lengths a and b, elbow pointing towards pole
  // the shortest distance between segments p1-q1 and p2-q2
  function segDist(p1, q1, p2, q2) {
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    var d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
    var a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b, s, t;
    s = den > 1e-9 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
    t = (b * s + f) / e;
    if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
    var x = [p1[0] + d1[0] * s - p2[0] - d2[0] * t, p1[1] + d1[1] * s - p2[1] - d2[1] * t, p1[2] + d1[2] * s - p2[2] - d2[2] * t];
    return Math.sqrt(dot(x, x));
  }
  // A smooth loop through points (ts, vs) that repeats every P: a periodic cubic spline, so
  // position, speed and acceleration all join up, with no stops or kinks at the points.
  function periodicSpline(ts, vs, P) {
    var n = ts.length, h = [], i, j, k, dim = vs[0].length, M = [];
    for (i = 0; i < n; i++) h[i] = (i + 1 < n ? ts[i + 1] : ts[0] + P) - ts[i];
    for (k = 0; k < dim; k++) {
      var A = [], b = [];
      for (i = 0; i < n; i++) {
        var row = [], im = (i + n - 1) % n, ip = (i + 1) % n;
        for (j = 0; j < n; j++) row.push(0);
        row[im] += h[im]; row[i] += 2 * (h[im] + h[i]); row[ip] += h[i];
        A.push(row); b.push(6 * ((vs[ip][k] - vs[i][k]) / h[i] - (vs[i][k] - vs[im][k]) / h[im]));
      }
      M.push(solveLinear(A, b));
    }
    return function (t) {
      t = mod(t - ts[0], P) + ts[0];
      var i = n - 1, q, out = [];
      for (q = 0; q < n; q++) if (ts[q] <= t) i = q;
      var ip = (i + 1) % n, hh = h[i], a = t - ts[i], bb = hh - a;
      for (var k = 0; k < dim; k++) {
        var m0 = M[k][i], m1 = M[k][ip];
        out.push(m0 * bb * bb * bb / (6 * hh) + m1 * a * a * a / (6 * hh) + (vs[i][k] / hh - m0 * hh / 6) * bb + (vs[ip][k] / hh - m1 * hh / 6) * a);
      }
      return out;
    };
  }
  function solveLinear(A, b) {      // Gaussian elimination with partial pivoting (small systems)
    var n = b.length, i, j, k;
    A = A.map(function (r) { return r.slice(); }); b = b.slice();
    for (i = 0; i < n; i++) {
      var piv = i;
      for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
      var tr = A[i]; A[i] = A[piv]; A[piv] = tr; var tb = b[i]; b[i] = b[piv]; b[piv] = tb;
      for (j = i + 1; j < n; j++) {
        var f = A[j][i] / A[i][i];
        for (k = i; k < n; k++) A[j][k] -= f * A[i][k];
        b[j] -= f * b[i];
      }
    }
    var x = [];
    for (i = n - 1; i >= 0; i--) { var sm = b[i]; for (j = i + 1; j < n; j++) sm -= A[i][j] * x[j]; x[i] = sm / A[i][i]; }
    return x;
  }
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

  // Filmed paths: a pattern whose arms are best taken straight from the author's own juggling.
  // Backwards sebs mess, from the footage of 2026-11-24 (front, side and from below), made even
  // and the same on both sides, without the body's sway and lean. keys: the right hand at each
  // beat, in the body's own frame (cm: across, + = the juggler's left; up from the shoulder;
  // forward from the chest; and how much the arm is reaching across, 0 to 1, for its elbow);
  // the left hand is its mirror image three beats later. The hands
  // move on a smooth loop through these points. Across and height were measured from the
  // front, averaged over both halves; depth keeps the hands in front of the turned chest, with
  // a hand on its own side catching out beside the body. Every ball is thrown in front and
  // caught further back: the first of each side about 50 cm, the other two about 30 (the author
  // liked the first throw's path and asked for the other two to come back more like it). In words, for the right hand: it
  // throws from just under the other arm's elbow, a little outside and in front of it so the
  // ball goes up in front of that arm, then slips back under that forearm (beat 0; the other arm
  // stays across a moment before sweeping down in front of it), catches out on its own side at chest
  // height, dips low and throws again in the middle, reaches across the chest to catch on the
  // other side, sweeps down low and back to its own side to throw, catches out beside its hip
  // and swings low round to the middle again. turn: the body turns this far, most to the left at
  // beat turnAt and to the right three beats later. pole: which way an elbow points, with the arm
  // on its own side (out, down, a little back) and reaching across (forward, in front of the chest).
  // Forwards sebs mess has no footage: it is built from its own letters (the mills mess at the
  // sides) and the author's description, on the same lines as backwards sebs (heights, elbows,
  // turn). Each half's three balls are thrown at the back of that side and caught in front, so
  // they travel forwards, and no throw goes up between an arm and the body: both of a side's
  // crossed throws are made just outside the other arm's elbow (the author, 2026-11-25). At the
  // first (Ru, the right arm over the left) the left elbow is tucked in by the body and the
  // right hand reaches over to just outside it, at the same height: body, left elbow, right
  // hand. At the third (Ll, the left arm over) the left arm is pulled out in front and a bit
  // across, its elbow towards the middle of the chest, and the right hand throws from under it,
  // just outside that elbow, about in line with the left shoulder. Catches are in front.
  // Keys may carry a sixth number, 0 to 1: how far the elbow is tucked in by the side
  // (poleTuck); reachShoulder: how far a shoulder comes in and forward when the arm reaches
  // across. The points were settled by a search that keeps to that and keeps arms, balls and
  // body clear, the right arm on top where the letters say, and hands smooth.
  // forwardsSebs4, backwardsSebs5 ...: the same patterns with 4 or 5 balls. Each extra ball is
  // caught a beat later, so these move the catches that would otherwise land on the other
  // side: each side's three balls still follow each other in an arc at that side (the
  // author, 2026-11-25). Found by the same search, with the turn free (it comes out smaller,
  // or later, as each side's catches overlap the other side's throws).
  var PATHS = {
    forwardsSebs: {
      period: 6, turn: 31, turnAt: 1.7, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 30.6, -26.5, 6.9, 1, 0], [0.4, 14.5, -24.7, 25.9, 0, 0], [0.8, -17.2, -22.1, 26, 0, 0.43], [1, -35.2, -17.6, 34.3, 0, 0],
             [1.5, 3.2, -32.4, 28.3, 0, 0.28], [2, 19, -35.3, 20, 1, 0], [2.4, -4, -32, 26.8, 0, 0.59], [2.8, 3.3, -27.4, 31.3, 0, 0.31],
             [3, -15.9, -36.8, 33.2, 0, 0.88], [3.5, -12.7, -30.7, 29.6, 0, 0.84], [4, -18.8, -20.7, 16.5, 0, 0], [4.5, -10.7, -26.7, 30, 0, 1],
             [4.8, 11.8, -19.6, 35.3, 0, 0], [5, 12.6, -24.5, 43.5, 0, 0.18], [5.4, 17.8, -21.8, 23.8, 0.4, 0], [5.75, 35.1, -18.2, 10.8, 1, 0.12]]
    },
    backwardsSebs: {
      period: 6, turn: 29, turnAt: 2.85, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6],
      keys: [[0, 13.7, -25.7, 27.3, 0, 0.04], [0.25, 2.3, -34.6, 20.6, 0, 0], [0.5, -15.5, -27.8, 17.7, 0, 0.61], [0.8, -42.8, -19.5, 11.8, 0, 0.23],
             [1, -38.3, -31.5, 8.8, 0, 1], [1.5, -17, -37.6, 18.9, 0, 0], [2, 0.3, -19.8, 28.1, 0.5, 0.5], [2.5, 30.1, -23.3, 17.7, 1, 0.1],
             [2.8, 31.8, -24.5, 23.2, 1, 0.11], [3, 20.6, -23.6, 38.4, 1, 0.16], [3.2, 14.7, -17.1, 31.2, 1, 0.45], [3.5, -11.5, -44.3, 24.5, 0.2, 0.47],
             [4, -13.7, -33.2, 27.3, 0, 0.29], [4.5, -33.3, -14.5, 17.3, 0, 0.82], [4.8, -47.8, -18.9, 13.1, 0, 0.18], [5, -35.4, -12.7, 17.3, 0, 0.09],
             [5.5, -11, -37.9, 34.7, 0, 0]]
    },
    forwardsSebs4: {
      period: 6, turn: 31, turnAt: 2, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 29.7, -27.5, 7, 1, 0.07], [0.4, 3.2, -28.6, 28.6, 0, 0], [0.8, -18.5, -34.9, 29.7, 0, 0.53], [1, -38.4, -12.5, 33.4, 0, 0.54],
             [1.5, 4.4, -30.5, 23.8, 0, 0], [2, 19, -33.9, 20.3, 1, 0.14], [2.4, 9.4, -31.7, 26.9, 0, 0.23], [2.8, -6.2, -32.7, 39.1, 0, 0.81],
             [3, -16.4, -37.9, 33, 0, 1], [3.5, -4, -38.3, 33.4, 0, 0.66], [4, -23.3, -42.1, 17.2, 0, 0.27], [4.5, -5.6, -20.9, 32.2, 0, 0.59],
             [4.8, 27.7, -16.8, 31.6, 0, 0.01], [5, 16.9, -15.2, 38.2, 0, 0], [5.4, 22, -21.7, 24.2, 0.4, 0.09], [5.75, 31.7, -19.1, 12.1, 1, 0.14]]
    },
    forwardsSebs5: {
      period: 6, turn: 27, turnAt: 1.65, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 30.2, -27.4, 7.2, 1, 0], [0.4, 0.6, -28.6, 28.7, 0, 0.42], [0.8, -18.5, -29.7, 27.8, 0, 0.7], [1, -39.9, -13.5, 35.4, 0, 0.25],
             [1.5, 2.4, -29.9, 23.3, 0, 0.04], [2, 19, -34, 20.1, 1, 0.13], [2.4, 1.3, -32.7, 25.6, 0, 0.14], [2.8, -14.4, -31.8, 36.6, 0, 0.38],
             [3, -16.9, -37.9, 32.9, 0, 0.95], [3.5, -4, -34.9, 28.7, 0, 0.65], [4, -22.5, -33.1, 22.6, 0, 0.26], [4.5, -6.5, -22.3, 27, 0, 0.44],
             [4.8, 25.4, -19.4, 32.4, 0, 0], [5, 16.2, -16.3, 38.8, 0, 0], [5.4, 22.3, -23.3, 24.4, 0.4, 0.09], [5.75, 35.3, -20.2, 12, 1, 0.24]]
    },
    backwardsSebs4: {
      period: 6, turn: 38, turnAt: 4.2, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6],
      keys: [[0, 17.5, -30, 35.5, 0, 0], [0.25, -7, -32, 28.1, 0, 0.72], [0.5, -23, -18.6, 15, 0, 0.22], [0.8, -19.7, -31.5, 21.8, 0, 0],
             [1, -31.8, -30.4, 3.8, 0, 0.02], [1.5, -14.9, -44, 14.8, 0, 0], [2, 20.2, -19.9, 40.4, 0.5, 0.2], [2.5, 25, -9.1, 22, 1, 0.27],
             [2.8, 27.9, -27.5, 18.2, 1, 0.19], [3, 21.6, -17.8, 27, 1, 0.01], [3.2, 8.8, -19.5, 30.2, 1, 0.22], [3.5, -6, -45.7, 26, 0.2, 0.04],
             [4, -29.3, -32, 25.7, 0, 1], [4.5, -9.6, -17.1, 33.8, 0, 0.73], [4.8, 12.1, -16, 26, 0, 0], [5, -12.5, -17.9, 24.6, 0, 0.78],
             [5.5, -32.4, -54, 20.2, 0, 0.43]]
    },
    backwardsSebs5: {
      period: 6, turn: 37, turnAt: 4.75, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6],
      keys: [[0, 3.8, -5.3, 36.8, 0, 0.26], [0.25, -10.2, -37.4, 32, 0, 0], [0.5, -12.1, -42.2, 12.5, 0, 0.72], [0.8, -13.8, -23.8, 16.8, 0, 0],
             [1, -21.5, -17.6, -1.4, 0, 0.29], [1.5, -18.3, -50.1, 15.7, 0, 0], [2, 25, -17.4, 34, 0.5, 0.49], [2.5, 15.2, -18.6, 25.2, 1, 0.44],
             [2.8, -5.6, 1, 22.4, 1, 0.6], [3, 13.8, 0.8, 29.7, 1, 0.42], [3.2, 21.4, -21.4, 28.6, 1, 0.28], [3.5, -2.4, -41.9, 21.3, 0.2, 0.28],
             [4, -23.2, -30.3, 35.9, 0, 1], [4.5, 3.9, -16.8, 25.6, 0, 0], [4.8, -0.8, -15, 23.5, 0, 0.15], [5, -31.9, -14.4, 30.1, 0, 0],
             [5.5, -6.9, -28.6, 23.5, 0, 0.19]]
    },
    weaveSebs: {
      period: 6, turn: 50, turnAt: 5.3, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -35.1, -38.1, 38.4, 0, 0.87], [0.4, -0.3, -28.8, 25.9, 0, 0], [0.8, 17.5, -17.8, 20.2, 1, 0.41], [1.05, 27.4, -7.1, 16.6, 1, 0.39],
             [1.4, 26.6, -31.2, 23.9, 0.4, 0.05], [1.8, 28.7, -23.3, 33.7, 0, 0], [2, 26.8, -27.3, 33.3, 0, 0.46], [2.3, 11.4, -32.1, 36.6, 0, 0.51],
             [2.8, 5.2, -11.5, 23.2, 0, 0], [3.3, 6.3, -44.1, 37, 0, 0.48], [3.8, -10.1, -22.6, 42.4, 0, 0.93], [4, -8, -28, 47.8, 0, 1],
             [4.4, -7.6, -52, 31.7, 0, 0.21], [4.8, -8.9, -58.1, 27.6, 1, 0], [5.3, -1.7, -42.2, 32.3, 0, 0.41], [5.8, -45.6, -23.2, 31.4, 0, 0.26]]
    },
    flippedFlosSebs: {
      period: 6, turn: 24, turnAt: 4.6, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6],
      keys: [[0, -38.1, -31.6, 0.8, 0, 0], [0.3, -20.7, -34.5, 15.4, 0, 0.09], [0.55, 0.5, -32.5, 18, 0, 0], [0.8, 18.2, -26.3, 32.6, 0, 0],
             [1.3, 0.9, -40.6, 21.3, 0, 0], [1.8, -32.3, -16.4, 20, 0, 0], [2, -38.8, -21, 19, 0, 0], [2.3, -24.7, -9.8, 19.8, 0, 0.37],
             [2.8, -11.4, -27.5, 33.1, 0, 0], [3.3, -4.5, -36.5, 16, 0.2, 0.07], [3.6, 13.3, -18.8, 28.4, 1, 0.17], [3.8, 17.7, -9.5, 26.8, 1, 0],
             [4, 28.4, -12.7, 18.9, 1, 0.19], [4.3, 26.2, -23.9, 15.4, 1, 0.23], [4.8, 4.2, -20, 32.4, 0.5, 0.49], [5.3, -21, -43, 16.9, 0, 0],
             [5.8, -22.9, -30.4, 3.1, 0, 0.21]]
    },
    weaveSebs4: {
      period: 6, turn: 36, turnAt: 5.65, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -19, -38.4, 35, 0, 0], [0.4, 0.2, -32.4, 26.8, 0, 0], [0.8, 14.3, -14.3, 22.1, 1, 0.52], [1.05, 21.8, -8, 17.9, 1, 0.36],
             [1.4, 37.6, -19, 20.6, 0.4, 0], [1.8, 22.7, -33.4, 33.9, 0, 0.49], [2, 24.9, -28.5, 35, 0, 0.89], [2.3, 13.8, -31.2, 37.5, 0, 0.28],
             [2.8, -3.6, -18.4, 22.6, 0, 0], [3.3, -0.8, -44.6, 34.3, 0, 0.21], [3.8, -6.1, -16.2, 49.3, 0, 0.84], [4, -1.1, -28.4, 47.5, 0, 1],
             [4.4, 1.7, -52.3, 27.4, 0, 0], [4.8, -16.6, -62.7, 15.7, 1, 0.03], [5.3, -1.8, -43.3, 38.6, 0, 0], [5.8, -38.6, -29.7, 20.4, 0, 1]]
    },
    weaveSebs5: {
      period: 6, turn: 27, turnAt: 5.25, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -10, -19.2, 46.7, 0, 0.54], [0.4, 8.1, -35.9, 28.3, 0, 0.3], [0.8, 11.8, -23.3, 25, 1, 0.5], [1.05, 30.8, -11, 24.2, 1, 0.46],
             [1.4, 24.2, -32.3, 29.3, 0.4, 0], [1.8, 22.6, -26.4, 37, 0, 0.75], [2, 26, -17.8, 38.6, 0, 0.34], [2.3, 12.6, -23.6, 36.7, 0, 0.43],
             [2.8, 16.6, 5.8, 17.9, 0, 0], [3.3, -10.9, -37.3, 31.8, 0, 0.84], [3.8, -9.4, -31.7, 28.4, 0, 0.83], [4, -9.4, -19.1, 42, 0, 0.85],
             [4.4, -5.4, -42.9, 35, 0, 0.55], [4.8, -15.6, -25.1, 15.9, 1, 0.9], [5.3, -4.9, -35.2, 42.3, 0, 0.74], [5.8, -17.4, -28.2, 25.5, 0, 0.07]]
    },
    flippedFlosSebs4: {
      period: 6, turn: 24, turnAt: 4.8, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6],
      keys: [[0, -39.8, -37.8, 4.2, 0, 0], [0.3, -18.9, -30.6, 16.7, 0, 0], [0.55, -0.7, -29.7, 18.5, 0, 0.1], [0.8, 15, -25.3, 32.3, 0, 0],
             [1.3, 4.2, -35.1, 24.9, 0, 0], [1.8, -19.7, -15.9, 20.8, 0, 0.47], [2, -35.9, -22.4, 20.8, 0, 0.05], [2.3, -19.5, -6.7, 18.4, 0, 0.87],
             [2.8, -2.3, -27.5, 36.2, 0, 0], [3.3, -4.4, -33.3, 16, 0.2, 0.23], [3.6, 13.3, -12.9, 28.8, 1, 0.17], [3.8, 17.3, -9.2, 30.3, 1, 0],
             [4, 26.9, -12.9, 19.5, 1, 0.19], [4.3, 24.4, -19.7, 14.9, 1, 0.23], [4.8, -19.2, -12.1, 23.4, 0.5, 0.56], [5.3, -33.4, -39.8, 15.9, 0, 0.4],
             [5.8, -20.2, -39.3, 5.2, 0, 0]]
    },
    flippedFlosSebs5: {
      period: 6, turn: 20, turnAt: 3.8, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8],
      keys: [[0, -37, -30, 4, 0], [0.3, -28, -28, 8, 0], [0.55, -1, -32, 18, 0], [0.8, 18, -19, 26, 0],
             [1.3, -19, -52, 15, 0], [1.8, -40, -26, 14, 0], [2, -33, -17, 11, 0], [2.3, -38, -16, 17, 0],
             [2.8, 2, -30, 33, 0], [3.3, -10, -51, 26, 0.2], [3.6, 20, -22, 29, 1], [3.8, 28, -18, 28, 1],
             [4, 35, -14, 14, 1], [4.3, 25, -15, 26, 1], [4.8, -14, -18, 32, 0.5], [5.3, -10, -43, 16, 0],
             [5.8, -34, -28, 1, 0]]
    },
    // Flipped sebs mess (2026-11-26): the first of the flipped family at the sides, a best guess
    // from all the author's rules: started from the front flipped mess turned to each side (so the
    // right arm is on top where the letters say), then searched so no throw goes up between an
    // arm and the body (crossed throws outside the other arm's elbow), hands in front of the elbows
    // at every catch, each side's three balls in one arc and one plane, travelling forwards. Then,
    // at the author's wish, turned further (about 48) with a longer arc starting further back.
    flippedSebs: {
      period: 6, turn: 48, turnAt: 1.05, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 25.1, -36.2, 20.8, 1, 0], [0.4, 10.2, -28.7, 40.7, 1, 0.83], [0.8, -32.6, -22.9, 20.1, 0, 0.74], [1.2, -9.9, -25.5, 28.2, 0, 0],
             [1.6, 4.2, -15.1, 28.9, 1, 0.09], [2, 31.8, -14.6, 18.7, 1, 0.16], [2.4, 13.4, -11.9, 38.6, 1, 0.11], [2.8, 18.4, -9.6, 35.1, 1, 0.03],
             [3.2, 7.3, -11.6, 45.5, 1, 0.4], [3.6, 7, -19.1, 31.5, 0, 0.47], [4, -20.2, -46.6, 29.2, 0, 0.77], [4.4, -2.1, -24.3, 38.6, 0, 0.57],
             [4.8, 14.9, -29.1, 42.2, 1, 0.62], [5.2, 5.1, -23.2, 38.7, 1, 0.54], [5.6, 19.3, -24.6, 42.1, 1, 0.29]]
    },
    trFlippedSebs: {
      period: 6, turn: 31, turnAt: 4.25, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -0.8, -6.6, 56.8, 0, 0.97], [0.4, 5.1, -40.3, 45, 1, 0.86], [0.8, 30.3, -38.5, 16.5, 1, 0.22], [1.2, 22.5, -33.4, 28.3, 1, 0.25],
             [1.6, 11.8, -29, 33.1, 1, 0.6], [2, 13.7, -12.6, 57.4, 1, 0], [2.4, -12.9, -21.9, 37.5, 0, 0], [2.8, -27.8, -33.1, 20.7, 0, 0.12],
             [3.2, -3.7, -18.5, 46.4, 0, 0.98], [3.6, 9.5, -23.3, 36.3, 1, 0.6], [4, -15.5, -12.2, 54.7, 1, 0.1], [4.4, -6.9, -19.8, 38.9, 1, 0.7],
             [4.8, 11.6, 3.7, 34.6, 1, 0.32], [5.2, -4.8, -5.9, 52.6, 1, 1], [5.6, 9, -26.2, 27.2, 0, 0.27]]
    },
    flosSebs: {
      period: 6, turn: 38, turnAt: 4.3, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -29.7, -25.8, 16.5, 0, 0.83], [0.4, -10.9, -17.2, 35.5, 0, 0.67], [0.8, 26.4, -16.6, 26.1, 1, 0.23], [1.2, 4, -3, 41.7, 1, 0.04],
             [1.6, -12.5, -17.4, 40.2, 0, 0.29], [2, -29, -28.8, 22.7, 0, 0], [2.4, -13.9, -15.9, 34, 0, 0.51], [2.8, -8.2, -25.5, 39.7, 0, 0.34],
             [3.2, -6.4, -25.8, 33.9, 0, 0.72], [3.6, 8.7, -30, 33.2, 1, 0.55], [4, 24.1, -31, 29.6, 1, 0.21], [4.4, 21.8, -28.5, 32.9, 1, 0.58],
             [4.8, -14.6, -15.4, 40.9, 0, 0], [5.2, -18.4, -29.7, 32.5, 0, 0], [5.6, -13.4, -25.5, 34.4, 0, 0.72]]
    },
    trFlosSebs: {
      period: 6, turn: 45, turnAt: 1.85, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 27.5, -14.6, 39.2, 1, 0.22], [0.4, -12, -14.4, 35.8, 0, 1], [0.8, -30.8, -22.7, 7.8, 0, 0], [1.2, -20.6, -26.8, 28.4, 0, 0.77],
             [1.6, -18.8, -34.3, 43.6, 0, 0.37], [2, -18.5, -25.2, 49.9, 0, 1], [2.4, 22, -28.5, 40.2, 1, 0], [2.8, 19.2, -46.4, 23.2, 1, 0.03],
             [3.2, 12, -34.4, 35.6, 1, 0], [3.6, 2.5, -14.9, 34.3, 0, 0.51], [4, 2.5, -30.2, 47.9, 0, 0.07], [4.4, -4.7, -17.9, 35.9, 0, 0.89],
             [4.8, -14.6, -21.2, 25.6, 0, 0.58], [5.2, -9.9, -18.2, 43.9, 0, 0.48], [5.6, -10.6, -16.3, 20.2, 1, 0.69]]
    },
    hecticMillsSebs: {
      period: 6, turn: 27, turnAt: 1.65, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 29.9, -34.9, 17.9, 1, 0], [0.4, 16.3, -32.4, 31.5, 1, 0.4], [0.8, -20.6, -22.4, 39.8, 0, 0.85], [1.2, -5.3, -25.3, 34.1, 0, 0.72],
             [1.6, 8.6, -27.9, 32.9, 1, 0.46], [2, 23, -32.2, 26.4, 1, 0.11], [2.4, 6.1, -20.8, 21.9, 1, 0], [2.8, 4.3, -15, 46.4, 1, 0.16],
             [3.2, 5.1, -15.5, 37, 1, 0.05], [3.6, -0.8, -20.2, 37.1, 0, 0], [4, -24.6, -25.9, 25.5, 0, 0], [4.4, -9.7, -15.4, 35, 0, 0.22],
             [4.8, 11.6, -16.3, 50.2, 1, 0.38], [5.2, 14, -16, 37, 1, 0], [5.6, 11.1, -26.4, 36.1, 1, 0.41]]
    },
    hecticFlippedSebs: {
      period: 6, turn: 31, turnAt: 1.3, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 26.7, -17.3, 24, 1, 0.28], [0.4, 13, -16.3, 35.6, 1, 0.59], [0.8, -30, -26.5, 41.5, 0, 1], [1.2, -4, -25.9, 35.7, 0, 0.1],
             [1.6, 12.7, -14.4, 38.7, 1, 0.17], [2, 16.1, -6, 29.2, 1, 0], [2.4, -13.4, -19.2, 18.6, 0, 0], [2.8, 8, -21.8, 42.9, 1, 0.26],
             [3.2, 4.8, -31.7, 38.1, 1, 0.74], [3.6, 6, -28, 34.5, 0, 0.23], [4, -21.4, -24.8, 26.9, 0, 1], [4.4, -10.7, -27.8, 33.5, 0, 0.68],
             [4.8, 15.2, -25.3, 49.3, 1, 0.46], [5.2, 13.3, -16.5, 36.9, 1, 0.54], [5.6, 30.5, -9.7, 36.6, 1, 0.08]]
    },
    hecticFlosSebs: {
      period: 6, turn: 41, turnAt: 4.25, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -23.1, -31.1, 12.5, 0, 0], [0.4, 24.8, -1.1, 33.4, 0, 0.32], [0.8, 16.7, -15.7, 41.9, 1, 0], [1.2, 1.6, -30.8, 46.9, 0, 1],
             [1.6, -9.3, -19.5, 40.3, 0, 0.86], [2, -19.7, -26.8, 18.3, 0, 1], [2.4, -8.1, -5.3, 31.4, 0, 0.77], [2.8, -12.8, -30.5, 43.1, 0, 0.19],
             [3.2, -2.6, -25.8, 40.2, 0, 0.18], [3.6, -9.5, -20, 17.7, 0, 0.11], [4, 18.2, -0.4, 24.1, 1, 0], [4.4, 3.1, -10.3, 31.6, 1, 0.61],
             [4.8, -9.1, -25.6, 39.6, 0, 0.21], [5.2, -27.6, -17.5, 31.1, 0, 1], [5.6, -29.8, -16.4, 5, 0, 0]]
    },
    hecticFlippedFlosSebs: {
      period: 6, turn: 44, turnAt: 4.3, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -25.5, -30.4, 12.3, 0, 0], [0.4, 25.7, -5.7, 37, 0, 0.39], [0.8, 19.3, -15.1, 31.4, 1, 0.02], [1.2, 1.6, -23.7, 46.9, 0, 1],
             [1.6, -6.7, -21.3, 33, 0, 0.68], [2, -17.7, -22.4, 26.7, 0, 0.71], [2.4, -13, -10.3, 32.7, 0, 0.5], [2.8, -11.3, -21.3, 37.9, 0, 0.65],
             [3.2, -2.6, -18.4, 39.7, 0, 0.14], [3.6, -4.5, -20.6, 19.1, 0, 0.29], [4, 18.2, -7.1, 26.8, 1, 0], [4.4, 8.4, -15.1, 27.4, 1, 0.61],
             [4.8, -13.2, -21.3, 38, 0, 0], [5.2, -27.4, -21.2, 42.1, 0, 1], [5.6, -31.9, -21.5, 14.6, 0, 0]]
    },
    trHecticMillsSebs: {
      period: 6, turn: 45, turnAt: 6.05, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -29.7, -19.3, 36.2, 0, 0.04], [0.4, 5.4, -34.3, 26, 1, 0.26], [0.8, 19.7, -37.2, 29.4, 1, 0.29], [1.2, 17.6, -24.2, 37.3, 1, 0],
             [1.6, 7.4, -15.9, 37, 1, 0.07], [2, 11.6, -16.1, 43.3, 1, 0.17], [2.4, -3.5, -20.9, 34.3, 0, 0.45], [2.8, -22.1, -26.5, 31.9, 0, 0.91],
             [3.2, 7.1, -20.6, 34.5, 0, 0.25], [3.6, 6.2, -19.6, 37.1, 1, 0.6], [4, 15.3, -14.7, 39, 1, 0], [4.4, 7.1, -19.2, 22.1, 1, 0],
             [4.8, 27.7, -36.7, 22.7, 1, 0.12], [5.2, 10.5, -28.6, 34, 1, 0.62], [5.6, -13, -28.5, 31.1, 0, 0]]
    },
    trHecticFlippedSebs: {
      period: 6, turn: 33, turnAt: 5.5, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, -27, -26.5, 44.7, 0, 1], [0.4, 12.3, -16.4, 35.5, 1, 0.52], [0.8, 27.6, -16.9, 24.3, 1, 0.3], [1.2, 26.9, -8.4, 35.7, 1, 0],
             [1.6, 11.8, -17, 36.7, 1, 0.77], [2, 15.7, -25.7, 49.3, 1, 0.23], [2.4, -10.8, -28.1, 33.5, 0, 0.69], [2.8, -21, -24.7, 28.6, 0, 0.98],
             [3.2, 5, -28.1, 34.5, 0, 0.26], [3.6, 4.8, -31.3, 38.7, 1, 0.61], [4, 7.9, -22.6, 43.5, 1, 0.46], [4.4, -13, -18.3, 20.6, 0, 0],
             [4.8, 15, -5.7, 31.2, 1, 0.09], [5.2, 12.6, -14.5, 38.7, 1, 0.17], [5.6, -4.3, -25.9, 35.7, 0, 0.48]]
    },
    trHecticFlosSebs: {
      period: 6, turn: 39, turnAt: 2.9, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 22.9, -30.6, 38, 1, 0.51], [0.4, 4.1, -4.9, 45.3, 0, 0.05], [0.8, -41.8, -25.1, 24.4, 0, 0.06], [1.2, -24, -12.9, 25.3, 0, 0.45],
             [1.6, -32.8, -21.8, 43.3, 0, 0.47], [2, -20.6, -29.6, 38.7, 0, 0.01], [2.4, 24.6, -2.6, 27.8, 1, 0.21], [2.8, 21.6, -3.7, 32.3, 1, 0.84],
             [3.2, -1.5, -7.6, 24.6, 0, 0], [3.6, -3.1, -35.8, 25.2, 0, 0.58], [4, -8.3, -30.1, 43, 0, 0], [4.4, -14.9, -8.1, 20.2, 0, 0.66],
             [4.8, -46.9, -27.1, 20.1, 0, 0.15], [5.2, -11.2, -26, 30.9, 0, 0.86], [5.6, -0.8, -34.1, 28.5, 0, 0.55]]
    },
    trHecticFlippedFlosSebs: {
      period: 6, turn: 37, turnAt: 2.9, pole: [0.7,  -1,  -0.15], poleFar: [0.1,  -0.8,  0.8], poleTuck: [0.2,  -1,  -0.6], reachShoulder: [2,  5],
      keys: [[0, 17.1, -30.3, 33.4, 1, 0.05], [0.4, 3.9, -5.5, 44.7, 0, 0], [0.8, -40.1, -15.9, 27.8, 0, 0], [1.2, -14.6, -8.4, 22.4, 0, 1],
             [1.6, -27.9, -23.2, 32.7, 0, 1], [2, -19.5, -33.8, 36.8, 0, 0.26], [2.4, 22.8, -5.4, 34.2, 1, 0.07], [2.8, 24.6, -0.3, 33, 1, 0.84],
             [3.2, -2.2, -7.2, 24.7, 0, 0.34], [3.6, -4.7, -29.9, 22.4, 0, 0.45], [4, -5.8, -23.6, 44.9, 0, 0], [4.4, -10.9, -9, 31.4, 0, 0.6],
             [4.8, -47.2, -31.2, 19.9, 0, 0.2], [5.2, -7.1, -26.4, 30.8, 0, 0.82], [5.6, 3, -24.2, 35.1, 0, 0]]
    },
    // Side plane (the author, 2026-11-26): the cascade at the sides. The middle of the front
    // pattern becomes the front of a side and the outside the back, so each throw goes across the
    // body diagonally, from the front of the thrower's side to the back of the other (the reverse
    // cascade: back to front), and the body turns towards each throw.
    cascadeSide: {
      period: 2, turn: 41, turnAt: 1.25, pole: [0.7, -1, -0.15], poleFar: [0.1, -0.8, 0.8], poleTuck: [0.2, -1, -0.6], reachShoulder: [2, 5],
      keys: [[0, -10, -25, 40, 0, 0], [0.4, -25, -15, 25, 0, 0], [0.8, -35, -15, 6, 0, 0], [1.4, -22, -35, 20, 0, 0]]
    },
    reverseCascadeSide: {
      period: 2, turn: 45, turnAt: 1.35, pole: [0.7, -1, -0.15], poleFar: [0.1, -0.8, 0.8], poleTuck: [0.2, -1, -0.6], reachShoulder: [2, 5],
      keys: [[0, -35, -25, 5, 0, 0], [0.4, -25, -15, 25, 0, 0], [0.8, -10, -15, 40, 0, 0], [1.4, -22, -35, 22, 0, 0]]
    }
  };

  // The patterns, as written in the article (typos settled with the author on 2026-11-20).
  var PATTERNS = [
    // In the author's menu order (2026-11-25): the mills family first, then the cascades and
    // half messes, then the appendices. Within a group, the article's order.
    { group: 'Mills messes (3:3)', name: 'Mills mess', src: 'o/ Ru Ul Ll : Lu Ur Rr' },
    { group: 'Mills messes (3:3)', name: 'Flipped mess', src: 'o/ Lu Ur Rr : Ru Ul Ll' },
    { group: 'Mills messes (3:3)', name: 'Flos mess', src: 'o\\ Ur Ru Uu : Ul Lu Uu' },
    { group: 'Mills messes (3:3)', name: 'Flipped flos mess', src: 'o\\ Ul Lu Uu : Ur Ru Uu' },
    { group: 'Mills messes (3:3)', name: 'TR mills mess', src: '3 i\\ Ur Rr Ru : Ul Ll Lu' },
    { group: 'Mills messes (3:3)', name: 'TR flipped mess', src: '3 i\\ Ul Ll Lu : Ur Rr Ru' },
    { group: 'Mills messes (3:3)', name: 'TR flos mess', src: '3 i/ Ru Uu Ul : Lu Uu Ur' },
    { group: 'Mills messes (3:3)', name: 'TR flipped flos mess', src: '3 i/ Lu Uu Ur : Ru Uu Ul' },
    { group: 'Hectic messes', name: 'Hectic mills', src: 'o/ Lu Ul Lr : Ru Ur Rl' },
    { group: 'Hectic messes', name: 'Hectic flipped mess', src: 'o/ Ru Ur Rl : Lu Ul Lr' },
    { group: 'Hectic messes', name: 'Hectic flos mess', src: 'o\\ Ul Ru Uu : Ur Lu Uu' },
    { group: 'Hectic messes', name: 'Hectic flipped flos mess', src: 'o\\ Ur Lu Uu : Ul Ru Uu' },
    { group: 'Hectic messes', name: 'TR hectic mills', src: '3 i\\ Ul Lr Ru : Ur Rl Lu' },
    { group: 'Hectic messes', name: 'TR hectic flipped mess', src: '3 i\\ Ur Rl Lu : Ul Lr Ru' },
    { group: 'Hectic messes', name: 'TR hectic flos mess', src: '3 i/ Lu Uu Ul : Ru Uu Ur' },
    { group: 'Hectic messes', name: 'TR hectic flipped flos mess', src: '3 i/ Ru Uu Ur : Lu Uu Ul' },
    { group: 'Side plane messes', name: "Mills mess (Forwards sebs)", src: 'o\\ Ru Ul Ll : Lu Ur Rr', turn: 45, path: 'forwardsSebs' },
    { group: 'Side plane messes', name: "Flipped mess", src: 'o\\ Lu Ur Rr : Ru Ul Ll', turn: 45, path: 'flippedSebs', fixedBalls: "The flipped sebs mess is built for 3 balls so far." },
    { group: 'Side plane messes', name: "Flos mess", src: 'o/ Ur Ru Uu : Ul Lu Uu', turn: 45, path: 'flosSebs', fixedBalls: "Built for 3 balls so far." },
    { group: 'Side plane messes', name: "Flipped flos mess", src: 'o/ Ul Lu Uu : Ur Ru Uu', turn: 45, path: 'flippedFlosSebs' },   // (the flipped flos mess at the sides: backwards sebs played backwards)
    { group: 'Side plane messes', name: "TR mills mess (Weave)", src: '3 i/ Ur Rr Ru : Ul Ll Lu', turn: 45, path: 'weaveSebs' },   // (the TR mills mess at the sides, the author's Weave: forwards sebs played backwards)
    { group: 'Side plane messes', name: "TR flipped mess", src: '3 i/ Ul Ll Lu : Ur Rr Ru', turn: 45, path: 'trFlippedSebs', fixedBalls: "Built for 3 balls so far." },
    { group: 'Side plane messes', name: "TR flos mess", src: '3 i\\ Ru Uu Ul : Lu Uu Ur', turn: 45, path: 'trFlosSebs', fixedBalls: "Built for 3 balls so far." },
    { group: 'Side plane messes', name: "TR flipped flos mess (Backwards sebs)", src: '3 i\\ Lu Uu Ur : Ru Uu Ul', turn: 45, path: 'backwardsSebs' },   // (TR flipped flos mess at the sides; like forwards sebs, the opposite slash tells it apart)
    // (the hectic messes at the sides: not in the menu, reached with the Side plane button from a
    // hectic mess; the author, 2026-11-26)
    { group: 'Side plane messes', name: "Hectic mills", src: 'o\\ Lu Ul Lr : Ru Ur Rl', turn: 45, path: 'hecticMillsSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },   // (best guesses, 2026-11-26: each searched with all the side plane rules, from its front mess turned to each side or a time reversed relative)
    { group: 'Side plane messes', name: "Hectic flipped mess", src: 'o\\ Ru Ur Rl : Lu Ul Lr', turn: 45, path: 'hecticFlippedSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "Hectic flos mess", src: 'o/ Ul Ru Uu : Ur Lu Uu', turn: 45, path: 'hecticFlosSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "Hectic flipped flos mess", src: 'o/ Ur Lu Uu : Ul Ru Uu', turn: 45, path: 'hecticFlippedFlosSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "TR hectic mills", src: '3 i/ Ul Lr Ru : Ur Rl Lu', turn: 45, path: 'trHecticMillsSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "TR hectic flipped mess", src: '3 i/ Ur Rl Lu : Ul Lr Ru', turn: 45, path: 'trHecticFlippedSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "TR hectic flos mess", src: '3 i\\ Lu Uu Ul : Ru Uu Ur', turn: 45, path: 'trHecticFlosSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Side plane messes', name: "TR hectic flipped flos mess", src: '3 i\\ Ru Uu Ur : Lu Uu Ul', turn: 45, path: 'trHecticFlippedFlosSebs', fixedBalls: "Built for 3 balls so far.", hidden: true },
    { group: 'Turns', name: 'Full Turn 4:4', src: 'Ru Uu Ur Rr : Lu Uu Ul Ll', spin: -360, spinAt: 0, fixedBalls: "Full Turn 4:4 is built for 3 balls so far." },   // (the author, 2026-11-26: a windmill on one side for 4 beats, then the other, turning right round once a cycle; first throw, right hand, turning to the front)
    { group: "Rubenstein's Revenges", name: "Rubenstein's Revenge", src: '22335 o/ Ru. Ul. Lu Ul Ll : Lu. Ur. Ru Ur Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "TR Rubenstein's Revenge", src: '52233 i\\ Ul Lu. Ur. Rr Ru : Ur Ru. Ul. Ll Lu', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "Flos Rubenstein's Revenge", src: '52233 o\\ Ul Lu. Ur. Ru Uu : Ur Ru. Ul. Lu Uu', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "TR flos Rubenstein's Revenge", src: '33522 i/ Lu Uu Ul Lu. Ur. : Ru Uu Ur Ru. Ul.', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "Alt Rubenstein's Revenge", src: '35223 o/ Ru Ur Ru. Ul. Ll : Lu Ul Lu. Ur. Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "TR alt Rubenstein's Revenge", src: '35223 i\\ Ur Rr Ru. Ul. Lu : Ul Ll Lu. Ur. Ru', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "22317 Rubenstein's Revenge", src: '22317 o/ Ru. Ul. L U(u)l Ll : Lu. Ur. R U(u)r Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },   // (the other 223 Rubens siteswaps in the Rubenstein's frame, 2026-11-25)
    { group: "Rubenstein's Revenges", name: "4 ball 22367 Rubenstein's Revenge", src: '22367 o/ Ru. Ul. Lu Ul Ll : Lu. Ur. Ru Ur Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "4 ball 22385 Rubenstein's Revenge", src: '22385 o/ Ru. Ul. Lu Ul Ll : Lu. Ur. Ru Ur Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Rubenstein's Revenges", name: "Hectic Rubenstein's Revenge, change-overs on the 3s", src: '22335 o/ Ru. Ul. Lr Rl Ll : Lu. Ur. Rl Lr Rr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },   // (hectic Rubens, 2026-11-25: the double loop kept, change-overs as in the hectic mills mess)
    { group: "Rubenstein's Revenges", name: "Hectic Rubenstein's Revenge, change-over on the 5", src: '22335 o/ Ru. Ul. Lu Ur Rl : Lu. Ur. Ru Ul Lr', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Mike's messes", name: "Mike's mess", src: '225 o/ Ru. Ul. Ll : Lu. Ur. Rr', turn: 30, fixedBalls: "Mike's messes work with their own siteswaps only, so the ball count can't be changed (the 3 and 4 ball ones are listed separately).", fixedCycle: "Mike's mess keeps its siteswap where it is: the 2 2 loop sits on an R U L." },   // (moved from Appendix B; with the 4 ball one and the flipped ones, 2026-11-25)
    { group: "Mike's messes", name: "Flipped Mike's mess", src: '225 o/ Lu. Ur. Rr : Ru. Ul. Ll', turn: 30, fixedBalls: "Mike's messes work with their own siteswaps only, so the ball count can't be changed (the 3 and 4 ball ones are listed separately).", fixedCycle: "Mike's mess keeps its siteswap where it is: the 2 2 loop sits on an R U L." },
    { group: "Mike's messes", name: "4 ball Mike's mess", src: '228 o/ Ru. Ul. Ll : Lu. Ur. Rr', turn: 30, fixedBalls: "Mike's messes work with their own siteswaps only, so the ball count can't be changed (the 3 and 4 ball ones are listed separately).", fixedCycle: "Mike's mess keeps its siteswap where it is: the 2 2 loop sits on an R U L." },
    { group: "Mike's messes", name: "4 ball flipped Mike's mess", src: '228 o/ Lu. Ur. Rr : Ru. Ul. Ll', turn: 30, fixedBalls: "Mike's messes work with their own siteswaps only, so the ball count can't be changed (the 3 and 4 ball ones are listed separately).", fixedCycle: "Mike's mess keeps its siteswap where it is: the 2 2 loop sits on an R U L." },
    { group: 'Other mills mess extensions and variations', name: 'Mills mess with windmill (5bt mills with extra windmills)', src: 'o/ Ru Ul Lu Ul Ll : Lu Ur Ru Ur Rr' },
    { group: 'Other mills mess extensions and variations', name: 'Mills mess with extra crossed arms', src: 'o/ Ru Ul Ll : Ll : Ll : Lu Ur Rr : Rr : Rr' },
    { group: 'Other mills mess extensions and variations', name: 'Mills mess with shower', src: '44133 o/ Ru U U(u)u Ul Ll : Lu U U(u)u Ur Rr' },
    { group: 'Other mills mess extensions and variations', name: '3 ball Boston mess', src: '3 I/ Uu Uu Ur : Rr Rr Ru : Uu Uu Ul : Ll Ll Lu' },
    { group: 'Other mills mess extensions and variations', name: '4 ball Boston mess', src: '4 I/ Uu Uu Ul Lu : Uu Uu Ur Ru' },
    { group: 'Siteswap messes', name: '4 ball mills mess', src: '4 o/ Ru Ul Ll : Lu Ur Rr' },
    { group: 'Siteswap messes', name: '423 mills mess', src: '423 o/ Ru Ul. Ll : Lu Ur. Rr' },
    { group: 'Siteswap messes', name: '414 mills mess', src: '414 o/ R U(u)l Ll : L U(u)r Rr' },
    { group: 'Siteswap messes', name: '234 flos mess', src: '234 o\\ Ur. Ru Uu : Ul. Lu Uu' },
    { group: 'Butterfly messes', name: 'Butterfly basic mess Opp1', src: '3 ioo\\ Ru - Ul Ll : Lu - Ur Rr' },
    { group: 'Butterfly messes', name: 'Butterfly basic mess Opp1,2', src: '3 iio\\ Ru Ul - Ll : Lu Ur - Rr' },
    { group: 'Butterfly messes', name: 'Butterfly basic mess Opp2', src: '3 oio/ Ru - Ul - Ll : Lu - Ur - Rr' },
    { group: 'Butterfly messes', name: 'Butterfly basic mess Opp2,3', src: '3 oii/ Ru - Ul Ll : Lu - Ur Rr' },
    { group: 'Butterfly messes', name: 'Butterfly basic mess Opp3', src: '3 ooi/ Ru Ul - Ll : Lu Ur - Rr' },
    { group: 'Butterfly messes', name: 'Butterfly flipped mess Opp1', src: '3 ioo\\ Lu - Ur Rr : Ru - Ul Ll' },
    { group: 'Butterfly messes', name: 'Butterfly flipped mess Opp1,2', src: '3 iio\\ Lu Ur - Rr : Ru Ul - Ll' },
    { group: 'Butterfly messes', name: 'Butterfly flipped mess Opp2', src: '3 oio/ Lu - Ur - Rr : Ru - Ul - Ll' },
    { group: 'Butterfly messes', name: 'Butterfly flipped mess Opp2,3', src: '3 oii/ Lu - Ur Rr : Ru - Ul Ll' },
    { group: 'Butterfly messes', name: 'Butterfly flipped mess Opp3', src: '3 ooi/ Lu Ur - Rr : Ru Ul - Ll' },
    { group: 'Butterfly messes', name: 'Butterfly TR basic mess Opp1', src: '3 oii\\ Ur - Rr Ru : Ul - Ll Lu' },
    { group: 'Butterfly messes', name: 'Butterfly TR basic mess Opp1,2', src: '3 ooi\\ Ur Rr - Ru : Ul Ll - Lu' },
    { group: 'Butterfly messes', name: 'Butterfly TR basic mess Opp2', src: '3 ioi\\ Ur - Rr - Ru : Ul - Ll - Lu' },
    { group: 'Butterfly messes', name: 'Butterfly TR basic mess Opp2,3', src: '3 ioo\\ Ur - Rr Ru : Ul - Ll Lu' },
    { group: 'Butterfly messes', name: 'Butterfly TR basic mess Opp3', src: '3 iio\\ Ur Rr - Ru : Ul Ll - Lu' },
    { group: 'Butterfly messes', name: 'Butterfly TR flipped mess Opp1', src: '3 oii\\ Ul - Ll Lu : Ur - Rr Ru' },
    { group: 'Butterfly messes', name: 'Butterfly TR flipped mess Opp1,2', src: '3 ooi\\ Ul Ll - Lu : Ur Rr - Ru' },
    { group: 'Butterfly messes', name: 'Butterfly TR flipped mess Opp2', src: '3 ioi\\ Ul - Ll - Lu : Ur - Rr - Ru' },
    { group: 'Butterfly messes', name: 'Butterfly TR flipped mess Opp2,3', src: '3 ioo\\ Ul - Ll Lu : Ur - Rr Ru' },
    { group: 'Butterfly messes', name: 'Butterfly TR flipped mess Opp3', src: '3 iio\\ Ul Ll - Lu : Ur Rr - Ru' },
    { group: 'Basic cascades', name: 'Cascade', src: 'i/ Uu : Uu', side: 'cascadeSide' },
    { group: 'Basic cascades', name: 'Reverse cascade', src: 'o\\ Uu : Uu', side: 'reverseCascadeSide' },
    { group: 'Basic cascades', name: 'Half shower', src: 'Oi\\ Uu Uu', fixedBalls: "Half shower is juggled with 3 balls only: with 4 it is a different siteswap." },
    { group: 'Basic cascades', name: 'Tennis', src: 'Oii\\ Uu : Uu', fixedBalls: "Tennis is juggled with 3 balls only: it doesn't work with 4." },
    { group: 'Basic cascades', name: 'Crossed arm cascade', src: 'Rr : Rr' },
    { group: 'Basic cascades', name: 'Clockwise windmill (under throws)', src: 'Lu Ul' },
    { group: 'Basic cascades', name: 'Clockwise flipped windmill (under catches)', src: 'Ru Ur' },
    { group: 'Basic cascades', name: 'Anticlockwise windmill (under throws)', src: 'Ur Ru' },
    { group: 'Basic cascades', name: 'Anticlockwise flipped windmill (under catches)', src: 'Ul Lu' },
    { group: 'Basic cascades', name: 'Continuous under-arm catches', src: 'Ul : Ur' },
    { group: 'Basic cascades', name: 'Continuous under-arm throws', src: 'Lu : Ru' },
    { group: 'Half messes (2:2)', name: 'Half mess', src: 'o/ Ru Uu : Ur Rr' },
    { group: 'Half messes (2:2)', name: 'Half mess, left arm on top', src: 'o/ Lu Uu : Ul Ll' },
    { group: 'Half messes (2:2)', name: 'Half mess, left hand starts', src: 'oL\\ Lu Uu : Ul Ll' },
    { group: 'Half messes (2:2)', name: 'Half mess, left arm on top, left hand starts', src: 'oL\\ Ru Uu : Ur Rr' },
    { group: 'Half messes (2:2)', name: 'Inside half mess', src: '3 i/ Ru Uu : Ur Rr' },
    { group: 'Half messes (2:2)', name: 'Inside half mess, left arm on top', src: '3 i/ Lu Uu : Ul Ll' },
    { group: 'Half messes (2:2)', name: 'Inside half mess, left hand starts', src: '3 iL\\ Lu Uu : Ul Ll' },
    { group: 'Half messes (2:2)', name: 'Inside half mess, left arm on top, left hand starts', src: '3 iL\\ Ru Uu : Ur Rr' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Alternating half mess', src: 'o/ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Alternating half mess, left arm first', src: 'o/ Lu Uu : Ur Rr : Ru Uu : Ul Ll' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Alternating half mess, left hand starts', src: 'oL\\ Lu Uu : Ur Rr : Ru Uu : Ul Ll' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Alternating half mess, left arm first, left hand starts', src: 'oL\\ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Inside alternating half mess', src: '3 i/ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Inside alternating half mess, left arm first', src: '3 i/ Lu Uu : Ur Rr : Ru Uu : Ul Ll' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Inside alternating half mess, left hand starts', src: '3 iL\\ Lu Uu : Ur Rr : Ru Uu : Ul Ll' },
    { group: 'Alternating half messes (2:2:2:2)', name: 'Inside alternating half mess, left arm first, left hand starts', src: '3 iL\\ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Less than half a mess', name: 'Less than half a mess (1:1:1:1)', src: 'Rr : Rl : Ll : Lr' },
    { group: 'Less than half a mess', name: 'Less than half a mess, left hand starts', src: 'L\\ Ll : Lr : Rr : Rl' },
    { group: 'Less than half a mess', name: 'Alternating less than half a mess (1:1:1:1:1:1)', src: 'Rr : Rr : Rl : Ll : Ll : Lr' },
    { group: 'Appendix B: windmills', name: 'Under throw windmill', src: 'O/ Lu Ul' },
    { group: 'Appendix B: windmills', name: 'Under catch windmill', src: 'O/ Ru Ur' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill', src: 'O/ Ru Ul Lu Ur' },
    { group: 'Appendix B: windmills', name: 'Flip flop flos mess', src: 'o\\ Ul Lu Ur Ru Uu : Ur Ru Ul Lu Uu' },
    { group: 'Appendix B: windmills', name: 'Under throw 4233 windmill', src: '4233 O/ Lu Ul. Lu Ul' },
    { group: 'Appendix B: windmills', name: '34233 flos mess', src: '34233 o\\ Ur Ru Ur. Ru Uu : Ul Lu Ul. Lu Uu' },
    { group: 'Appendix B: windmills', name: 'Under throw 342T3 windmill', src: '342T3 O/ Lu Ul Lu Ul' },
    { group: 'Appendix B: windmills', name: '342T33 mills mess', src: '342T33 o/ Ru Ul Lu Ul Ll : Lu Ur Ru Ur Rr' },
    { group: 'Appendix B: windmills', name: '5223 alternating windmill', src: '5223 O\\ Ur Ru. Ul. Lu' },
    { group: 'Appendix B: windmills', name: 'Under throw windmill with shower', src: '4413 O\\ Ul L U(u)l Lu' },
    { group: 'Appendix B: windmills', name: 'Under catch windmill with shower', src: '4413 O\\ Ur R U(u)r Ru' },
    { group: 'Appendix B: windmills', name: '44133 flos mess', src: '44133 o\\ Ur R U(u)r Ru Uu : Ul L U(u)l Lu Uu' },
    { group: 'Appendix B: windmills', name: '44133 flipped flos mess', src: '44133 o\\ Ul L U(u)l Lu Uu : Ur R U(u)r Ru Uu' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill with showers', src: '4413 O\\ Ur R U(u)l Lu Ul L U(u)r Ru' },
    { group: 'Appendix B: windmills', name: 'Alternating windmill with showers mess', src: '441344133 o\\ Ur R U(u)l Lu Ul L U(u)r Ru Uu : Ul L U(u)r Ru Ur R U(u)l Lu Uu' },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "Rubenstein's Revenge, butterfly loop", src: '22335 o/ Lu. Ur. Ru Ur Rr : Ru. Ul. Lu Ul Ll', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "TR Rubenstein's Revenge, butterfly loop", src: '52233 i\\ Ur Ru. Ul. Ll Lu : Ul Lu. Ur. Rr Ru', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "Alt Rubenstein's Revenge, butterfly loop", src: '35223 o/ Lu Ul Lu. Ur. Rr : Ru Ur Ru. Ul. Ll', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "TR alt Rubenstein's Revenge, butterfly loop", src: '35223 i\\ Ul Ll Lu. Ur. Ru : Ur Rr Ru. Ul. Lu', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "Flos Rubenstein's Revenge, butterfly loop", src: '52233 o\\ Ur Ru. Ul. Lu Uu : Ul Lu. Ur. Ru Uu', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." },
    { group: "Appendix C: butterfly loop Rubenstein's", name: "TR flos Rubenstein's Revenge, butterfly loop", src: '33522 i/ Ru Uu Ur Ru. Ul. : Lu Uu Ul Lu. Ur.', fixedBalls: "Rubenstein's Revenge works with its own siteswap only, so the ball count can't be changed.", fixedCycle: "Rubenstein's Revenge keeps its siteswap where it is: the 2 2 3 double loop sits on an R U L." }
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
    return { ok: true, src: src0.replace(dirs + '/', dirs + (m.slashSeen || '/')) };
  }
  function groupSizes(p) {
    var g = [];
    p.tokens.forEach(function (t) { g[t.group] = (g[t.group] || 0) + 1; });
    return g;
  }
  function tokenText(t, c, hold) { return t + c + (hold ? '.' : ''); }
  function noOnes(p) { return p.digits.every(function (d) { return d !== 1; }); }

  // Writes a pattern's notation again with new siteswap digits, keeping everything else as it
  // was written (directions, L start, slash, sides, dashes): a 2 that is held gets its dot, and a
  // 1 gets its brackets, the throw before it losing its own catch letter (the 1's catcher's).
  // If the digits don't fit the letters evenly, the letters are written out again until they do.
  function compose(p, digits, active) {
    var N = p.tokens.length, D = digits.length, L = N % D === 0 ? N : lcm(N, D);
    if (digits.every(function (x) { return x === 2; })) active = digits.map(function () { return true; });   // (all 2s are thrown: no dots)
    function tk(j) { return p.tokens[mod(j, N)]; }
    function dg(j) { return digits[mod(j, D)]; }
    var parts = [], lastGroup = null;
    for (var j = 0; j < L; j++) {
      var t = tk(j), d = dg(j), round = Math.floor(j / N);
      var g = round + ':' + t.group;
      if (lastGroup !== null && g !== lastGroup) parts.push(':');
      else if (t.dash && j) parts.push('-');
      lastGroup = g;
      var text = t.t + (d === 1 ? '(' + tk(j - 1).c + ')' : '') + (dg(j + 1) === 1 ? '' : t.c) + (d === 2 && !active[mod(j, D)] ? '.' : '');
      parts.push(text);
    }
    var same = digits.every(function (x) { return x === digits[0]; });
    var head;
    if (same && digits[0] === 2) head = '2';
    else if (same) head = digits[0] === 3 && !p.head ? '' : String(digits[0]);
    else head = digits.map(function (x, i) { return x + (x === 2 && active[i] ? 'T' : ''); }).join('');
    var lead = p.slash || p.lstart ? p.dirs + (p.lstart ? 'L' : '') + p.slash : (p.dirs !== 'o' ? p.dirs : '');
    var src = [head, lead, parts.join(' ')].filter(Boolean).join(' ').replace(/ ([\/\\|]) /, '$1 ');
    src = src.replace(/([oiOIL]+)? ?([\/\\|]) /, function (m0, dd, sl) { return (dd || '') + sl + ' '; });
    var m = build(src, { noReverse: true });
    if (!m.ok) return { ok: false, error: m.error };
    return { ok: true, src: m.parsed.src };
  }
  // compose, then give it the slash its first throw calls for (pointing to the side that throw peaks on)
  function composeSlashed(np, digits, active) {
    var r = compose(np, digits, active);
    if (!r.ok) return r;
    var mm = build(r.src, { noReverse: true });
    if (mm.ok && mm.slashSeen && mm.slashSeen !== np.slash) {
      var np2 = {}; for (var k in np) np2[k] = np[k];
      np2.slash = mm.slashSeen;
      var r2 = compose(np2, digits, active);
      if (r2.ok) return r2;
    }
    return r;
  }
  // Cycle the siteswap: the digits move along one throw against the letters, so a different
  // throw leads the arc (the article: a 423 mills can also be done as a 234 or a 342 mills)
  function cycleSiteswap(src) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    var p = m.parsed, d = p.digits;
    // (a Rubenstein's or Mike's keeps its siteswap where it is: its 2 2 sit on the R U of an R U L)
    var fixedC = PATTERNS.filter(function (pt) { return pt.fixedCycle && parse(pt.src).src === p.src; })[0];
    if (fixedC) return { ok: false, error: fixedC.fixedCycle };
    if (d.every(function (x) { return x === d[0]; })) return { ok: false, error: 'Nothing to cycle: every throw is a ' + d[0] + '.' };
    return compose(p, d.slice(1).concat(d[0]), p.active.slice(1).concat(p.active[0]));
  }
  // Add (or take away) balls: the same number is added to every digit, which always gives a
  // siteswap that works, with that many more balls. The letters stay as they are.
  function addBalls(src, k) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    // some patterns only work with their own ball count (half shower, tennis: the author, 2026-11-25)
    var fixed = PATTERNS.filter(function (pt) { return pt.fixedBalls && parse(pt.src).src === m.parsed.src; })[0];
    if (fixed) return { ok: false, error: fixed.fixedBalls };
    var p = m.parsed, d = p.digits.map(function (x) { return x + k; });
    if (d.some(function (x) { return x < 1; })) return { ok: false, error: 'Can\'t take a ball away: a throw would become a 0, and empty hands aren\'t in the simulator yet.' };
    if (d.some(function (x) { return x > 9; })) return { ok: false, error: 'That would need a throw higher than 9.' };
    var nb = d.reduce(function (a, b) { return a + b; }, 0) / d.length;
    if (k > 0 && nb > G.maxBalls) return { ok: false, error: 'The simulator goes up to ' + G.maxBalls + ' balls.' };
    return compose(p, d, d.map(function (x, i) { return x === 2 && p.active[i] && k === 0; }));
  }

  // Time reverse (Appendix C): played backwards, each catch becomes a throw and each throw a
  // catch. "3 o| Af Ba Cb : Dc Ed Fe" becomes "3 i| Fa Ef De : Cd Bc Ab": the new pair q is the
  // old pair -q turned round, and each new throw is on the side of the ball it throws (the old
  // throw that landed there: with 3s, the old throw -q-1, as that example shows). Each hand keeps its own moves. The ball leaving a new throw is
  // the one that landed there, so it keeps that old throw's height; inside and outside swap.
  // Works with 1s, held and thrown 2s, dashes, columns and an L start.
  function timeReverse(src) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    var p = m.parsed, N = p.tokens.length, D = p.digits.length, P = m.period, R = p.dirs.length;
    var swap = { o: 'i', i: 'o', O: 'O', I: 'I' };
    function act(i) { return !!p.active[mod(i, D)]; }
    function incomingTo(k) {   // (a held 2 "lands" where it was, so it is its own incoming throw)
      for (var i = k - 10; i <= k + 1; i++) if (i + m.digit(i) - 2 === k) return i;
      return null;
    }
    var L = P, toks = [], digits = [], active = [], dirs = [], grp = [];
    for (var q = 0; q < L; q++) {
      var k = mod(-q, P), old = p.tokens[mod(k, N)], inc = incomingTo(k);
      var d = m.digit(inc);
      toks.push({ t: old.c.toUpperCase(), c: old.t.toLowerCase() });
      digits.push(d); active.push(d === 2 && act(inc));
      dirs.push(swap[p.dirs[mod(inc, R)]]);
      grp.push(Math.floor(mod(inc, P) / N) * 1000 + p.tokens[mod(inc, N)].group);   // (a reversed throw is on the side of the ball it throws)
    }
    // start at the first side change that falls on a right-hand throw (or the first one at all)
    var start = 0, starts = [];
    for (q = 0; q < L; q++) if (grp[q] !== grp[mod(q - 1, L)]) starts.push(q);
    var even = starts.filter(function (x) { return x % 2 === 0; });
    if (even.length) start = even.indexOf(0) >= 0 ? 0 : even[0];
    function rot(a) { return a.slice(start).concat(a.slice(0, start)); }
    toks = rot(toks); digits = rot(digits); active = rot(active); dirs = rot(dirs); grp = rot(grp);
    // the smallest repeat of the digits, directions and letters
    function period(a, eq) { for (var n = 1; n <= a.length; n++) { if (a.length % n) continue; var ok = true; for (var i = n; i < a.length && ok; i++) ok = eq(a[i], a[i - n]); if (ok) return n; } return a.length; }
    var Dn = period(digits.map(function (x, i) { return x + (active[i] ? 'T' : ''); }), function (a, b) { return a === b; });
    var Rn = period(dirs, function (a, b) { return a === b; });
    var Nn = period(toks.map(function (t, i) { return t.t + t.c + '|' + (grp[i] !== grp[mod(i - 1, L)]); }), function (a, b) { return a === b; });
    Nn = Math.max(Nn, Math.min(N, L)); if (L % Nn) Nn = L;
    var g = 0, tokens = [];
    for (q = 0; q < Nn; q++) {
      if (q && grp[q] !== grp[q - 1]) g++;
      var dash = q > 0 && grp[q] === grp[q - 1] && dirs[q] !== dirs[q - 1] && /[io]/.test(dirs[q] + dirs[q - 1]) && Rn > 1;
      tokens.push({ t: toks[q].t, c: toks[q].c, group: g, dash: dash });
    }
    var dirStr = dirs.slice(0, Rn).join('');
    var anyIn = /i/.test(dirStr);
    var np = { tokens: tokens, dirs: dirStr, lstart: p.lstart, slash: '/', head: anyIn ? '3' : p.head };
    np.slash = '/';
    return composeSlashed(np, digits.slice(0, Dn), active.slice(0, Dn));
  }

  // Flip: swap right and left in every letter; everything else stays as written
  function flip(src) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    var p = m.parsed, sw = { R: 'L', L: 'R', U: 'U', r: 'l', l: 'r', u: 'u' };
    var np = {}; for (var k in p) np[k] = p[k];
    np.tokens = p.tokens.map(function (t) { var c = {}; for (var q in t) c[q] = t[q]; c.t = sw[t.t]; c.c = sw[t.c]; if (t.br) c.br = sw[t.br]; return c; });
    return p.slash ? composeSlashed(np, p.digits, p.active) : compose(np, p.digits, p.active);
  }

  // Mirror image: the right hand does what the left did and the other way round, with right
  // and left swapped in the letters too (clockwise becomes anticlockwise, right arm on top
  // becomes left arm on top). Written by swapping the letters and starting with the other hand
  // (the L start); if it's the same pattern either way round, the L is left off.
  function mirror(src) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return m;
    var p = m.parsed, sw = { R: 'L', L: 'R', U: 'U', r: 'l', l: 'r', u: 'u' };
    var np = {}; for (var k in p) np[k] = p[k];
    np.tokens = p.tokens.map(function (t) { var c = {}; for (var q in t) c[q] = t[q]; c.t = sw[t.t]; c.c = sw[t.c]; if (t.br) c.br = sw[t.br]; return c; });
    np.lstart = !p.lstart;
    if (!np.slash) np.slash = '/';
    var r = composeSlashed(np, p.digits, p.active);
    if (!r.ok) return r;
    if (np.lstart) {   // (no need for the L if starting with the right hand gives the same pattern)
      var plain = {}; for (var k2 in np) plain[k2] = np[k2];
      plain.lstart = false; plain.slash = p.slash;
      var r2 = p.slash ? composeSlashed(plain, p.digits, p.active) : compose(plain, p.digits, p.active);
      if (r2.ok && sameKey(r2.src) === sameKey(r.src)) r = r2;
    }
    if (sameKey(r.src) === sameKey(src)) return { ok: false, error: 'This pattern is its own mirror image.' };
    return r;
  }

  // Appendix C: move the first throw and catch to the end, then switch the red letters (the first
  // throw and last catch of each half) between crossed and uncrossed; the digits rotate too
  function millsFlos(src) {
    var m = build(src);
    if (!m.ok) return m;
    var p = m.parsed;
    // (an inside pattern: convert the pattern it's the time reverse of, then reverse back)
    if (/^i+$/.test(p.dirs)) {
      var r1 = timeReverse(src), r2 = r1.ok ? millsFlos(r1.src) : r1;
      return r2.ok ? timeReverse(r2.src) : r2;
    }
    if (!noOnes(p)) return { ok: false, error: 'Mills/flos conversion does not handle 1s yet.' };
    var N = p.tokens.length, gs = groupSizes(p);
    if (p.dirs !== 'o' || gs.length < 2 || p.lstart || gs.some(function (x) { return x < 2; }))
      return { ok: false, error: 'Appendix C\'s mills/flos conversion is for outside patterns made of halves on each side, like the mills and flos messes.' };
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

  // Mills or flos? (Appendix C: in an outside mills mess each half starts and ends with a crossed
  // throw, in a flos mess with an uncrossed one.) An inside pattern goes by the pattern it's the
  // time reverse of. Anything else (cascades, windmills, half messes, butterflies...) is neither.
  function family(src, depth) {
    var m = build(src, { noReverse: true });
    if (!m.ok) return null;
    var p = m.parsed;
    if (/^i+$/.test(p.dirs) && !depth) { var r = timeReverse(src); return r.ok ? family(r.src, 1) : null; }
    if (!/^[oi]+$/.test(p.dirs)) return null;   // (the butterflies, mixing o and i, go by their letters)
    function judge(groups) {
      groups = groups.filter(function (g) { return g.length >= 2; });
      if (groups.length < 2) return null;
      var ends = groups.map(function (g) { return [g[0] !== 'U', g[g.length - 1] !== 'U']; });
      if (ends.every(function (e) { return e[0] && e[1]; })) return 'mills';
      if (ends.every(function (e) { return !e[0] && !e[1]; })) return 'flos';
      return null;
    }
    // as written...
    var groups = [], cur = null;
    p.tokens.forEach(function (t) { if (!cur || cur.g !== t.group) { cur = { g: t.group, ts: [] }; groups.push(cur); } cur.ts.push(t.t); });
    var f = judge(groups.map(function (g) { return g.ts; }));
    if (f) return f;
    // ...or, for a pattern written in two halves, split into equal halves from any right-hand
    // throw (so where the colon was put, as in a time reverse, doesn't matter)
    var T = p.tokens.map(function (t) { return t.t; }), N = T.length;
    if (groups.length !== 2 || N % 2 || N < 4) return null;
    for (var r = 0; r < N; r += 2) {
      var rot = T.slice(r).concat(T.slice(0, r));
      f = judge([rot.slice(0, N / 2), rot.slice(N / 2)]);
      if (f) return f;
    }
    return null;
  }

  // the same pattern? (same throws, catches, heights and directions, from any right-hand start)
  function sameKey(src) {
    var m = build(src);
    if (!m.ok) return null;
    var p = m.parsed, P = m.period, seq = [];
    for (var j = 0; j < P; j++) {
      var tk = p.tokens[j % p.tokens.length];
      seq.push(tk.t + (tk.br || '') + tk.c + m.digit(j) + (p.active[j % p.digits.length] ? 'T' : '') + p.dirs[j % p.dirs.length]);
    }
    // (compared from every right-hand throw: in a pattern that starts with the left hand,
    // those are the odd ones)
    var best = null;
    for (var r = p.lstart ? 1 : 0; r < P; r += 2) {
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

  var PH = { G: G, parse: parse, build: build, ik: ik, PATTERNS: PATTERNS, PATHS: PATHS, sameMoves: sameMoves,
             timeReverse: timeReverse, flip: flip, millsFlos: millsFlos, sameKey: sameKey, findPattern: findPattern,
             cycleSiteswap: cycleSiteswap, addBalls: addBalls, compose: compose, mirror: mirror, family: family };
  if (typeof module !== 'undefined' && module.exports) module.exports = PH;
  root.PH = PH;
})(typeof window !== 'undefined' ? window : this);
