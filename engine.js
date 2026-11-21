/* Pretzel Hand engine: reads a Pretzel Hand notation string and works out,
   for any moment, where both hands, elbows, shoulders and balls are.

   Units are centimetres and beats. The juggler faces the audience along +z.
   The juggler's right side is world -x, so from the front the right arm is
   on the viewer's left, as in the article.

   Timing: throw j happens at beat j (right hand on even j), and the same
   hand catches half a beat later. So every half beat there is one event:
   throw, catch, throw, catch... A ball thrown as a 3 lands a beat and a
   half later and is thrown again a beat and a half after that.

   Arm states come straight from the letters: R = arms crossed with the
   right arm on top, L = crossed with the left arm on top, U = uncrossed.
   Throw letters give the state at the throw, catch letters at the catch.
   Crossed means both hands are on the other side of the body. */
(function (root) {
  'use strict';

  var G = {
    shoulderX: 19, shoulderY: 138, shoulderZ: 0,
    upper: 32, fore: 32,            // shoulder to elbow, elbow to hand centre
    handZ: 22,                      // how far in front of the body the hands work
    outU: 23, outX: 18.2, outUnder: 16, inner: 2.8,   // throw/catch distance from the middle
    crossMin: 7,                    // a crossed hand is at least this far over
    throwY: 119, catchY: 127, scoopY: 113,
    topZ: 0, topY: 0, botZ: -4.1, botY: 0,    // how far the top arm sits over the other
    topElbow: [17.3, 127.7, 15.9], botElbow: [31.4, 109.6, 7], elbowEarly: 0.9, topFloor: 128, botCap: 113.2, underDrop: 8, underFwd: 6.6, underOut: 2, underWin: 0.4, nearIn: 21.8, nearOut: 33.7,
    dipLead: 0.2, dipFrac: 0.35, underCatch: 0.1, minArc: 12, graze: 1, underZMax: 33, oneFlight: 0.25, tempoK: 0.8, compress: 0.71,   // the most a ball or arm may brush another arm, in cm
    drive: 0.22, follow: 0.1, settle: 0.18, give: 0.15, giveBack: 0.3, underStroke: 0.5, catchGive: 0.4, maxStroke: 110, elbowOut: 0.4, elbowFwd: -0.05,
    handR: 4.1, foreR: 3.1, upperR: 3.7, ballR: 3.3,
    bps: 3.5,                       // beats per second at full speed (the article's Juggling Lab setting)
    g: 980
  };
  var OWN = [-1, 1];                // own side of hand 0 (right) and hand 1 (left)

  function lcm(a, b) { var x = a, y = b; while (y) { var t = y; y = x % y; x = t; } return a / x * b; }
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
  function build(src) {
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
    // goes only a little higher than a 3 (a 5 in Rubenstein's Revenge peaks about head height).
    // Each ball still follows a smooth arc, with the gravity that gives it that height.
    var F0 = (Math.max(3, balls) - 1.5) / BPS;
    function gFor(F) {
      if (F <= F0) return G.g;
      var h = G.g * F0 * F0 / 8 * Math.pow(F / F0, G.compress);
      return 8 * h / (F * F);
    }

    // which throw lands at catch k (null for a held ball)
    var incoming = [];
    for (j = 0; j < P; j++) incoming[j] = null;
    for (j = 0; j < P; j++) if (flies(j)) incoming[mod(j + nOf(j) - 2, P)] = j;
    // when each catch happens: half a beat after that hand's throw, except that a 1 is
    // caught by the other hand a moment after it is thrown ("throw, throw, catch, catch")
    function catchTime(k) {
      var inc = incoming[mod(k, P)];
      var base = k + 0.5;
      if (inc !== null && nOf(inc) === 1) return base + (G.oneFlight + 0.5);   // = the 1's throw time + oneFlight
      return base;
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
      return [x, G.catchY, G.handZ];
    }

    // key positions of each hand: at its own throws and catches, and in between (at the
    // other hand's events) drifting along its path but kept on the side the arms state says
    var keys = [[], []];
    events.forEach(function (ev, i) {
      keys[ev.hand].push({ t: ev.t, i: i, pos: ev.part === 'throw' ? throwKey(ev.j) : catchKey(ev.j), own: true });
    });
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
        keys[h].push({ t: ev.t, i: i, pos: [x, G.scoopY, G.handZ], own: false });
      });
      keys[h].sort(function (u, v) { return u.t - v.t; });
    }

    // smooth path through a hand's keys (Catmull-Rom with uneven spacing)
    function baseHand(h, tb) {
      var K = keys[h], M = K.length, t = mod(tb, P), i = M - 1;
      for (var q = 0; q < M; q++) if (K[q].t <= t) i = q;
      function kt(q) { return K[mod(q, M)].t + Math.floor(q / M) * P; }
      function kp(q) { return K[mod(q, M)].pos; }
      var i1 = t < K[0].t ? -1 : i;
      var t0 = kt(i1 - 1), t1 = kt(i1), t2 = kt(i1 + 1), t3 = kt(i1 + 2);
      var p0 = kp(i1 - 1), p1 = kp(i1), p2 = kp(i1 + 1), p3 = kp(i1 + 2);
      var dt = t2 - t1, u = dt > 0 ? (t - t1) / dt : 0, out = [0, 0, 0];
      for (var c = 0; c < 3; c++) {
        var m1 = (p2[c] - p0[c]) / (t2 - t0) * dt, m2 = (p3[c] - p1[c]) / (t3 - t1) * dt;
        out[c] = herm(p1[c], m1, p2[c], m2, u);
      }
      return out;
    }
    // nearest crossed state before/after an event, for when both ends are uncrossed
    function crossedNear(i, dir) {
      for (var k = 1; k <= E; k++) { var v = events[mod(i + dir * k, E)].st; if (v) return v; }
      return 0;
    }
    // which arm is over: +1 right, -1 left
    function overSign(tb) {
      var i = eventAt(tb), t1 = evTimes[i], t2 = evTime(i + 1), t = mod(tb, P);
      if (t < t1) t += P;
      var f = t2 > t1 ? (t - t1) / (t2 - t1) : 0;
      var a = events[i].st, b = events[mod(i + 1, E)].st;
      if (a && b) return a === b ? a : a + (b - a) * smooth(0, 1, f);
      if (a) return a;
      if (b) return b;
      var pa = crossedNear(i, -1), pb = crossedNear(i + 1, 1);
      return pa + (pb - pa) * smooth(0, 1, f);
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
        best = Math.max(best, (1 - smooth(0, G.underWin, d)) * list[i].w);
      }
      return best;
    }

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
      var El = ik(S, P0, G.upper, G.fore, pole);
      El.shoulder = S;
      return El;
    }

    // the throwing movement: before each throw the hand dips with the ball, drives up and
    // lets go while moving at the ball's own speed, then follows through and settles. On a
    // catch the hand gives a little along the ball's path. Worked out from each ball's real
    // launch and landing speeds, taken from the movement without these strokes (the strokes
    // are zero at the moments of throws and catches, so both agree there).
    var strokes = null;
    function buildStrokes() {
      strokes = [[], []];
      for (var j = 0; j < P; j++) {
        if (!flies(j)) continue;
        var h = handOf(j), k = j + nOf(j) - 2, tc = catchTime(k), F = (tc - j) / BPS;
        var a = pose(j, true).hands[h], b = pose(tc, true).hands[handOf(k)];
        var gg = gFor(F);
        var v = [(b[0] - a[0]) / F, (b[1] - a[1]) / F + gg * F / 2, (b[2] - a[2]) / F];   // cm/s at release
        var vl = [v[0], v[1] - gg * F, v[2]];                                              // cm/s at the catch
        var sc = Math.min(1, G.maxStroke / Math.max(1, v[1] / BPS));
        var under = underThrows[h].some(function (u) { return u.t === j; }) ? G.underStroke : 1;
        strokes[h].push({ t: j, catch: false, v: v.map(function (x) { return x / BPS * sc * under; }) });
        strokes[handOf(k)].push({ t: tc, catch: true, v: vl.map(function (x) { return x / BPS * G.catchGive; }) });
      }
    }
    function strokeAt(h, tb) {
      if (!strokes) buildStrokes();
      var o = [0, 0, 0], list = strokes[h];
      for (var i = 0; i < list.length; i++) {
        var st = list[i], tau = mod(tb - st.t + P / 2, P) - P / 2, f = 0;
        if (!st.catch) {
          var T0 = G.dipLead, T1 = G.drive, T2 = G.follow, T3 = G.settle;
          if (tau >= -T1 - T0 && tau < -T1) f = -T1 * G.dipFrac * smooth(0, 1, (tau + T1 + T0) / T0);
          else if (tau >= -T1 && tau < 0) f = herm(-T1 * G.dipFrac, 0, 0, T1, (tau + T1) / T1);
          else if (tau >= 0 && tau < T2) f = herm(0, T2, T2 * 0.5, 0, tau / T2);
          else if (tau >= T2 && tau < T2 + T3) f = T2 * 0.5 * (1 - smooth(0, 1, (tau - T2) / T3));
        } else {
          var Tc = G.give, Tr = G.giveBack;
          if (tau >= 0 && tau < Tc) f = herm(0, Tc, Tc * 0.5, 0, tau / Tc);
          else if (tau >= Tc && tau < Tc + Tr) f = Tc * 0.5 * (1 - smooth(0, 1, (tau - Tc) / Tr));
        }
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
    function armInBody(El) {
      var d = sinkInto(El.hand, G.handR);
      for (var q = 0; q <= 4; q++) {
        var f = q / 4, pt = [El.elbow[0] + (El.hand[0] - El.elbow[0]) * f, El.elbow[1] + (El.hand[1] - El.elbow[1]) * f, El.elbow[2] + (El.hand[2] - El.elbow[2]) * f];
        d = Math.max(d, sinkInto(pt, G.foreR));
      }
      return d;
    }

    function pose(tb, plain) {
      var R = baseHand(0, tb), L = baseHand(1, tb);
      var overlap = smooth(-26, -6, R[0] - L[0]);
      var w = overSign(tb) * overlap;          // >0: right arm on top
      var hands = [R, L], out = { w: w, hands: [], elbows: [], shoulders: [], reach: 0 };
      // the top arm first, so the bottom hand can reach under its elbow
      var order = w >= 0 ? [0, 1] : [1, 0];
      var topEl = null;
      order.forEach(function (h) {
        var top = Math.max(0, h === 0 ? w : -w), bot = Math.max(0, h === 0 ? -w : w);
        var P0 = hands[h].slice();
        // when the arms cross, the top hand works in a high band and the bottom hand in a
        // low band (just above its elbow), so the top forearm passes well over the other
        P0[1] += top * (Math.max(P0[1], G.topFloor) - P0[1]) + bot * (Math.min(P0[1], G.botCap) - P0[1]);
        P0[1] += top * G.topY + bot * G.botY;
        P0[2] += top * G.topZ + bot * G.botZ;
        if (bot > 0 && topEl) {
          var e = topEl.elbow;
          // an under-the-arm throw is made just below and slightly in front of the top arm's elbow
          var u = underPull(h, tb) * bot;
          if (u > 0) {
            var tgt = [e[0] + OWN[1 - h] * G.underOut, e[1] - G.underDrop, e[2] + G.underFwd];
            for (var c = 0; c < 3; c++) P0[c] += (tgt[c] - P0[c]) * u;
          }
          // near the top arm's elbow, the bottom hand passes in front of it, never behind
          var near = (1 - smooth(G.nearIn, G.nearOut, Math.hypot(P0[0] - e[0], P0[1] - e[1]))) * bot;
          var front = e[2] + G.underFwd;
          if (near > 0 && P0[2] < front) P0[2] += (front - P0[2]) * near;
        }
        if (!plain) { var so = strokeAt(h, tb); for (var c2 = 0; c2 < 3; c2++) P0[c2] += so[c2]; }
        var El = arm(h, P0, top, bot);
        // the body pushes the arm out: if the hand or forearm would sink into the torso or
        // hips, move the hand forward just enough to clear, and work the arm out again
        for (var pass = 0; pass < 3; pass++) {
          var dep = armInBody(El);
          if (dep <= 0) break;
          P0[2] += dep * 1.15 + 0.3;
          El = arm(h, P0, top, bot);
        }
        if (top > 0) topEl = El;
        out.hands[h] = El.hand; out.elbows[h] = El.elbow; out.shoulders[h] = El.shoulder; out.reach = Math.max(out.reach, El.reach);
      });
      return out;
    }

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
            var a = ballOn(pose(j).hands[hand]), bpt = ballOn(pose(tc).hands[handOf(k)]);
            var F = (tc - j) / bps, tau = (tb - j) / bps, gg = gFor(F);
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

    function at(tb) {
      var ps = pose(tb);
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
      var F = (tc - j) / bps, gs = gFor(F), vy = (b0[1] - a0[1]) / F + gs * F / 2, tp = Math.min(F, vy / gs);
      var xp = a0[0] + (b0[0] - a0[0]) * tp / F;
      slashSeen = xp < 0 ? '/' : '\\';
      break;
    }

    return {
      ok: true, parsed: p, balls: balls, period: P, loop: loop, events: E, eventTimes: evTimes.slice(), at: at, pose: pose,
      tokens: p.tokens, slashSeen: slashSeen, notes: notes, maxN: maxN, bps: BPS, catchTime: catchTime, digit: nOf
    };
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
    { group: 'Flos messes', name: 'Flos mess', src: 'o/ Ur Ru Uu : Ul Lu Uu' },
    { group: 'Flos messes', name: 'Flipped flos mess', src: 'o/ Ul Lu Uu : Ur Ru Uu' },
    { group: 'Flos messes', name: 'TR flos mess', src: '3 i\\ Ru Uu Ul : Lu Uu Ur' },
    { group: 'Flos messes', name: 'TR flipped flos mess', src: '3 i\\ Lu Uu Ur : Ru Uu Ul' },
    { group: 'Extras (first try)', name: 'Half mess', src: 'o\\ Ru Uu : Ur Rr' },
    { group: 'Extras (first try)', name: 'Alternating half mess', src: 'o\\ Ru Uu : Ul Ll : Lu Uu : Ur Rr' },
    { group: 'Extras (first try)', name: 'Mills mess with windmill', src: 'o\\ Ru Ul Ll Ul Lu : Lu Ur Rr Ur Rr' },
    { group: 'Extras (first try)', name: '4 ball mills mess', src: '4 o\\ Ru Ul Ll : Lu Ur Rr' },
    { group: 'Extras (first try)', name: '423 mills mess', src: '423 o\\ Ru Ul. Ll : Lu Ur. Rr' },
    { group: 'Extras (first try)', name: '234 flos mess', src: '234 o/ Ur. Ru Uu : Ul. Lu Uu' },
    // main article, siteswap 1s (U(u) is a 1, caught straight away by the other hand)
    { group: 'Showers (siteswap 1s)', name: '414 mills mess', src: '414 o\\ R U(u)l Ll : L U(u)r Rr' },
    { group: 'Showers (siteswap 1s)', name: 'Mills mess with shower', src: '44133 o\\ Ru U U(u)u Ul Ll : Lu U U(u)u Ur Ru' },
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
    var m = build(src0);
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
    var m = build(src);
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
