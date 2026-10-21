# 67.15.1 — Remove post-ESCAPE flash

Removed the full-screen golden flash and following dim flicker after all four successful montage ESCAPE presses. The message departure now leads directly into the aftermath, preserving the existing audio cue. JavaScript syntax checked.

# 67.15 — Clarity, pacing and controls (19 September 2026)

- Common-room plant moved down so the pot rests on the floor, with a contact shadow.
- A small gold dot softly pulses above the next useful world interaction after 0.8 seconds of free control. One target at a time; hidden during dialogue, choices, phone reading, highs, cinematics and pause. Reduced motion keeps it steady. Optional interactions remain available.
- Title and pause menus offer a persistent 0–100% master volume slider. Mute remains separate and preserves the chosen volume. Sliders work with arrow keys without triggering gameplay.
- Storm departure begins without a per-card stagger, lasts 0.30 seconds (0.16 reduced motion), and sweeps outward while fading. Button feedback runs concurrently. Aftermath text no longer waits through a blank 0.55-second pause.
- Trimmed repeated Rex dialogue, one hallway reply and duplicate opening-bedroom thoughts. First-high aftermath pause: 2.05 → 0.8 seconds. Early walking: 76 → 88 pixels/second; late walking remains 76. High durations remain 13/8/5/3 seconds and all chapter branches remain intact.
- Standalone thought captions are labelled INNER THOUGHT; single-speaker protagonist dialogue uses that label except during the final call. Mixed conversations retain speaker labels.
- Dialogue button distinguishes REVEAL from CONTINUE. Revealing a line requires a fresh press at least 0.30 seconds later to advance.
- Pause → READ RECENT DIALOGUE keeps the last 30 dialogue lines. Restart clears history. This is dialogue history, not a complete archive of phone messages or captions.

Validation: JavaScript syntax passed. A Node VM with a DOM stub checked volume synchronization, eight objective states, pause suppression, dialogue reveal/advance protection and history. A browser visual check/full playthrough was not completed: Chromium was unavailable and its download failed. Please play through before submission; total runtime has not been re-measured.

Open index.html to play. No new runtime dependencies.

---

# SKIP 67.14 — phone notification attention-cue patch

## Base and scope

- **Exact supplied base archive:** `SKIP_67.13_OPENING_CORRECTION_PATCH(1).zip`
- **Output archive:** `SKIP_67.14_PHONE_NOTIFICATION_ATTENTION_CUE_PATCH.zip`
- The active base was inspected before editing. Its current notification implementation uses the shared `#moment` panel with owner/token protection, the 67.13 opening-Mum `pending / visible / done` lifecycle, a persistent in-world phone prop drawn by `phoneProp()`, and existing sound/reduced-motion settings.
- This patch is presentation-only. `index.html`, `style.css`, all image assets, story text, message wording, opening sequencing, notification read/delivery state, popup-storm logic, mirror/retrospective systems, ESCAPE systems and ending structure are unchanged.

## What changed

- Added one small token-bound phone-buzz presentation state. It is independent from notification read/delivery state and expires after ~1.4 s.
- Eligible real-time alerts now opt into the buzz explicitly rather than inheriting it from generic message rendering.
- The opening Mum alert starts the cue **only after** the existing foreground notification is genuinely claimed/visible. Pending Mum state does not buzz.
- The existing later real-time Maya alert at `2 SEP · 10:58 PM` opts into the same treatment.
- Future calls through the existing `notifyMessage()` real-time alert helper also opt in, while historical/acknowledgement/storm paths do not.
- Opening the phone, beginning another world interaction, replacing the owning notification, finishing it, or restarting clears the active buzz cleanly.
- The high/dream ghost-phone rendering is explicitly non-buzzable so the attention cue cannot leak into altered-state presentation.

## Visual treatment

The supplied vibrating-phone image was used only as a visual-language reference. The implementation stays inside SKIP's existing 480×270 pixel-art renderer:

