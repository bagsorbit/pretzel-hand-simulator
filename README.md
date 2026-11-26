# Pretzel Hand Simulator

A 3D cartoon juggler that plays patterns written in Pretzel Hand notation
(https://twistedorbitcircus.com/2020/03/26/pretzel-hand-a-juggling-notation/).
The arm on top is drawn in front, and casts a shadow on the other arm, so the
crossings are easy to follow.

## Using it

Open `index.html` in a browser (it needs an internet connection the first time,
to load three.js). Pick a pattern, then:

- Under the juggler, the notation lights up letter by letter as each throw
  (capital) and catch (small letter) happens. The coloured line under each throw
  shows which hand makes it: red is the right hand, blue the left.
- Right sleeve red, left sleeve blue. From the front the juggler's right arm is
  on your left, as in the article.
- The Move | Scrub switch (bottom left of the picture, or the M key) picks what dragging
  does: turn the juggler, or scrub back and forth through time (dragging pauses it).
  A click or tap pauses and plays. Pinch or scroll to zoom. The view buttons jump to
  front, above, side, or the juggler's own eyes.
- The buttons down the right of the picture show one ball on its own, or one pair of
  balls, for learning a pattern a ball or two at a time. The hands still do the whole
  pattern. Press the lit button again for all the balls.
- Above the notation, a line in each ball's colour joins each throw (capital letter)
  to the catch of that ball (small letter), with its siteswap number under it; taller
  lines are higher throws. Faint, greyed rounds of the pattern either side, out to the
  edges of the picture, show where the lines come from and go. While learning a ball
  or two, the other balls' lines fade.
- Play/Pause, step one throw or catch at a time (also the arrow keys and space),
  and a speed slider.
- Type your own pattern in the box and press Enter to play it. If the slash does
  not point to the side the first throw peaks on, the page says so (the pattern plays the same).
- Pattern tools, written back in the same notation (dashes, L start, hold dots and 1
  brackets kept). Time reverse, Flip, Mirror and the Mills/Flos switch are switches: each lights up
  while it's on, they can be combined, and they apply to the pattern chosen from the list
  or typed (in the order mills ↔ flos, flip, mirror, time reverse). Choosing a pattern
  turns them off; Cycle siteswap and the − 3 + ball count change the chosen pattern and
  keep the switches.
  - Time reverse: the pattern played backwards, by Appendix C's rule (`Af Ba Cb : Dc Ed
    Fe` becomes `Fa Ef De : Cd Bc Ab`): throws become catches, `o` and `i` swap, each ball
    keeps its height, each hand keeps its own moves. Works on every pattern.
  - Flip: right and left swapped in every letter.
  - Mirror: the mirror image (the hands swap over as well as the letters), so clockwise
    and anticlockwise swap and right arm on top becomes left arm on top. Greyed out for a
    pattern that is its own mirror image, like the mills mess.
  - Cascade | Mills | Flos: lit for what the pattern on show is (Appendix C: in a mills mess
    each half starts and ends with a crossed throw, in a flos mess with an uncrossed one; an
    inside pattern goes by the pattern it's the time reverse of; anything else is lit as
    Cascade). Pressing the other of Mills and Flos converts it by Appendix C's rule (move the
    first throw to the end and switch the red letters, the first throw and last catch of each
    half; the digits rotate too); an inside pattern is converted by way of its time reverse.
  - Cycle siteswap: the digits move along one throw against the letters, so another throw
    leads (423 → 234 → 342 mills).
  - − 3 + (by the arrows): every digit one lower or higher, which always gives a siteswap that
    works. Taking a ball away stops before a throw would become a 0.
  A tool that can't be used on the current pattern is greyed out, with the reason as its
  tip. A pattern juggled at the sides (forwards sebs, Mike's mess) stays at the sides. If the
  result is in the list, its name is shown. `tests/transforms.js` checks the tools against
  the pairs published in the article, and that every pattern comes back to itself after
  reversing twice, flipping twice, cycling right round, and a ball on and off.

The list has every pattern in the article: all of Appendix A (with the confirmed typos
fixed), the main article's sebs and siteswap patterns, Appendix B, and Appendix C's
butterfly loop Rubenstein's Revenges. The menu is in the author's order (2026-11-25):
mills messes (3:3), hectic messes, side plane messes (the sebs: each named after its front
mess with "sebs" before "mess", and its everyday name in brackets, as in Mills sebs mess
(Forwards sebs); 2026-11-26), Rubenstein's Revenges, Mike's messes (added
2026-11-25: Mike's mess, moved from Appendix B, the 4 ball 228 one, and the flipped
versions of both), other mills mess
extensions and variations, siteswap messes, butterfly messes, then the cascades and half
messes, then the two appendices; within a group, the article's order (114 patterns; the two multiplexes are left out; patterns that appear
twice in the article are listed once; the crossed arm cascade and the alternating windmill
are listed once each, their mirror images being a press of Mirror away; the article's 2 and
4 ball time reverses are left out, being the 3 ball ones with a ball fewer or more).

## How the notation is turned into movement (engine.js)

- Throws alternate hands starting with the right. Each hand catches 0.8 of a beat
  after it throws, so a 3 is in the air for 1.8 beats and held for 1.2 (each hand
  holds a ball about 60% of the time, as in the author's own juggling). Where the
  arms must cross or uncross between a catch and the next throw (the catch letter
  differs from the next throw letter, as in the mills mess with windmill), that catch
  comes half a beat after the throw instead, leaving time for the change.
- Each hand follows one smooth looping curve (a periodic spline through its key
  positions), so its speed and acceleration change gradually. Its height scoops as
  in the author's juggling: caught high, carried down, driven up into the throw,
  then over the top of its loop to the next catch. A held 2 just carries the ball
  on, with no throwing scoop. Throws and catches are single smooth swings laid over
  the path, so the hand moves at nearly the ball's speed as it lets go. The
  crossing, the reach under the elbow and the keep-in-front push are all eased, so
  nothing jolts (`tests/check.js` measures how hard each hand accelerates). A last
  pass blends every hand position with its neighbours in time (`flowBlur`, 0.06
  beat), with the throw swings made a little stronger first (`throwMatch` 1.3) so
  the hand still moves at most of the ball's speed as it lets go.
  A 1 is the exception: it is flicked across from the wrist, so the hand barely
  moves from its spot (`oneStroke` 0.1: a tenth of a normal throw swing), and it
  is passed straight across from near the middle (`oneOut`, 10 cm out) rather
  than carried out wide first. The other hand catches it where it already is,
  without reaching in, so the hands stay apart (`oneIn`, 13 cm out), unless it
  crosses over straight after and catches on its way across.
  With the arms crossed a 1 is passed straight from hand to hand instead: the wrists
  twist and the hands come briefly together at the middle, just touching (`onePass` 0,
  brought to about the same height, `passY`, with the top wrist `passGap` 4 cm over the
  other, eased in and out over `passWin` beats).
  Around every 1, crossed or not, the throwing and catching hands briefly turn a quarter
  turn about the forearm (`palmWin` beats either side), always the same way: the thumb rolls
  over the top and inwards, as it would with the arm on its own side. Uncrossed, the palms
  then face each other. The ball sits in the palm. The hands
  are drawn a little flattened, like a cupped palm, so you can see which way they face.
  A thrown 2 (`2T`) is a little pop over the other arm, so it rises a set 18 cm
  (`popRise`), as low as still clears that arm, instead of following real gravity.
- The slash shows the side of the body the first throw peaks on: its top points there as you
  watch, so `/` peaks on the juggler's left (your right) and `\` on the juggler's right. This is
  the article's 2026 rule, a straight flip of its original slashes (cascade `i/`, mills mess
  `o/`, sebs `o\`). O throws peak in the middle, so they don't go by the slash. It changes
  nothing about the movement.
- R, L and U give the arms at each throw and catch: crossed with the right on
  top, crossed with the left on top, or uncrossed. Crossed means both hands are
  on the other side of the body.
- `o` patterns throw from the outside and catch near the middle; `i` patterns
  throw near the middle and catch outside.
- Between its own throws and catches a hand drifts along its path but is kept on
  whichever side the other hand's letter says.
- The hands work well out in front, about 35 cm from the shoulders, and the elbows
  stay in by the sides of the body, so the arms cross in an X about a forearm's
  length ahead of the chest. Elbows hang low, so forearms angle up gently from the
  elbow to the hand (level only briefly). When the arms cross, the top hand stays
  above a soft floor at the lower chest and the bottom hand below a soft ceiling
  just above its elbow, so the top forearm passes over the other.
- An under-the-arm throw is made just below and slightly in front of the top arm's
  elbow (and a little outside it, clear of the top forearm), so the ball goes up in
  front of the top upper arm. A catch out wide under the arm, as in the TR messes,
  is made in the same place, because a catch is the time reverse of a throw. Under
  throws and catches near the middle stay under the top forearm.
- Near the top arm's elbow, the bottom hand always passes in front of it, never
  behind.
- In the mills mess, after an under-the-arm throw the same hand catches a little
  way back towards where it threw from, but every ball still arcs across (at least
  12 cm sideways), so the balls follow each other in the mess's snake shape.
- The body pushes the arms out: if a hand or forearm would sink into the torso or
  hips, the hand moves forward just enough to clear.
- Throws are real throwing movements: the hand dips with the ball, drives up, and
  lets go while moving at the ball's own speed, then follows through and settles.
  On a catch the hand gives a little along the ball's path. (Under-the-arm throws
  use a smaller movement.)
- The slash is worked out from where the first throw actually peaks, and must
  match the one written (the tests check this).
- Siteswap digits before the slash set the throw heights, rotated to line up
  with the letters. A 2 is held (a dot), unless marked T.
- A 1, written `U(u)`, is caught by the other hand a quarter beat after it is thrown
  ("throw, throw, catch, catch"); the bracket letter is that catch, and the throw
  before it has no catch letter of its own.
- `O` throws go from the outside and are caught outside, so they peak on the centre
  line. The article's key says `O` doesn't go by the slash, so the check doesn't test it.
- Patterns with more balls are juggled faster, so they stay compact: a 4-ball
  pattern runs at about 1.5 times the tempo of a 3-ball one. The base tempo is 3.2
  beats a second, the author's own mills mess.
- Throws higher than a pattern's basic throw are compressed, as jugglers do: a 4 or
  5 goes only a little higher than a 3. A pattern whose highest throw is a 4 or more
  is juggled so that throw peaks at a set height, with its other throws scaled to
  match: 4s just below the top of the head (as in 44133), 5s at about the top of the
  head (Rubenstein's Revenge, whose 3s then peak about the mouth, and Mike's mess),
  as the author juggles them. Each ball still follows a smooth arc; higher throws get
  the gravity that gives them that height (`compress`, `peak4` and `peakStep` in
  engine.js). Short throws (1s, thrown 2s) are not changed.

- Hectic messes (an arm swapping from under to over while the arms stay crossed, as
  in `Lr`): between the `L` throw and the `r` catch, the hand making them circles the
  middle of the other forearm, as the author juggles it. Going from under to over it
  passes round the back of that forearm (towards the navel) and up over it. The other arm stays put,
  giving a little room only if needed, and the circle flows straight into the catch.
  A pattern whose swap goes over to under (the TR hectic messes) is shown as its
  time reverse played backwards, so it is the same movement with time flowing the
  other way, as the author describes it. Late in the circle, once over the other
  forearm, the hand drifts on towards its catch, so it never stops at the top
  (`orbitXa`).

- Hectic flos messes (the arms change over between one hand's catch and the other
  hand's throw, as in `Ul Ru`): as the author juggles it, the hand about to throw
  moves diagonally back towards the body and round the other forearm, the same move
  as the hectic mess. It is a wrist move: the moving arm's elbow is held in low by
  the body (`shareElbowIn`), as in the hectic mills, and the hand circles tightly.
  The whole pattern is juggled about 6 cm higher for room
  (`shareRaise`); the other hand eases forward a little; both arms rise slightly more
  for the move; the catch just before it comes early (`shareLag`) to give it time,
  and that ball keeps the height of the others (`shareEven`). These have their own
  copies of the orbit settings (all named `share...`), so tuning them never moves
  the hectic mills; `tests/search-flos.js` searches them. A TR hectic flos mess is
  shown as its hectic flos mess played backwards.

- A pattern whose throw and catch spots lean clearly to one side (the windmill: both
  hands throw on the left) is moved sideways as a whole, so it sits in front of the
  middle of the body (`centreKeys`).

Not in yet: multiplexes (the article's two, [32T] forwards sebs and 24[54] flos, are left
out of the list; typed in, they show a message) and empty hands. First tries,
to be corrected by eye: `-` direction changes (the butterfly messes: the directions
listed before the slash apply throw by throw), `I` columns (thrown and caught straight up: right,
centre and left columns; a ball that comes back to its own hand, as in the 4 ball Boston
mess, goes up a centre column just over on the other hand's side, so four columns;
neighbouring columns are always `colStep` 18 cm apart; a hand throws from the spot where
it caught, carrying nothing), an `L` start (built as the mirror image of the same pattern
starting with the right hand), patterns with no slash or directions (outside throws),
and the 2 ball messes (their 2s are thrown).

Balls in the air keep apart. Where the arcs of neighbouring throws would meet (most
patterns with 4 or 5 balls, and a few with 3, like the half shower, tennis and some
butterflies), each arc leans a little forward or back, as real jugglers' arcs do: up to
`ballLane` 6 cm at the top (1 cm more for each ball over 3), none at the ends. Each
pattern's leans are chosen once, by trying each throw's lean in turn and keeping whichever
leaves the balls clearest of each other and of the forearms. A 3 ball pattern whose balls
already keep apart isn't touched. The page goes up to 5 balls (`maxBalls`).

In tennis (`Oii`), the `O` ball goes over the top of the other two and wide of them, as in a
reverse cascade: an `O` throw mixed with other directions is thrown and caught further out
(`oWide`) and peaks `oLift` 16 cm higher, the least that keeps it clear of the balls landing
where it's thrown from; the whole pattern is drawn in (`oNarrow` 0.7), so its widest ball is
about 31 cm out from the middle.
The half shower is one hand throwing outside and the other inside (the author,
2026-11-25), so it is written `Oi\ Uu Uu` (the article has `O\ Uu Uu`): the right hand's
`O` throws go over the top and wide, as in tennis, and the left hand's are inside throws. Rubenstein's Revenges and Mike's messes are kept to their own siteswaps too (the author,
2026-11-25). Both are kept to 3 balls (`fixedBalls`): a half
shower with 4 is a different siteswap, and tennis doesn't work with 4.

Two hectic Rubenstein's (2026-11-25) keep the 2 2 3 double loop and add change-overs, where a
hand throws on one side of the other forearm and catches on the other, as in the hectic mills
mess: one with the change-overs on the two 3s (`Lr Rl`), one with a change-over on the 5
(`Rl`). Each is two letters from the Rubenstein's Revenge.

Continuous under-arm throws (`Lu : Ru`) and catches (`Ul : Ur`): the hand going under does
nearly all the moving (the author, 2026-11-25). For a throw, the arm on top waits near its
own uncrossed spot (`contHold` 0.8) and the throwing hand reaches across under it. For a
catch, the top hand comes in only to just inside its own side (`contTopIn` 4 cm), and the
catching hand reaches across under that forearm (`contCatchOut` 10 cm past the middle),
10 cm in front of it (`contCatchFwd`) so the ball comes down past the forearm.

Where a pattern's directions change from throw to throw (tennis, the butterflies), each
throw's own direction letter is shown after its number on the throw lines.

`tests/check.js` now also reports balls meeting in the air, and `tests/sweep.js` checks
every pattern at every ball count from 2 to 5 for collisions of all kinds.

Turning patterns: in Mike's mess (30°, from the 2026-11-24 footage) each half is done at one side of the body and the
whole juggler turns towards it, passing through facing the front between halves (the
pattern's `turn`); the arms keep their own movement relative to the body.

Side-plane mode (a pattern turned more than `bodyTurnMax`, such as a shared link with a
larger `turn`; no listed pattern uses it now): each half is juggled at one side (`sideX` out)
in a plane turned `turn` degrees from the front (so its front end comes in a little), and the
body turns 45° towards it. Every throw is made at one end of the side and caught at the
other: where a hand is across the front pattern (middle or outside, `sideIn`/`sideOutX`)
becomes how far forward it is at the side (`sideFront`, `sideBack` = level with the side of
the body). Every ball is caught on the side it was thrown from; between its throws and
catches a hand carries round the front (`carryFwd`) to the next one's side, with the elbow
out, down and forward (`sidePole`); the body follows the two hands. A catch a hand has to
rush back across for is brought forward (`lateFwd`) with the elbow swung back
(`lateElbow`). A crossed throw (R or L) is made with the throwing hand close in, just under
the other arm's elbow (`sideUnderDrop`, `sideUnderFwd`, eased over `sideUnderWin` beats), its
elbow tucked down (`underPole`).

Backwards sebs mess follows a filmed path (`PATHS.backwardsSebs`, from the author's
footage of 2026-11-24, front, side and from below): each hand moves on a smooth loop (a
periodic cubic spline, so speed and acceleration join up with no stops) through points
measured from the film, made even and the same on both sides, without the body's sway and
lean. The body turns 45° each way, most while a hand is reaching across. As filmed, the arms
are stacked: the arm that has crossed over reaches across the chest at about the lower chest,
its elbow forward, while the other hand works low, out at its own side and down by the hip;
each half starts with a throw from just under the crossed arm's elbow, and hands carry low
between sides. Each path point also says how far that arm is reaching across, which sets
where its elbow points (`pole`, `poleFar`). Elbows never point up.

Forwards sebs mess (the mills mess at the sides) follows a path too (`PATHS.forwardsSebs`).
There is no footage of it, so it is built from its own letters and the author's description,
on the same lines as backwards sebs, with the same heights, elbows and turn: each half's three
balls are thrown at the back of that side and caught in front, so they travel forwards (about
20 to 45 cm). No throw, in either sebs, goes up between an arm and the body: both crossed
throws of a side are made just outside the other arm's elbow (the author, 2026-11-25). At the
first (Ru) the left elbow is tucked in by the body and the right hand reaches over to just
outside it, at the same height (body, left elbow, right hand). At the third (Ll) the left arm
is pulled out in front and a bit across, its elbow towards the middle of the chest, and the
right hand throws from under it, just outside that elbow, about in line with the left
shoulder. A path point may carry a sixth number, how far that elbow is tucked in by the side
(`poleTuck`), and reaching across brings the shoulder 2 cm in and 5 cm forward
(`reachShoulder`), as in the front-facing patterns. The points were settled by a search
(random steps from a first plan) that keeps to that and keeps arms, balls and body clear, the
right arm on top where the letters say, and hands smooth.

Both sebs keep their own movement with more balls: a pattern written with the same
letters, directions and slash, with every throw the same height (3, 4, 5 ...), shares the
listed pattern's path and turn (`sameMoves`), and a path may have its own version for a
ball count (`forwardsSebs4`, `backwardsSebs5` ...). The identity of a sebs, as of a mills
mess, is three balls following each other in an arc, at any ball count; in sebs the arc is
at a side of the body, forwards or backwards (the author, 2026-11-25). Each extra ball is
caught a beat later, so with the 3-ball path some balls would land after the body has
turned to the other side and fly across (with 4 balls the third of each side, with 5 the
second and third). The 4 and 5 ball paths move those catches so each side's three balls
are caught on that side, travelling forwards (or backwards), found by the same kind of
search, which also keeps forwards sebs's first and third throws where the author put them.
Their catches overlap the other side's throws, so the body turns less in forwards sebs
(25° with 4 balls, 20° with 5) and on a later beat in backwards sebs. With more balls the
beat is quicker, so the hands move faster.

More of the mills family at the sides (3 balls; the author, 2026-11-25: each named after its
front pattern with "sebs" before "mess": flipped flos sebs mess). Time reverse keeps each hand's own moves, so a time
reversed sebs is its path played backwards (t becomes 0.8 - t, which turns each throw into a
catch with the same holds): TR mills sebs mess, the author's Weave (`weaveSebs`, from forwards
sebs) and flipped flos sebs mess (`flippedFlosSebs`, from backwards sebs), each then searched
smooth and clear. Flipping swaps which arm goes over at every crossing, which no replay or
mirror gives (every pattern in the family is its own mirror image), and searches from the
existing paths only found ways of not crossing the arms, so the flipped, TR flipped, flos
and TR flos sebs messes wait for the author's description of their crossed throws.
Every sebs search now also keeps each side's three balls in one plane: each ball's flight,
seen from above, close to one line for that side (the author: "we're trying to get that three
ball arc as much as possible on one plane"); the 4-ball forwards sebs was redone this way. Elbows follow one path back, without going
out and in again on the way (the author): flipped flos sebs mess's search scores that too, and backwards sebs
(3, 4 and 5 balls) was smoothed the same way, staying close to the filmed path.

Flipped sebs mess (2026-11-26) is the first of the flipped four at the sides, a best guess
for the author to correct: searched from the front flipped mess turned to each side, so the
right arm is on top where the letters say, with all the rules above, and every crossed throw
made outside the other arm's elbow so none goes up between an arm and the body. It is built
for 3 balls so far.

### Side plane rules

The author's rules for patterns juggled at the sides, all checked by `tests/side.js` on every
side plane pattern at every ball count it has a path for (and used by the searches that make
the paths). A new side plane pattern has to pass every one before it is shown.

1. Each side's three balls stay at that side: caught on the side they were thrown from.
2. Outside patterns arc forwards along the side, inside ones backwards.
3. Each side's arc is in one plane (throw and catch spots within 2.5 cm of one vertical plane,
   each ball within 6 degrees of its line).
4. Each side's three balls follow one arc from above (throw spots within 6 cm of each other,
   catch spots likewise).
5. No throw goes up between an arm and the body: a crossed throw is made outside the other
   arm's elbow.
6. The hand is in front of its elbow at every catch (no reverse-hand catches; move the elbow
   back instead).
7. Elbows follow one path back and forth, never out and in again on the way.
8. Both sides are the same (the right side mirrors the left).
9. No part of one arm goes through the other: forearms, hands and upper arms (a 1 cm brush is
   allowed).
10. The arm on top where the arms cross is the one the letters say.
11. Hands, forearms and elbows stay out of the body.
12. Balls never collide or pass through an arm.
13. Every hand position can be reached.

For forwards sebs, also the author's first and third throws (see above). Every side plane path was searched again with all thirteen rules on 2026-11-26 (the upper arm
rule was new), and all of them pass. Wishes, not yet rules:
a bigger turn and a longer arc where the pattern allows (the flipped sebs mess turns about 48
degrees with arcs of about 34 cm).

Side plane / wall plane (the author, 2026-11-26): the Side plane button juggles a pattern at
the sides of the body instead of in front. It works only where the list gives a pattern a
side-plane path (`side`), so far the 3 ball cascade (`cascadeSide`) and reverse cascade
(`reverseCascadeSide`), and is greyed out everywhere else. The cascades use the sebs rule (the
middle of the front pattern becomes the front of a side, the outside its back), so every throw
crosses the body diagonally: in the cascade from the front of the thrower's side to the back of
the other, in the reverse cascade from the back to the front, with the body turning towards
each throw. The messes that have a sebs (mills, flipped flos, TR mills, TR flipped flos) and
their sebs are each other's wall and side plane versions, the same letters with the slash the
other way round, so on any of them the button swaps to the other, with any ball count the sebs
has. Side plane is a switch like the others: the tools (time reverse, flip, mills/flos, the ball
count) work on the pattern in front, and while it is on, whatever they give is shown at the
sides if it can be, so mills, Side plane, then Flos gives the flipped flos sebs mess. Choosing a
sebs turns it on, choosing anything else turns it off, and a pattern with no side-plane
version goes back to the wall plane; share links keep it (`&side=1`). Weave and flipped flos
sebs mess have their own 4 and 5 ball paths, like the other two, so each side's three balls
stay at that side. Two more rules from the author (2026-11-26), used in those searches: a catch
is made with the hand in front of its elbow (a hand pointing back is a special reverse-hand
catch, so the elbow moves back instead: the paths may tuck it, `poleTuck`), and from above
each side's three balls follow one arc, thrown from about one spot and caught at about one spot
(within about 5 cm), so the three-ball arc is clear; the Weave (3, 4 and 5 balls), 4 and 5 ball
backwards sebs and 5 ball forwards sebs were searched again with them. With more balls, arcs that would meet lean a little forward or back; on a
side plane path the left side's leans are copied onto the right, so both sides look the same
(the author liked the left side of the 5 ball backwards sebs; the right had come out different). The mouse switch shows both its states, Move (drag to turn the view) and Scrub
(drag through time), with the one in use in yellow.

The turning patterns' check looks at them in the body's own frame, and doesn't test their
slash. Each sebs is written with the opposite slash to its front-facing pattern, which is
what tells them apart.

Open questions: since the footage changes (2026-11-22) the TR
mills messes have a forearm sloping down just over the 10% limit. The hectic flos
messes clear now, but work above the heights measured in the footage, and their
hands jolt more than the limit (about 18k).

## Footage

The arm positions and timing were checked against the author filming a 3-ball mills
mess from the front, the side and below (2026-11-22, 120 frames a second). The
simulator is meant to be a cleaner, more even version of that, not a copy. The
targets taken from it (hands about 35 cm out in front and at belly to lower-chest
height, elbows in by the body and a little forward, the crossed top hand no higher
than the lower chest) are in `tests/measure.js` as `FOOT`, and the checks and the
arm-setting search use them for every pattern except the plain cascades. The video
files are not kept in the repository.

## Tests

    /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/check.js

For every pattern it checks that the notation reads, the siteswap works, the slash
matches where the first throw peaks, no arm has to stretch straight, the elbows stay
out of the body, hands and forearms stay out of the body, forearms angle up, the under hand never goes behind the top arm's
elbow, the forearms never touch, no hand touches the
other forearm, no ball in the air passes through an arm (a brush of up to 1 cm is
allowed, as `graze` in engine.js), every ball arcs sideways, and the arm on top is always
the one in front where the arms cross.

`tests/search.js` searches the arm-crossing settings (elbow spots, how far the top
arm sits over, how far under-the-arm throws reach) for values that pass all of the
above; the current values in `engine.js` came from it. Trial values can be passed to
the check: `jsc -e 'var OVERRIDES={outUnder:28}' tests/check.js`.

`tests/search-flos.js` does the same for the hectic flos change-over settings only,
scored on clearance, jolts, how low the hands go and how even the ball heights are.

At the left end of the letters: a fullscreen button (where the browser allows it) and, on a
phone, an arrow that tucks the controls away to give the juggler more room. On a phone the four
view buttons become one that steps through them. The share button (under Flos) gives a link to the pattern on show: on a phone the share
sheet, on a computer it copies the link. The link points at the article on the circus website
(`HOME_PAGE`), jumps straight to the simulator there (`#phs`, the frame it sits in) and carries the pattern as `?n=` (plus
`&turn=` for a pattern juggled at the sides that isn't in the list). The site's embed hands the
query on to the simulator, and opening the GitHub Pages address directly goes to the website,
keeping the pattern.

The round i button by the letters opens the key: the current pattern taken apart pair by
pair in plain words, then what every symbol means (`?key` in the address opens it).

`tests/phone.html` shows the page in a phone-sized frame. Adding `?p=6&t=1.5&view=above`
to the page address opens pattern 4 paused at beat 1.5, seen from above.
