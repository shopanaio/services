#!/usr/bin/env python3
import json
import os
import sys
from typing import Dict


def read_env_file(env_path: str) -> Dict[str, str]:
    """Read a simple KEY=VALUE .env file and return a dict."""
    values: Dict[str, str] = {}
    if not env_path or not os.path.isfile(env_path):
        return values
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                values[key] = val
    except Exception:
        # Silently ignore malformed files to keep inventory usable
        pass
    return values


def build_inventory(env: Dict[str, str]) -> Dict:
    """Build dynamic inventory from .env and environment variables."""
    # Fallback to OS environment variables when .env does not provide a value
    effective = dict(env)
    for k in ("SHOPANA_HOST", "SHOPANA_USER", "SHOPANA_SSH_PORT", "SHOPANA_SSH_KEY"):
        if not effective.get(k):
            v = os.environ.get(k)
            if v:
                effective[k] = v

    host = (effective.get("SHOPANA_HOST", "") or "").strip()
    user = (effective.get("SHOPANA_USER", "ubuntu") or "ubuntu").strip()
    port = (effective.get("SHOPANA_SSH_PORT", "22") or "22").strip()
    key = (effective.get("SHOPANA_SSH_KEY", "") or "").strip()

    hostvars: Dict[str, object] = {}
    if host:
        hostvars["ansible_host"] = host
        hostvars["ansible_user"] = user
        hostvars["ansible_port"] = int(port) if str(port).isdigit() else 22
        if key:
            hostvars["ansible_ssh_private_key_file"] = os.path.expanduser(key)

    inventory = {
        "_meta": {
            "hostvars": {
                "shopana_target": hostvars
            }
        },
        "shopana": {
            "hosts": ["shopana_target"] if host else []
        }
    }
    return inventory


def main():
    # Look for .env only in the ansible/ directory
    here = os.path.abspath(os.path.dirname(__file__))
    ansible_dir = os.path.abspath(os.path.join(here, os.pardir))
    env_path = os.path.join(ansible_dir, ".env")

    env = read_env_file(env_path)
    inv = build_inventory(env)

    # Support Ansible dynamic inventory protocol
    if len(sys.argv) == 2 and sys.argv[1] == "--list":
        print(json.dumps(inv))
        return
    if len(sys.argv) == 3 and sys.argv[1] == "--host":
        host = sys.argv[2]
        print(json.dumps(inv.get("_meta", {}).get("hostvars", {}).get(host, {})))
        return

    # If no host is configured, give a clear hint
    if not inv.get("shopana", {}).get("hosts"):
        sys.stderr.write(
            "SHOPANA_HOST is empty. Provide it via ansible/.env or environment variables.\n"
            f"Expected path: {env_path}\n"
        )
    print(json.dumps(inv))


if __name__ == "__main__":
    main()
