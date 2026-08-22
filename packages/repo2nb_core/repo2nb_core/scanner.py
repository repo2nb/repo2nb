"""Filter layering: built-in defaults -> project .gitignore -> project .repo2nbignore.

Each layer may override the one before it (a `!pattern` in .repo2nbignore re-includes
something the defaults excluded). Within a layer, last matching pattern wins, like git.
"""

import pathspec

from .defaults import DEFAULT_RULES

LAYER_DEFAULTS = "repo2nb defaults"
LAYER_GITIGNORE = ".gitignore"
LAYER_REPO2NBIGNORE = ".repo2nbignore"


def _spec(patterns: list[str]) -> pathspec.PathSpec:
    return pathspec.GitIgnoreSpec.from_lines(patterns)


def default_spec() -> pathspec.PathSpec:
    return _spec([r["pattern"] for r in DEFAULT_RULES])


def decide(
    path: str,
    layers: list[tuple[str, pathspec.PathSpec]],
) -> tuple[bool, str]:
    """Return (included, reason). Each layer with a match overrides earlier ones."""
    included, reason = True, ""
    for name, spec in layers:
        patterns = spec.patterns
        last = None
        for p in patterns:
            if p.include is not None and p.match_file(path):
                last = p
        if last is None:
            continue
        if last.include:  # positive pattern -> ignored
            rule = next((r for r in DEFAULT_RULES if r["pattern"] == last.pattern), None)
            included = False
            reason = f"excluded by {name}" + (f": {rule['reason']}" if rule else "")
        else:  # negation (!pattern) -> re-included
            included, reason = True, f"re-included by your {name}"
    return included, reason


def scan(
    files: list[dict],
    gitignore: str | None,
    repo2nbignore: str | None,
) -> list[dict]:
    """files: [{path, size}] (paths relative to project root, '/' separators).

    Returns the same list annotated with {included, reason}.
    """
    layers: list[tuple[str, pathspec.PathSpec]] = [("defaults", default_spec())]
    if gitignore:
        layers.append((LAYER_GITIGNORE, _spec(gitignore.splitlines())))
    if repo2nbignore:
        layers.append((LAYER_REPO2NBIGNORE, _spec(repo2nbignore.splitlines())))

    out = []
    for f in files:
        included, reason = decide(f["path"], layers)
        out.append({**f, "included": included, "reason": reason})
    return out
