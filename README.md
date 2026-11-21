# Pretzel Hand Simulator

A 3D cartoon juggler that plays patterns written in Pretzel Hand notation
(https://twistedorbitcircus.com/2020/03/26/pretzel-hand-a-juggling-notation/).
The arm on top is drawn in front, and casts a shadow on the other arm, so the
crossings are easy to follow.

## Using it

Open `index.html` in a browser (it needs an internet connection the first time,
to load three.js). Pick a pattern, then:

- The badge at the top left says which arm is on top right now.
- Under the juggler, the notation lights up letter by letter as each throw
  (capital) and catch (small letter) happens. The coloured line under each throw
  shows which hand makes it: red is the right hand, blue the left.
- Right sleeve red, left sleeve blue. From the front the juggler's right arm is
  on your left, as in the article.
- Drag to turn the juggler; pinch or scroll to zoom. The view buttons jump to
  front, above, side, or the juggler's own eyes.
- Play/Pause, step one throw or catch at a time (also the arrow keys and space),
  and a speed slider.

## How the notation is turned into movement (engine.js)

- Throws alternate hands starting with the right. Each hand catches half a beat
  after it throws, so a 3 is in the air for a beat and a half and held for a beat
  and a half.
- R, L and U give the arms at each throw and catch: crossed with the right on
  top, crossed with the left on top, or uncrossed. Crossed means both hands are
  on the other side of the body.
- `o` patterns throw from the outside and catch near the middle; `i` patterns
  throw near the middle and catch outside.
- Between its own throws and catches a hand drifts along its path but is kept on
  whichever side the other hand's letter says.
- Elbows hang low, so forearms angle up from the elbow to the hand (level only
  briefly). When the arms cross, the top hand works in a higher band (up to chest
  height) and further forward, and the bottom hand in a lower band just above its
  elbow, so the top forearm passes over the other. The top arm's elbow aims for a
  spot by its ribs; the bottom arm's elbow aims out and back.
- An under-the-arm throw is made just below and slightly in front of the top arm's
  elbow (and a little outside it, clear of the top forearm), so the ball goes up in
  front of the top upper arm. A catch out wide under the arm, as in the TR messes,
  is made in the same place, because a catch is the time reverse of a throw. Under
  throws and catches near the middle stay under the top forearm.
- Near the top arm's elbow, the bottom hand always passes in front of it, never
  behind.
- The slash is worked out from where the first throw actually peaks, and must
  match the one written (the tests check this).
- Siteswap digits before the slash set the throw heights, rotated to line up
  with the letters. A 2 is held (a dot), unless marked T.

Not in yet: 1s (`U(u)`), multiplexes, empty hands, `O`/`I`, `-` direction changes,
sebs (forward throws) and the hectic messes (an arm swapping from under to over
while crossed).

## Tests

    /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/check.js

For every pattern it checks that the notation reads, the siteswap works, the slash
matches where the first throw peaks, no arm has to stretch straight, the elbows stay
out of the body, forearms angle up, the under hand never goes behind the top arm's
elbow, the forearms never touch, no hand touches the
other forearm, no ball in the air passes through an arm, and the arm on top is always
the one in front where the arms cross.

`tests/search.js` searches the arm-crossing settings (elbow spots, how far the top
arm sits over, how far under-the-arm throws reach) for values that pass all of the
above; the current values in `engine.js` came from it. Trial values can be passed to
the check: `jsc -e 'var OVERRIDES={outUnder:28}' tests/check.js`.

`tests/phone.html` shows the page in a phone-sized frame. Adding `?p=4&t=1.5&view=above`
to the page address opens pattern 4 paused at beat 1.5, seen from above.
