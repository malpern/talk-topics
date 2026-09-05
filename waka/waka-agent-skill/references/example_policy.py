import json, sys

for line in sys.stdin:
    observation = json.loads(line)
    # Replace this fixed direction with your policy.
    action = {"frame": observation["frame"], "direction": "left"}
    print(json.dumps(action), flush=True)
