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
    handZ: 31,                      // how far in front of the body the hands work
    outU: 23, outX: 16, outUnder: 30, inner: 4,   // throw/catch distance from the middle
    crossMin: 7,                    // a crossed hand is at least this far over
    throwY: 119, catchY: 127, scoopY: 113,
    topZ: 14, topY: 0, botZ: -17.2, botY: 0,    // how far the top arm sits over the other
    topElbow: [24.2, 126, 24.3], botElbow: [18, 110, 5.6], elbowEarly: 0.7, topFloor: 133, botCap: 111.1, underDrop: 8, underFwd: 8.9, underOut: 4.2, underWin: 0.5, nearIn: 16.7, nearOut: 21, elbowOut: 0.4, elbowFwd: -0.05,
    handR: 4.3, foreR: 3.4, upperR: 4.2, ballR: 3.6,
    bps: 2.8,                       // beats per second at full speed
    g: 980
  };
  var OWN = [-1, 1];                // own side of hand 0 (right) and hand 1 (left)

  function lcm(a, b) { var x = a, y = b; while (y) { var t = y; y = x % y; x = t; } return a / x * b; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function stateSign(ch) { ch = ch.toUpperCase(); return ch === 'R' ? 1 : ch === 'L' ? -1 : 0; }

  // ---------- reading the notation ----------
  function parse(src) {
    var s = String(src).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
    var m = s.match(/^([0-9T\[\]]*)\s*([oiOIL]*)\s*([\/\\|])\s*(.*)$/);
    if (!m) return { ok: false, error: 'Expected something like "o\\ Ru Ul Ll : Lu Ur Rr".' };
    var head = m[1], dirs = m[2], slash = m[3], body = m[4];
    if (/[\[\]]/.test(head)) return { ok: false, error: 'Multiplexes are not in the simulator yet.' };
    if (/[OIL]/.test(dirs)) return { ok: false, error: 'O, I and the L start are not in the simulator yet.' };
    if (!dirs) dirs = 'o';
    var digits = [], active = [];
    for (var i = 0; i < head.length; i++) {
      var c = head[i];
      if (c === 'T') { if (digits.length) active[digits.length - 1] = true; continue; }
      digits.push(+c); active.push(false);
    }
    if (!digits.length) { digits = [3]; active = [false]; }
    if (/-/.test(body)) return { ok: false, error: 'Direction changes (-) are not in the simulator yet.' };
    if (/\(/.test(body)) return { ok: false, error: 'Siteswap 1s, written U(u), are not in the simulator yet.' };
    var tokens = [], group = 0, parts = body.replace(/:/g, ' : ').split(' ');
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (p === ':') { group++; continue; }
      var tm = p.match(/^([RLU])([rlu])(\.?)$/);
      if (!tm) return { ok: false, error: 'Cannot read "' + p + '". Each throw is a capital R, L or U then a small r, l or u.' };
      tokens.push({ t: tm[1], c: tm[2], hold: tm[3] === '.', group: group, text: p });
    }
    if (!tokens.length) return { ok: false, error: 'No throws found.' };
    for (i = 0; i < digits.length; i++) {
      if (digits[i] === 1) return { ok: false, error: 'Siteswap 1s are not in the simulator yet.' };
      if (digits[i] === 0) return { ok: false, error: 'Empty hands (0s) are not in the simulator yet.' };
    }
    return { ok: true, src: s, head: head, dirs: dirs, slash: slash, digits: digits, active: active, tokens: tokens };
  }

  // ---------- building the movement ----------
  function build(src) {
    var p = typeof src === 'string' ? parse(src) : src;
    if (!p.ok) return p;
    var N = p.tokens.length, D = p.digits.length;
    var P = lcm(lcm(N, D), 2);           // throws in one full cycle
    var E = 2 * P;                       // events (throws and catches) in one cycle
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
    function flies(j) { var v = nOf(j); return v >= 3 || (v === 2 && act[mod(j, P)]); }

    // which throw lands at catch j (null for a held ball)
    var incoming = [];
    for (j = 0; j < P; j++) incoming[j] = null;
    for (j = 0; j < P; j++) if (flies(j)) incoming[mod(j + nOf(j) - 2, P)] = j;

    function handOf(j) { return mod(j, 2); }
    function sideFor(h, st) { return st === 'U' ? OWN[h] : -OWN[h]; }

    var st = [];                         // arm state sign at each event
    for (var e = 0; e < E; e++) {
      var t = tok(e >> 1);
      st[e] = stateSign(e & 1 ? t.c : t.t);
    }

    // active key positions: where the hand that throws or catches must be
    function throwKey(j) {
      var h = handOf(j), s = tok(j).t, crossed = s !== 'U';
      // an under-the-arm throw reaches further out so the ball clears the top arm
      var under = crossed && s !== (h === 0 ? 'R' : 'L');
      var far = crossed ? (under ? G.outUnder : G.outX) : G.outU;
      var x = sideFor(h, s) * (dirOf(j) === 'o' ? far : G.inner);
      return [x, G.throwY, G.handZ];
    }
    function catchKey(j) {
      var h = handOf(j), s = tok(j).c.toUpperCase(), crossed = s !== 'U';
      // an under-the-arm catch out wide also reaches past the top arm's elbow
      var under = crossed && s !== (h === 0 ? 'R' : 'L');
      var far = crossed ? (under ? G.outUnder : G.outX) : G.outU;
      var inc = incoming[mod(j, P)];
      var d = dirOf(inc === null ? j - 1 : inc);
      var x = sideFor(h, s) * (d === 'o' ? G.inner : far);
      return [x, G.catchY, G.handZ];
    }

    // key positions of each hand at every event (2 per beat)
    var keys = [[], []];
    for (e = 0; e < E; e++) {
      var jj = e >> 1;
      var h0 = handOf(jj);
      keys[h0][e] = (e & 1) ? catchKey(jj) : throwKey(jj);
    }
    for (var h = 0; h < 2; h++) {
      for (e = 0; e < E; e++) {
        if (keys[h][e]) continue;
        // passive: between the hand's own events, kept on the side the arms state says
        var a = e - 1; while (!keys[h][mod(a, E)] || isPassive(h, mod(a, E))) a--;
        var b = e + 1; while (!keys[h][mod(b, E)] || isPassive(h, mod(b, E))) b++;
        var ka = keys[h][mod(a, E)], kb = keys[h][mod(b, E)];
        var f = (e - a) / (b - a);
        var x = ka[0] + (kb[0] - ka[0]) * f;
        var stt = st[e] === 0 ? 'U' : 'X';
        var need = stt === 'U' ? OWN[h] : -OWN[h];
        if (x * need < G.crossMin) x = need * G.crossMin;
        keys[h][e] = [x, G.scoopY, G.handZ];
        keys[h][e].passive = true;
      }
    }
    function isPassive(h, e) { return !!(keys[h][e] && keys[h][e].passive) || handOf(e >> 1) !== h; }

    // nearest crossed state before/after an event, for when both ends are uncrossed
    function crossedNear(e, dir) {
      for (var k = 1; k <= E; k++) { var v = st[mod(e + dir * k, E)]; if (v) return v; }
      return 0;
    }

    function cr(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
    function baseHand(h, tb) {
      var u = tb * 2, i = Math.floor(u), f = u - i, out = [0, 0, 0];
      var k0 = keys[h][mod(i - 1, E)], k1 = keys[h][mod(i, E)], k2 = keys[h][mod(i + 1, E)], k3 = keys[h][mod(i + 2, E)];
      for (var c = 0; c < 3; c++) out[c] = cr(k0[c], k1[c], k2[c], k3[c], f);
      return out;
    }
    // which arm is over: +1 right, -1 left, scaled by how much the arms overlap
    function overSign(tb) {
      var u = tb * 2, i = Math.floor(u), f = u - i;
      var a = st[mod(i, E)], b = st[mod(i + 1, E)];
      if (a && b) return a === b ? a : a + (b - a) * smooth(0, 1, f);
      if (a) return a;
      if (b) return b;
      var pa = crossedNear(i, -1), pb = crossedNear(i + 1, 1);
      return pa + (pb - pa) * smooth(0, 1, f);
    }

    // under-the-arm throws and catches: made by a crossed hand whose arm is not on top.
    // A catch is the time reverse of a throw, so both are made in the same place.
    var underThrows = [[], []];
    for (j = 0; j < P; j++) {
      var tt = tok(j).t, tc = tok(j).c.toUpperCase(), hh = handOf(j), mine = hh === 0 ? 'R' : 'L';
      // only the ones made out wide: an outside throw, or a catch of an inside throw
      if (tt !== 'U' && tt !== mine && flies(j) && dirOf(j) === 'o') underThrows[hh].push(j);
      if (tc !== 'U' && tc !== mine && incoming[j] !== null && dirOf(incoming[j]) === 'i') underThrows[hh].push(j + 0.5);
    }
    // how strongly hand h is reaching under the other arm's elbow at beat tb (1 at the throw or catch)
    function underPull(h, tb) {
      var best = 0, list = underThrows[h];
      for (var i = 0; i < list.length; i++) {
        var d = Math.abs(mod(tb - list[i] + P / 2, P) - P / 2);
        best = Math.max(best, 1 - smooth(0, G.underWin, d));
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

    function pose(tb) {
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
        var El = arm(h, P0, top, bot);
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

    var bps = G.bps, g = G.g;
    function ballOn(hp) { return [hp[0], hp[1] + G.handR * 0.55 + G.ballR * 0.6, hp[2]]; }
    function ballsAt(tb, poseNow) {
      var res = [];
      var j0 = Math.floor(tb) - maxN - 1;
      for (var j = j0; j <= Math.floor(tb); j++) {
        var nj = nOf(j);
        if (!nj || tb < j || tb >= j + nj) continue;
        var hand = handOf(j), pos;
        if (flies(j)) {
          var k = j + nj - 2, tc = k + 0.5;
          if (tb < tc) {
            var a = ballOn(pose(j).hands[hand]), bpt = ballOn(pose(tc).hands[handOf(k)]);
            var F = (tc - j) / bps, tau = (tb - j) / bps;
            var vy = (bpt[1] - a[1]) / F + g * F / 2;
            pos = [a[0] + (bpt[0] - a[0]) * tau / F, a[1] + vy * tau - g * tau * tau / 2, a[2] + (bpt[2] - a[2]) * tau / F];
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
      var e = Math.floor(tb * 2 + 1e-9);
      ps.event = { index: mod(e, E), token: mod(e >> 1, N), part: (e & 1) ? 'catch' : 'throw', hand: handOf(e >> 1) };
      ps.state = st[mod(e, E)];
      return ps;
    }

    // checks against the article's rules, used by the tests and the page
    var notes = [];
    for (j = 0; j < N; j++) {
      var nxt = p.tokens[(j + 1) % N];
      if (p.tokens[j].c.toUpperCase() !== nxt.t) notes.push('catch ' + (j + 1) + ' (' + p.tokens[j].c + ') differs from the next throw (' + nxt.t + ')');
    }
    var slashSeen = null;
    for (j = 0; j < P && slashSeen === null; j++) {
      if (handOf(j) !== 0) continue;
      var t0 = tok(j);
      if (!flies(j)) { slashSeen = sideFor(0, t0.t) < 0 ? '/' : '\\'; break; }
      var k = j + nOf(j) - 2, tc = k + 0.5;
      var a0 = pose(j).hands[0], b0 = pose(tc).hands[handOf(k)];
      var F = (tc - j) / bps, vy = (b0[1] - a0[1]) / F + g * F / 2, tp = Math.min(F, vy / g);
      var xp = a0[0] + (b0[0] - a0[0]) * tp / F;
      slashSeen = xp < 0 ? '/' : '\\';
      break;
    }

    return {
      ok: true, parsed: p, balls: balls, period: P, loop: loop, events: E, at: at, pose: pose,
      tokens: p.tokens, slashSeen: slashSeen, notes: notes, maxN: maxN
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
    { group: 'Extras (first try)', name: '234 flos mess', src: '234 o/ Ur. Ru Uu : Ul. Lu Uu' }
  ];

  var PH = { G: G, parse: parse, build: build, ik: ik, PATTERNS: PATTERNS };
  if (typeof module !== 'undefined' && module.exports) module.exports = PH;
  root.PH = PH;
})(typeof window !== 'undefined' ? window : this);