- **Phone shake:** approximately ±1 internal pixel horizontally, alternating quickly for about the first second; no rotation or large bounce.
- **Vibration marks:** compact symmetrical stepped pixel marks around the phone; they fade out by ~1.3 s and never form a large halo.
- **`brr` cues:** a tiny hand-built bitmap `brr` word rather than browser/vector text. Full motion uses two brief cues, the second offset slightly; they rise by up to ~5 internal pixels and fade.
- **Reduced motion:** removes the physical phone shake and repeated/moving second `brr`, while retaining a short static/fading line cue plus one restrained `brr`.
- Existing notification audio is reused unchanged. The visual treatment is fully present with sound muted.

## Eligibility discipline

**Buzz enabled:**

- Opening Mum foreground alert, when it actually becomes visible.
- Existing real-time Maya `10:58 PM` alert after the room-2 escape.
- Existing/future alerts routed through `notifyMessage()` when that helper actually presents them.

**Buzz deliberately not attached to:**

- conversation history,
- the read watcher,
- chapter/date markers,
- acknowledged historical message cards,
- retrospective cards,
- montage/pop-up storm cards,
- coursework alerts,
- support/end cards,
- generic phone opening,
- the dream/high ghost phone.

## SOURCE VERIFIED

- `node --check game.js` passes.
- Diff against the supplied archive shows implementation edits only in `game.js`; `index.html`, `style.css`, and assets are unchanged.
- HTML IDs remain unique.
- CSS brace counts remain balanced.
- Production `buzz:true` opt-ins are limited to the explicit real-time helper and the existing room-2 Maya real-time alert; opening Mum uses one explicit `startPhoneBuzz()` at successful foreground presentation.
- No montage/storm path contains a buzz opt-in.
- `openPhone()` clears an active buzz without touching notification read/delivery state.
- The shared moment interruption/completion/reset paths clear only the token-owned buzz, preventing overlap/orphans.
- Reduced-motion branching is present in the phone cue renderer.
- No notification wording, story dialogue, message dates, opening Maya bubble text, Rex gate, ESCAPE content, retrospective content, mirror content, ending content or support content was edited.

## STATIC VERIFIED

- The in-world party and bedroom phone props remain the same size and palette; cue rendering is layered around them rather than redesigning the phone.
- The shake amplitude is ±1 internal pixel and stops after ~1.05 s; the whole cue state expires at ~1.4 s.
- Full motion creates two finite `brr` instances; reduced motion creates one.
- The buzz state is singular, so multiple buzz animations cannot coexist.
- A moment replacement stops the prior token's buzz before the replacement can own the shared notification panel.

## RENDERED VERIFIED

Chromium 144 checks were run using a self-contained browser harness assembled from the **same final HTML/CSS/JS**. This environment blocks localhost navigation, so the production files were embedded into a temporary test page; no test hooks are included in the delivered ZIP.

Observed:

1. **Opening / stand still:** Maya's existing opening cue appears first. Mum stays out of the foreground until the existing clear opportunity. When `opening-mum` becomes visible, the in-world phone performs the restrained shake with compact lines and `brr`; after the buzz ends, Mum's notification remains visible for its normal reading window.
2. **Immediate Maya interaction:** reaching Maya and starting her conversation before Mum's eligibility keeps Mum's foreground card absent while the conversation owns attention. Mum appears after Maya's interaction finishes and then gets the buzz normally.
3. **Another NPC interaction:** an early Eli conversation likewise blocks Mum; no buzz plays during the interaction, and Mum presents afterward.
4. **Early phone glance:** opening Mum briefly and putting the phone away before the read dwell does not suppress the later foreground alert; Mum later presents and can buzz. Keeping the identified opening Mum message visibly open beyond the existing read dwell suppresses the redundant later alert.
5. **Sound muted:** with SOUND OFF, the opening Mum cue remains visibly present and readable.
6. **Reduced motion:** the phone no longer physically shakes; the compact vibration marks and a single restrained `brr` remain as the equivalent attention cue.
7. **Later real-time Maya alert:** a test-only state hook exercised the production room-2 `showTimedMoment(...,{buzz:true})` path in the actual bedroom renderer. The phone cue rendered consistently outside the opening.
8. **Opening the phone mid-buzz:** the same test harness confirmed `openPhone()` immediately clears the active cue while the owning notification object remains otherwise intact.
9. **Historical/non-realtime control:** a production-style historical `acknowledged` moment was rendered with the phone lit but no active buzz, confirming the cue is opt-in rather than universal.
10. **Post-buzz lifecycle:** the alert panel remains visible after the ~1.4 s buzz state expires; the cue does not control notification delivery/read completion.

