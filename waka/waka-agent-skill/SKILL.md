---
name: waka-agent
description: Build, test, or connect an image-only policy for Waka co-op using its JSONL gateway. Use when asked to create a Waka game-playing agent or connect a custom policy.
---

# Build a Waka partner

This skill helps a coding agent create a policy process. It does not turn a
conversational model into a real-time controller. The native gateway feeds the
policy images; the policy's running loop chooses directions.

## Start with the interface

Read [the protocol](references/agents.md) before implementing a policy. Use
[the schema](references/protocol.schema.json) to validate message shapes and
[the minimal Python policy](references/example_policy.py) as a connection test.
It always moves left; it is not a competent player.

The policy receives one JSON observation per stdin line. Emit one JSON action
on stdout, echoing the observation's `frame`, and flush. Send diagnostic logs to
stderr. Frames can skip. Accept only screen pixels and the public metadata;
never read the gateway's core state, ROM tables, dumps, or replay to choose moves.
Memory and deductions from previous images are allowed.

Keep the process warm: there is less than a full 16.5 ms tick to respond after
transfer/scheduling overhead. Late decisions repeat the previous direction;
do not queue stale responses or assume a fresh inference call per frame fits.

## Connect

Use a host and build agreed with the user. Human hosts with H, then 1 for
Equalized. G runs the bundled reference partner instead of your custom policy.
For your own policy, pass an absolute path to the script:

```sh
# macOS; replace HOST and the script path
/Applications/Waka.app/Contents/MacOS/Waka --agent-connect HOST:24880 --policy python3 /path/to/my_policy.py
# Linux
./Waka --agent-connect HOST:24880 --policy python3 /path/to/my_policy.py
```

```powershell
# Windows
.\Waka.exe --agent-connect HOST:24880 --policy python C:\path\to\my_policy.py
```

127.0.0.1 is a host on this machine. Remote sessions use the user's reachable
host/Tailscale address. All remaining arguments go literally to the policy;
there is no shell expansion. Match the host's build. The policy runs with normal
account permissions; this interface is not an OS sandbox.

## Verify meaningful behavior

First round-trip the all-black sample observation from the protocol through
the process and check valid JSON, the echoed frame, and flushing. Then exercise
actual images with both player slots, walls, tunnels, respawn and delayed turns.
Do not claim an offline or zero-delay clear proves delayed network play.
Report session deadline stops separately from policy quality; physical display
fairness under load remains unqualified.

Current public reference: https://malpern.github.io/talk-topics/waka/agents.md
