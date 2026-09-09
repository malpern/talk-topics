"""Readable helpers for classroom API v2: route, survive, then choose a goal."""
from collections import deque

MOVES = {'up': (0,-1), 'right': (1,0), 'down': (0,1), 'left': (-1,0)}


def me(observation): return observation['agents'][observation['you']]
def distance(a, b): return abs(a[0]-b[0])+abs(a[1]-b[1])


def destination(observation, position, move, portals=True):
    """Next tile, including side tunnels and (for players) paired teleports."""
    dx, dy = MOVES.get(move, (0,0))
    x, y = position[0]+dx, position[1]+dy
    if y == observation['tunnel_y']: x %= observation['width']
    if not (0 <= x < observation['width'] and 0 <= y < observation['height']) or observation['grid'][y][x] != '.':
        return tuple(position)
    p = (x,y)
    if portals and p != tuple(position):
        for portal in observation['portals']:
            if tuple(portal['position']) == p: return tuple(portal['destination'])
    return p


def action_positions(observation, move):
    """Player substeps, including the predator's even-tick corridor burst."""
    own = me(observation)
    start = tuple(own['position'])
    first = destination(observation, start, move)
    positions = [first]
    if own['predator_ticks'] and not own['shield_ticks'] and observation['tick'] % 2 == 0 and move != 'stay':
        reverse = {'up':'down', 'down':'up', 'left':'right', 'right':'left'}[move]
        forward = [d for d in MOVES if d != reverse and destination(observation, first, d) != first]
        if forward == [move]: positions.append(destination(observation, first, move))
    return positions


def route(observation, targets, avoid=()):
    """BFS returns (first_move, number_of_ticks), or ('stay', None).

    Timed hunters should check distance against predator_ticks before chasing.
    """
    start = tuple(me(observation)['position'])
    goals, blocked = {tuple(p) for p in targets}, {tuple(p) for p in avoid}
    if start in goals: return 'stay', 0
    if not goals: return 'stay', None
    moves = list(MOVES)
    offset = observation['you'] % 4
    moves = moves[offset:]+moves[:offset]
    queue, seen = deque([(start, 'stay', 0)]), {start}
    while queue:
        p, first, length = queue.popleft()
        for move in moves:
            q = destination(observation, p, move)
            if q in seen or q in blocked: continue
            step = move if first == 'stay' else first
            if q in goals: return step, length+1
            seen.add(q); queue.append((q, step, length+1))
    return 'stay', None


def nearest(observation, targets, avoid=()): return route(observation, targets, avoid)[0]


def pickups(observation, kind):
    return [p['position'] for p in observation['powerups'] if p['available'] and p['kind'] == kind]


def threats(observation):
    """Real opponents now: ghosts stay dangerous even when you are a predator."""
    own = me(observation)
    if own['shield_ticks'] > 2: return []
    result = [(g['position'], False) for g in observation['ghosts'] if g['state']=='chase']
    if not own['predator_ticks']:
        result += [(a['position'], True) for a in observation['agents'] if a['id'] != own['id'] and a['alive']
                   and a['predator_ticks'] and not a['shield_ticks']]
    return result


def danger(observation): return [p for p, _ in threats(observation)]


def safety_map(observation):
    """Shortest arrival distance of a threat; walls and ghost-only tunnel rules matter."""
    distances = {}
    for start, use_portals in threats(observation):
        start = tuple(start)
        queue, seen = deque([(start,0)]), {start}
        while queue:
            p, length = queue.popleft()
            distances[p] = min(distances.get(p, 999), length)
            # Only immediate danger needs an exact search.
            if length >= 7: continue
            for move in MOVES:
                q = destination(observation, p, move, portals=use_portals)
                if q not in seen: seen.add(q); queue.append((q, length+1))
    return distances


def emergency(observation, radius=3):
    """Return an escape direction if threatened, otherwise None. Never hunt a ghost
    just because you hold predator: only an energizer makes ghosts edible.
    """
    own = me(observation)
    if not own['alive']: return 'stay'
    distances = safety_map(observation)
    here = tuple(own['position'])
    if distances.get(here, 99) > radius: return None
    energizers = {tuple(p) for p in pickups(observation, 'energizer')}
    def value(move):
        p = destination(observation, here, move)
        # A reachable energizer handles ghost danger, but not another predator.
        return min(distances.get(q,99) for q in action_positions(observation,move)) + (4 if p in energizers and not any(player for _,player in threats(observation)) else 0)
    choices = [m for m in observation['legal_moves'] if m != 'stay'] or ['stay']
    return max(choices, key=value)


def vulnerable_players(observation):
    own = me(observation)
    return [a for a in observation['agents'] if a['id'] != own['id'] and a['alive']
            and not a['shield_ticks'] and not a['predator_ticks']]


def hunt(observation):
    """Pursue edible prey only when the shortest route leaves a timer margin."""
    own = me(observation)
    if own['predator_ticks'] and not own['shield_ticks']:
        move, length = route(observation, [a['position'] for a in vulnerable_players(observation) if a['score'] >= 25], avoid=danger(observation))
        if length is not None and length+3 < own['predator_ticks']: return move
    if observation['frightened_ticks'] > 4:
        move, length = route(observation, [g['position'] for g in observation['ghosts'] if g['state']=='frightened'], avoid=danger(observation))
        if length is not None and length+3 < observation['frightened_ticks']: return move
    return None