## HUMAN-PLAYTESTED

- **Not claimed.** No human end-to-end playthrough was performed in this environment.
- Remaining human judgment: whether the `brr` is the preferred exact size/contrast on the target monitor, and whether the vibration marks should be one pixel closer/farther from the phone. The current browser render is intentionally restrained rather than comic-book-like.

---

## Inherited 67.13 patch notes

# SKIP 67.13 — focused opening correction patch

## Base and scope

- **Exact supplied base archive:** `SKIP_OPENING_ATTENTION_MAYA_BUBBLE_PATCH.zip`
- The supplied files match the referenced 67.13 opening implementation: the Maya cue was still rendered as ~5 px canvas monospace text, the MUM read watcher used a generic 1.4 s thread dwell, and the alert was marked delivered as soon as it appeared.
- Scope is limited to Maya's opening invitation bubble and Mum's opening notification/read lifecycle. Story content, later chapters, mirror logic, ESCAPE systems, flashbacks, scene layouts and ending structure were not redesigned.

## Maya bubble correction

- Removed the old `drawOpeningMayaBubble()` canvas lettering entirely.
- Added one display-resolution HTML/CSS overlay inside the existing game stage with exactly:

  `HEY!`
  `OVER HERE!`

- It is positioned from Maya's existing 480×270 world coordinate into stage percentages, so it remains attached to her without adding camera infrastructure.
- The bubble uses a warm light fill, dark text, softened compact corners, a restrained outline and a short attached tail. It has `pointer-events: none` and does not take focus or intercept controls.
- World canvas resolution and pixelated sprite rendering are unchanged.
- Preserved the existing ~3.5 s cue lifetime, end fade, initial-spawn range exception and early-dismissal rules.
- Preserved the simultaneous/overlapping opening greeting exactly: `Maya: “Oi. Saved you a seat.”` The greeting is not delayed until the bubble expires.

## Mum lifecycle defects repaired

Mum's phone-message read state is now independent from foreground-alert presentation state.

Foreground presentation uses:

- `pending` — introduction is still owed and may be retried.
- `visible` — Mum currently owns the notification panel and readable exposure is being counted.
- `done` — the foreground introduction completed uninterrupted, or became redundant because the specific opening message was actually read.

Key semantics:

- Entering `visible` does **not** mark delivery complete.
- The initial readable exposure target remains **7 seconds**.
- Only uninterrupted, actually visible presentation owned by Mum counts toward those 7 seconds.
- Interruption/replacement before completion returns the alert to `pending` and resets readable exposure to zero, giving the next attempt a full opportunity.
- Successful foreground completion sets the alert to `done` but does **not** mark the underlying phone message read.
- Reading the specific opening message suppresses/finishes only the now-redundant foreground introduction.
- A retry does not replay Mum's incoming chime repeatedly; the opening alert chimes only on its first presentation attempt.

## Shared notification-panel ownership

- Added a narrow owner/token layer around the existing shared `ui.moment` panel.
- Only the active owner token can complete, interrupt or clear its presentation.
- Replacing Mum with another notification returns an incomplete Mum alert to `pending`.
- Stale timers can no longer hide a newer notification.
- Mum cleanup cannot hide content owned by another notification.
- Reset increments/invalidate ownership state, so callbacks from the previous playthrough cannot clear or complete a new one.
- Existing `ui.moment` users were routed through the same small ownership helpers where necessary; the wider notification/story system was not otherwise rewritten.

## Message-specific read detection

