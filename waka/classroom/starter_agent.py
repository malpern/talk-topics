"""Your first classroom agent. Load this .py file in File → Settings.

No installs needed: waka is supplied by the classroom host.
Change this function, save, then start a new round to load your changes.
"""
from waka import nearest


def decide(observation, memory):
    # observation is a fresh dictionary. memory survives between your turns.
    memory["turns"] = memory.get("turns", 0) + 1
    return {"move": nearest(observation, observation["pellets"]),
            "signal": "Learning by doing"}
