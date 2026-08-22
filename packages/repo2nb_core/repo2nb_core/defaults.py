"""Built-in default filter rules. Single source of truth for scanner AND the /filters docs page.

Philosophy: defaults ignore DIRECTORIES only, plus specific junk extensions
(.pyc-style caches are covered by their cache dirs). Users add more extensions
via .repo2nbignore or tree checkboxes. Large unwanted files are also handled
by size (auto-unchecked over LARGE_FILE_BYTES), not by name. Only hard
exception: secret/key material, where leaking beats inconvenience.
"""

DEFAULT_RULES: list[dict] = [
    # Data files (per-file rule: code next to them is unaffected)
    {"pattern": "*.csv", "reason": "dataset file"},
    # Dependency directories
    {"pattern": "node_modules/", "reason": "dependency folder"},
    {"pattern": ".venv/", "reason": "virtualenv folder"},
    {"pattern": "venv/", "reason": "virtualenv folder"},
    {"pattern": "site-packages/", "reason": "dependency folder"},
    {"pattern": "vendor/", "reason": "dependency folder"},
    {"pattern": "*.egg-info/", "reason": "package build metadata"},
    # Caches and build artifacts
    {"pattern": "__pycache__/", "reason": "cache"},
    {"pattern": ".pytest_cache/", "reason": "cache"},
    {"pattern": ".mypy_cache/", "reason": "cache"},
    {"pattern": ".ruff_cache/", "reason": "cache"},
    {"pattern": ".hypothesis/", "reason": "cache"},
    {"pattern": ".parcel-cache/", "reason": "cache"},
    {"pattern": ".next/", "reason": "build output"},
    {"pattern": "dist/", "reason": "build output"},
    {"pattern": "build/", "reason": "build output"},
    {"pattern": ".turbo/", "reason": "build output"},
    {"pattern": "checkpoints/", "reason": "model checkpoint directory"},
    # Version control and tooling internals
    {"pattern": ".git/", "reason": "version control internals"},
    {"pattern": ".github/", "reason": "CI config: not needed at runtime"},
    {"pattern": ".vscode/", "reason": "editor config"},
    {"pattern": ".idea/", "reason": "editor config"},
    # Secrets (the one non-directory exception: never leak these)
    {"pattern": ".env*", "reason": "environment / secrets"},
]

# Limits shared by client budgeting and server enforcement.
MAX_TOTAL_BYTES = 4 * 1024 * 1024  # 4 MB direct-path cap (Vercel hard limit is 4.5 MB)
MAX_FILES = 1500
LARGE_FILE_BYTES = 150 * 1024  # auto-uncheck threshold on the tree screen