- The opening MUM messages are still inserted into the thread at the playable opening, independent of the foreground alert.
- The specific `Have fun tonight ❤️` opening message now has a stable message ID.
- The 1.4 s read watcher only accrues while that identified message is actually present and substantially visible inside the MUM message viewport, with the MUM phone thread open and unobscured.
- Closing/obscuring the phone resets the dwell instead of allowing an old callback to complete later.
- Merely opening the generic phone, briefly opening/closing it, or showing another contact is not treated as proof of reading.
- The existing `THANKS MUM` reply remains a directly relevant explicit read action and marks the opening message read.

## Foreground eligibility and opening-window boundary

- Mum still starts from the existing ~5.5 s eligibility delay.
- Eligibility blocks on substantial foreground work: dialogue, choices, acknowledgement beats, phone reading, cinematic/full-screen overlays, pause/hidden gameplay and another active notification.
- `G.busy` is retained as a safe interaction boundary so Mum cannot appear halfway through an interaction's internal waits.
- The old blanket dependency on every minor thought/caption being absent was removed. Ambient captions may coexist when they do not own the foreground; Mum receives the next safe opening once substantive interaction work ends.
- Opening phase handling is explicit:
  - **eligible:** opening `party`, same-evening `after`
  - **temporarily blocked but still owed:** `high1`, `aftermath`
  - **outside/closed window:** non-opening scenes and `commonVariant === 'empty'`
- Pending state therefore survives the first-high transition instead of being deleted merely because `phase !== 'party'`.
- Crossing the valid opening boundary closes presentation eligibility without falsely setting Mum read or successfully delivered. The phone message remains in the thread; an unresolved alert is not replayed in later-day bedrooms, flashbacks, the later empty-party scene or ending.

## Static/source verification

Passed:

- `node --check game.js`.
- HTML IDs remain unique.
- CSS brace balance.
- Old canvas `drawOpeningMayaBubble()` path is absent; only the HTML/CSS bubble remains.
- Bubble has `pointer-events: none` and exact two-line wording.
- Separate read state, `pending / visible / done` presentation state, 7 s exposure counter and message identity are present.
- Shared moment ownership is epoch/token guarded and reset invalidates old ownership.
- Direct `ui.moment` show/hide ownership is centralized in the new helpers rather than left to independent stale timers.
- Maya's greeting text is unchanged from the supplied base.
- Rex's existing prerequisite remains unchanged: the offer path still exits while `!G.flags.bonded`; bonding/photo is still set by Maya's existing interaction.
- Mum's opening message content is unchanged.
- Phase rules explicitly retain pending state through `high1`/`aftermath`, allow the same-evening `after`, and close on the later empty-party variant.

## Actual Chromium checks performed

Checks were run in Chromium 144 under an X virtual display. Local file/HTTP navigation is restricted in this environment, so the browser harness used a self-contained page made from the **same final HTML/CSS/JS and supplied PNG assets**. Test-only state inspection was not included in the delivered build.

Observed in the running browser:

1. **BEGIN / stand still:** Maya's bubble and saved-seat greeting appear first; Mum stays out of the foreground, then appears at the next eligible opening and completes. After successful alert completion, `mumRead` remains false.
2. **Approach Maya immediately:** entering her existing range dismisses the bubble without auto-starting dialogue/progression. Completing Maya's normal bonding/photo interaction postpones Mum and she appears afterward.
3. **Interrupt Mum with another interaction:** Mum disappears immediately, returns to `pending` with exposure reset to zero, then retries after the interaction rather than being considered delivered.
4. **Chain opening NPC interactions:** Mum stays pending through the foreground work and uses the first clear opportunity when the chain stops.
5. **Rex / first-high entry:** the normal browser route was played through Maya bonding, Rex's choice and entry into `high1`; Mum was observed hidden and still `pending` during the blocked high. A separate browser phase-boundary check using the production update logic confirmed `pending` remains unresolved in `high1` and becomes visibly owned by `opening-mum` when the eligible same-evening `after` state resumes.
6. **Read Mum early:** the identified opening message is visibly present in the MUM thread; after the defined visible dwell it becomes read and no redundant foreground alert follows.
7. **Brief phone glance:** opening/closing before the read condition leaves Mum unread/owed; her foreground alert still appears later.
8. **Pause during Mum display:** paused time did not advance the 7 s readable-exposure counter; counting resumed after unpause.
9. **Competing notification + restart:** another notification replaced Mum without marking her complete; Mum returned to pending and retried. Restart while callbacks were outstanding did not let the old callback hide, duplicate or complete the new playthrough's alert.
10. **Opening-window boundary:** a browser state check using the actual later empty-party state (`scene === 'party'`, `phase === 'empty'`, `commonVariant === 'empty'`) closed the opening window with no Mum alert or Maya bubble replay and left an unseen pending introduction unresolved rather than falsely read/delivered.

