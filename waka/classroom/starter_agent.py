"""Your first classroom agent. Load this .py file in File → Settings.

No installs needed: waka is supplied by the classroom host.
Change this function, save, then start a new round to load your changes.
"""
from waka import nearest, emergency, danger


def decide(observation, memory):
    escape = emergency(observation)
    if escape is not None:
        return {"move": escape, "signal": "Escaping danger"}
    # observation is a fresh dictionary. memory survives between your turns.
    memory["turns"] = memory.get("turns", 0) + 1
    return {"move": nearest(observation, observation["pellets"], avoid=danger(observation)),
            "signal": "Learning by doing"}
