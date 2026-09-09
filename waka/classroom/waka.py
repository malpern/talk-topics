"""Optional, readable standard-library helpers for classroom agents."""
from collections import deque

MOVES = {"up": (0, -1), "right": (1, 0), "down": (0, 1), "left": (-1, 0)}


def me(observation):
    return observation["agents"][observation["you"]]


def distance(a, b):
    """Manhattan estimate. Use nearest() for actual paths around walls."""
    return abs(a[0]-b[0]) + abs(a[1]-b[1])


def nearest(observation, targets, avoid=()):
    """Return first move on a shortest path to any target (BFS), or stay.

    Avoid contains [x,y] cells to exclude. Portal destinations are graph edges.
    Direction order rotates per agent to break identical shortest-path ties.
    """
    start = tuple(me(observation)["position"])
    targets = {tuple(p) for p in targets}
    blocked = {tuple(p) for p in avoid}
    if not targets or start in targets:
        return "stay"
    grid = observation["grid"]
    portals = {tuple(p["position"]): tuple(p["destination"]) for p in observation["portals"]}
    moves = list(MOVES.items())
    offset = observation["you"] % 4
    moves = moves[offset:] + moves[:offset]
    queue = deque([(start, "stay")])
    seen = {start}
    while queue:
        (x, y), first = queue.popleft()
        for move, (dx, dy) in moves:
            p = (x+dx, y+dy)
            if not (0 <= p[0] < observation["width"] and 0 <= p[1] < observation["height"]):
                continue
            if grid[p[1]][p[0]] == "#" or p in blocked:
                continue
            p = portals.get(p, p)
            if p in seen or p in blocked:
                continue
            step = move if first == "stay" else first
            if p in targets:
                return step
            seen.add(p)
            queue.append((p, step))
    return "stay"