### Visual checks

- Inspected the bubble in the actual browser at normal desktop size and a smaller supported viewport.
- Text remains sharp because it is rendered at display resolution rather than rasterised into the 480×270 canvas.
- Padding, outline and tail remain readable; the tail stays visually attached above Maya.
- Bubble remains inside the stage, does not cover Maya's face, does not intercept the nearby interaction prompt and is visibly subordinate to the main saved-seat greeting.
- It reads as a friendly character invitation rather than an objective marker.

## Remaining verification limitation

- The X virtual-display renderer became extremely slow during the full 13-second high effect. The real browser route was observed through Rex's actual choice and into `high1`, including the required blocked/pending state, but the complete real-time high→after handoff was **not** watched end-to-end in that same route. The after-state retry was instead verified separately in Chromium with the production phase/update logic, and the actual `rexTalk()` source transition to `after` was source-checked.
- Likewise, a full start-to-ending human playthrough was not rerun. The later empty-party no-replay boundary was browser-checked directly and source-checked, rather than reached by replaying every intervening chapter.


## 67.15.2 - Background music boost

- Increased the melodic music bus gain from 0.75 to 1.05 (40%, approximately +2.9 dB before compression).
- Increased both quiet bedroom ambience layers by the same 40%.
- Kept dialogue blips, notifications, percussion, master volume, mute and saved volume preferences unchanged.
- Preserved the 67.15.1 no-flash transition fix and all other files.
- Validation: JavaScript syntax check and archive comparison; listening balance still needs a check on the target device.


## 67.16 — Storm thoughts, pressure, recurring phone cues and dialogue clarity

- Bundled Rock Salt (including its license) for four short storm thoughts, without a speaker label. Text stays still and reserves clear space above ESCAPE.
- World-only darkness progresses through 15%, 25%, 45%, 70%, using absolute opacity. Fade in: 0.8 seconds. Successful ESCAPE returns to baseline over 0.4 seconds while messages depart, preserving the no-flash aftermath.
- Failed ESCAPE retains 70% darkness through the subsequent scenes. Choosing CALL MUM eases it away over 1.2 seconds.
- Recurring visual brr bursts every 3 seconds while unread; quieter audio repeats. Banner expiry and unrelated interactions no longer acknowledge the phone. Cues suspend during dialogue, overlays and cinematics, resume afterwards and clear when the phone opens. Opening Maya-first attention timing is preserved.
- Ending common-room notification now has a visible pocket cue before the phone opens; no table phone is invented in the empty room. Initial message holds for 3.2 seconds to make the cue visible.
- Guidance dot uses a brighter centre and a complete invisible interval each 1.6-second cycle.
- Speaker label is YOU, with INNER THOUGHT removed. The vague post-Mum-draft thought now reads: I still haven’t replied to Mum.
- Added Saturday confirmation and Sunday follow-up for the missed lunch. Clarified Mum’s party check-in, Maya’s invitation, the response following an unsent draft, the protagonist’s uncertainty about Mum, and the final honest message (including its typing animation).
- Preserved 67.15.2 music boost, volume controls, existing art and gameplay sequences.

Validation: JavaScript syntax passed; isolated source-function checks passed for phone recurrence/quiet interval/dialogue suspension/banner expiry/open acknowledgement and storm progression/fades/reset. Original 9 PNG assets and index.html verified unchanged. Rock Salt font and license included. Browser installation was unavailable, so no full visual or end-to-end playthrough is claimed; verify storm text placement and the common-room pocket cue on the target display.


