# Waka pixel policy API — version 1

For conversational browser coaching, open [the browser arcade](https://malpern.github.io/talk-topics/waka/play/) and read [the coaching interface](https://malpern.github.io/talk-topics/waka/play/webmcp.md). It supports validated recipes, bounded trials, and optional WebMCP. The native JSONL interface below remains available for custom policy code.


Human guide: https://malpern.github.io/talk-topics/waka/human.html
Agent guide: https://malpern.github.io/talk-topics/waka/agents.md
Schema: https://malpern.github.io/talk-topics/waka/protocol.schema.json

Skill bundle: https://malpern.github.io/talk-topics/waka/waka-agent-skill.zip

## Quick start

Press G in the native game to play with the bundled reference agent.
For a custom policy, a human hosts with H, then 1 (Equalized), and the policy
connects through the trusted gateway:

Mac:
    /Applications/Waka.app/Contents/MacOS/Waka --agent-connect HOST:24880 --policy python3 my_agent.py
Linux:
    ./Waka --agent-connect HOST:24880 --policy python3 my_agent.py
Windows PowerShell:
    .\Waka.exe --agent-connect HOST:24880 --policy python my_agent.py

Use 127.0.0.1 for a same-machine host. Use a reachable Tailscale name/address
for remote play. Match the host's build. All arguments after the policy
executable are passed literally to it; the gateway does not invoke a shell.
Policies run with your normal account permissions. Only run code you trust.

## Transport

Each observation is one UTF-8 JSON object and newline on stdin. Each action
is one UTF-8 JSON object and newline on stdout. Flush every action. Put logs
on stderr. EOF, invalid JSON, unknown action fields, invalid directions or
oversized output end the gateway and its network session.

Observation example (valid all-black image):
    {"version":1,"frame":42,"player":1,"delay_ticks":24,"width":224,"height":288,"runs":[[64512,0]]}

Action example:
    {"frame":42,"direction":"up"}

Observation fields:
- version: 1.
- frame: nonnegative released presentation frame ID; echo it in the action.
- player: 0 = yellow, 1 = cyan. This is your assigned slot.
- delay_ticks: public session input + display buffering, normally 24 ticks.
- width: 224; height: 288.
- runs: row-major [count, RGB24] pairs. count is positive; RGB24 is an integer
  from 0 through 16777215 (0xRRGGBB). Counts must sum to 64512.

Coordinates start at top left; x increases right, y down. The RGB channels are
(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255. Alpha is implicitly 255.
The bundled decoder requires protocol version 1, valid dimensions/player,
bounded runs, and the exact complete image. It accepts at most 2 MiB per input
line. The gateway accepts action lines of at most 256 bytes including newline.

Directions: keep, up, left, down, right. Keep retains the previous input. A turn
is queued until legal. You cannot pause, reset, teleport, request a route or
change game state through this API.

## Observation boundary

The policy gets only the 224x288 gameplay framebuffer, before optional CRT
processing and local lobby/status overlays, plus public frame/player/latency
metadata. The same observation pixels feed the native renderer. The image
contains visible HUD and animations; no separate audio feed is supplied.

There are no actor structs, ghost targets, exact fright timers, house counters,
seeds, ROM tables, movement phases or future simulation states. You may remember
past images and infer motion or other information from them.

The trusted gateway owns the UDP Peer, complete simulation and checksums. The
policy is a separate process; its crate depends only on serialization libraries.
This data/API boundary is not an OS sandbox, a compute budget or anti-cheat
attestation of modified remote clients.

## Timing and slow policies

Agent sessions require Equalized; Responsive is rejected. Observations are
published only after the common presentation schedule releases the frame.
Intermediate catch-up images may be skipped. Never assume consecutive IDs.

A matching action must arrive before the next input sample. Sampling happens on
the shared 16,500-microsecond tick boundaries. Transfer and scheduling reduce the
available decision window; a full 16.5 ms compute budget is not guaranteed.
At the deadline, the first accepted action is used or the previous input repeats.
Late, duplicate and future-frame responses are discarded. No participant waits
for the agent. An expired reply cannot later change an input slot.

The writer has one queued observation in addition to any in-flight pipe write;
it drops new observations rather than accumulating unlimited backlog when the
policy is slow. Keep your loop warm, read promptly, and flush stdout.

The session's uniform delay applies after sampling, just as for human inputs.
Default Equalized buffering is 12 input ticks + 12 display ticks = about 396 ms,
plus device/transport/scheduler overhead. Physical cross-machine display timing
under load is still a separate qualification task.

## Minimal Python policy

    import json, sys
    for line in sys.stdin:
        observation = json.loads(line)
        print(json.dumps({"frame": observation["frame"], "direction": "left"}), flush=True)

This is a connection example, not a capable player. The bundled reference
policy locates color components, remembers observed maze walls, plans paths to
visible pellets, adds costs near visible ghosts, and anticipates visible
junctions from the public delay. It does not replay a prerecorded route.

## Verification checklist

- Round-trip pixels exactly; reject invalid lengths, colors and dimensions.
- Alter hidden-only state: the observation must stay identical.
- Alter a visible score or remove pixels: the displayed image must change/fail.
- Sleep or send an old frame ID: inputs repeat and everyone else keeps moving.
- Exercise both slots, tunnels, respawn flicker, corners and full network delay.
- A zero-delay clear alone does not prove delayed network gameplay.
