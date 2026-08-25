"""JSON-in/JSON-out bridge for the browser (Pyodide) build of the engine.

The offline web worker calls these with base64-encoded file contents so everything
crosses the JS<->Python boundary as plain strings. Mirrors the server API shapes.
"""

import base64
import json

from . import generator, scanner


def scan_payload(payload: str) -> str:
    """payload: {files: [{path, size}], gitignore?: str, repo2nbignore?: str}"""
    data = json.loads(payload)
    nodes = scanner.scan(data["files"], data.get("gitignore"), data.get("repo2nbignore"))
    included = [n for n in nodes if n["included"]]
    return json.dumps(
        {
            "files": nodes,
            "total_bytes": sum(n["size"] for n in included),
            "included_count": len(included),
        }
    )


def generate_payload(payload: str) -> str:
    """payload: {files: {path: base64}, selection: [path], target: str}"""
    data = json.loads(payload)
    files = {path: base64.b64decode(b64) for path, b64 in data["files"].items()}
    selected = [p for p in data["selection"] if p in files]
    if not selected:
        raise ValueError("No files selected. Check at least one code file in the tree.")
    if data["target"] not in ("kaggle", "colab"):
        raise ValueError(f"Unknown target '{data['target']}'. Use kaggle or colab.")
    nb = generator.generate(files, selected, data["target"])
    return json.dumps({"notebook": nb})