## 67.17 — Physical deterioration and final hallway walk

- Integrated the supplied 240x288 player sprite sheet unchanged. Original top frames continue to serve the opening/high/sitting poses; the three 40x40 fatigue rows serve progressively worn normal movement and idle poses. The falling row at y=248 is unused.
- Normal walking speed progresses through 100%, 90%, 80%, 70%, 60% of the original 88 pixels/second, with a slower animation cadence and footsteps.
- From level 2 onward, one brief catch-yourself stumble can occur after 180 pixels of walking per scene. Recovery takes 0.7 seconds and briefly reduces forward speed; no extra input is needed.
- Final hallway has one fixed stumble and a 2.6-second leaning rest. Thoughts: “I swear the common room was closer.” → “Just a second.” → “Okay. Keep going.” Regular thought styling; Rock Salt stays exclusive to storms.
- Holding a movement key resumes walking after the rest; direction changes remain immediate. Rest/stumble do not repeat when backtracking. Empty common-room exploration has no additional incidental stumble.
- Scene transitions clear transient movement recovery; restart rebuilds all flags. Earlier 67.16 changes, music and no-flash fix retained.

Validation: JavaScript syntax passed. Source-function simulation checked all five speed tiers, exactly one hallway rest/stumble, held-key recovery, direction reversal and nonrepetition. Hallway movement to the door interaction range takes approximately 9.5 seconds; combined with the bedroom approach, the journey is roughly 15–17 seconds excluding reading and transitions. Supplied sprite bytes verified unchanged. No browser visual or full end-to-end playthrough was performed.


## 67.18 — Later deterioration, stronger ambience and support contact

- Added the user-supplied national mindline 1771 information and website beside NAMS appointments: 24/7 support, hotline 1771 and WhatsApp 6669-1771 (message only). Cards stack on narrow screens. Removed the old blanket source-check date; the mindline site could not be fetched during this edit.
- Removed the remaining INNER THOUGHT pseudo-element from CSS, in addition to the already-clean dialogue speaker label.
- Melodic music bus gain increased from 1.05 to 1.65 (about +3.9 dB before dynamics processing). Room ambience raised from 0.0056 to 0.020 for the bass layer (about +11 dB), with audible 108/162 Hz layers, a stronger filtered noise layer and longer tails. Master volume preferences, mute and effect gains are preserved. Listening on the target device is still needed.
- Storm darkening begins with the lead-in message, before the storm cards, and eases over 1.2 seconds. Successful ESCAPE and drug-high entry restore baseline brightness without a flash. Failed ESCAPE still retains darkness until reconnection.
- Integrated the new 240x368 sprite sheet unchanged. Mild injury rows at y=288/328 now precede the heavier fatigue rows at y=168/208. Falling row at y=248 remains unused.
- Physical deterioration is now tracked independently from bedroom level: early movement and normal sprite remain unchanged until after storm 1. Storm 1 gives mild slowing; storm 2 permits stumbling; later storms deepen the fatigue; failed ESCAPE sets the final severe stage. The hallway stumble/rest and thoughts remain.

Validation: syntax, isolated movement and storm/notification state checks passed, new sprite cells checked, remaining visible INNER THOUGHT labels absent, contact text checked. Full browser playback and speaker listening were not performed.


## 67.18.1 — NCADA on the final support page

Added National Council Against Drug Abuse (NCADA), a concise description of its drug prevention resources and community work, and a new-tab link to https://www.ncada.org.sg/ alongside the existing support information. Official homepage checked 19 September 2026. Existing helplines and gameplay unchanged.


## 67.18.2 — Stronger overall audio

Doubled master gain at initialization and during updates, including ESCAPE focus (approximately +6 dB before compression). Room ambience layers receive an additional 1.5x gain, giving approximately +9.5 dB combined before compression. Existing compressor, mute, volume slider and saved preferences remain. Syntax and archive integrity checked; target-device listening remains unverified.
