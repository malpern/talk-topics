# Coach a Waka partner

Play: https://malpern.github.io/talk-topics/waka/play/

The fast image-only policy runs in a worker. An assistant configures that
policy and evaluates trials; it does not need to call a tool for every turn.
No AI API key or built-in language model is used by this page.

## With any assistant

1. Describe your partner in the game's coaching box and copy the prompt.
2. Paste it into ChatGPT or your preferred coding assistant.
3. Paste its JSON recipe into the game and choose **Use this recipe**.
4. Choose **Run 30-second trial**. Copy results back to the assistant and ask
   it to suggest a better recipe. Compare multiple runs and your own playing feel.
5. Choose **Play with partner**. You are yellow, the policy is cyan.

Example recipe:

```json
{"name":"Scout","caution":80,"exploration":25,"chaseRange":2}
```

- caution: 0–100. Scales route penalties near visibly dangerous ghosts.
- exploration: 0–100. Adds a cost to remembered, frequently visited tiles.
- chaseRange: 0–8 tiles. Pursue nearby, visibly blue ghosts; zero disables pursuit.
- name: 1–40 characters.

These are heuristics, not guaranteed behaviors. Only validated configuration is
accepted; importing a recipe does not execute arbitrary JavaScript. The policy
has no access to the live game's hidden targets, timers, seed, or simulation.

## With WebMCP

The page feature-detects `document.modelContext` (with the older navigator alias
as a fallback) and registers:

- `waka_configure_partner`: apply a validated recipe without restarting.
- `waka_start_game`: start solo, partner, or two-human local co-op.
- `waka_pause_game`: pause/resume a visible local game.
- `waka_run_trial`: 300–3600 frames, accelerated in an isolated worker;
  pauses and preserves the live game, supports cancellation, and stops at 60
  seconds of wall time. Two copies of the policy play together.
- `waka_get_results`: public HUD/session values, recipe, last ten trial results.

A compatible assistant must be connected to the open tab and support WebMCP.
This is not automatically available in every ChatGPT client. Unsupported browsers
retain the complete copy/paste workflow. The page does not install extensions,
change browser flags, enroll in origin trials, or claim an active chat connection.

Implementation follows Chrome's imperative API, checked 2026-09-05:
https://developer.chrome.com/docs/ai/webmcp/imperative-api

## Verification and compatibility

The in-app browser passed live configure, trial, results, start and pause calls.
Browser integrations can differ: Chrome's documented `executeTool` takes a
retrieved tool and a JSON argument string; the tested in-app bridge accepts the
retrieved tool and an argument object. Prefer your assistant's browser tool
interface. Registration alone does not prove a chat client can invoke tools.

Trials use a fixed seed for comparable recipes. Repeating the same recipe is
expected to repeat the same result; it is not an independent sample.

## Timing boundary

Browser play is local with no network fairness claim. Rendering uses the same
224×288 pixels and the same Rust cabinet as native Waka. Original tick duration
is 16.5 ms. Browser stalls over 250 ms pause play; hidden tabs pause until resumed.
Human input and worker replies are sampled by the local tick loop. Replies older
than three simulation ticks or from an earlier session are discarded, and the
prior direction remains. Worker observations never build an unbounded backlog.

Trials are deterministic local zero-delay evaluations; they do not prove
Equalized network play, human/agent reaction parity, or policy superiority.
