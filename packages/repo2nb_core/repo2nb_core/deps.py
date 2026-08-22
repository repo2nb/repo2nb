"""Parse dependency manifests already present in the upload. No subprocesses, no network."""

import ast
import re
import sys
import tomllib

_SKIP_REQ = re.compile(r"^\s*(-r|--requirement|-e|--editable|--index-url|-f|--find-links|-c|--constraint|[#;])")


def from_requirements_txt(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        if _SKIP_REQ.match(line) or not line.strip():
            continue
        out.append(line.split("#")[0].strip())
    return [d for d in out if d]


def from_pyproject(data: bytes) -> list[str]:
    parsed = tomllib.loads(data.decode())
    deps: list[str] = list(parsed.get("project", {}).get("dependencies", []))
    poetry = parsed.get("tool", {}).get("poetry", {}).get("dependencies", {})
    for name in poetry:
        if name == "python":
            continue
        deps.append(name)  # ponytail: poetry constraints don't map to pip specs; bare name is the safe install
    return deps


def from_poetry_lock(data: bytes) -> list[str]:
    parsed = tomllib.loads(data.decode())
    return [f"{p['name']}=={p['version']}" for p in parsed.get("package", [])]


def collect_deps_files(files: dict[str, bytes]) -> list[str]:
    """files: {root-relative path: content}. Prefers lockfile pins when present."""
    lower = {k.lower(): (k, v) for k, v in files.items()}
    for name in ("poetry.lock", "requirements.txt"):
        hit = next((v for k, v in lower.items() if k.endswith(name)), None)
        if hit:
            text = hit[1].decode("utf-8", errors="replace")
            return from_poetry_lock(text.encode()) if name == "poetry.lock" else from_requirements_txt(text)
    hit = next((v for k, v in lower.items() if k == "pyproject.toml"), None)
    if hit:
        return from_pyproject(hit[1])
    # no manifest: scan imports (unpinned), like the CLI does
    return from_import_scan(files)


# Common import-name -> pip-name mismatches (ported from repo2nb-cli).
_IMPORT_ALIASES = {
    "cv2": "opencv-python",
    "PIL": "pillow",
    "yaml": "pyyaml",
    "sklearn": "scikit-learn",
    "skimage": "scikit-image",
    "bs4": "beautifulsoup4",
    "git": "gitpython",
    "dotenv": "python-dotenv",
}


def from_import_scan(files: dict[str, bytes]) -> list[str]:
    """Fallback when no manifest exists: AST-scan .py files for third-party imports."""
    stdlib = set(sys.stdlib_module_names)
    top_level = {p.split("/")[0].removesuffix(".py") for p in files}  # project's own modules
    mods = set()
    for path, data in files.items():
        if not path.endswith(".py"):
            continue
        try:
            tree = ast.parse(data.decode("utf-8", errors="replace"))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                mods.update(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                mods.add(node.module.split(".")[0])
    third = {m for m in mods if m not in stdlib and m not in top_level}
    return sorted(_IMPORT_ALIASES.get(m, m) for m in third)
