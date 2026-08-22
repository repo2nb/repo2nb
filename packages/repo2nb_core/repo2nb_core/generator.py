"""Ported from repo2nb-cli/repo2nb/converter.py, adapted for uploaded file dicts."""

from . import deps as deps_mod
from .notebook import make_markdown_cell, make_pip_cell, make_writefile_cell
from .targets import get_target
from .targets.kaggle import get_remote_suffix
from .warnings import get_warning_cells

# CLI's exact binary/data skip list
BINARY_EXTENSIONS = {
    ".pkl", ".pt", ".h5", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".tar", ".gz",
    ".csv", ".tsv", ".xlsx", ".xls", ".parquet", ".db", ".sqlite", ".pdf", ".ipynb",
}

SETUP_HEADER = (
    "## 🔧 repo2nb setup (safe to collapse)\n\n"
    "Git auth and dependency installation. Collapsed where the viewer supports it: expand if you need to debug."
)


def _is_binary(path: str) -> bool:
    ext = ("." + path.rsplit(".", 1)[-1].lower()) if "." in path else ""
    return ext in BINARY_EXTENSIONS


def generate(
    files: dict[str, bytes],
    selected: list[str],
    target_name: str,
    omit_instructions: bool = False,
) -> dict:
    target = get_target(target_name)
    cells: list[dict] = []

    if not omit_instructions:
        cells.extend(get_warning_cells())

    # Phase 1 + Phase 3 exist only when the project came from a git repo
    git_config = files.get(".git/config")
    git_config_text = git_config.decode("utf-8", errors="replace") if git_config else None
    has_git = any(p == ".git/config" or p.startswith(".git/") for p in files)

    setup_cells: list[dict] = []
    push_cells: list[dict] = []
    if has_git:
        setup_cells.extend(target.auth_cells(get_remote_suffix(git_config_text), omit_instructions))
        push_cells = target.workspace_cells(omit_instructions)

    # Manifest parsing + AST fallback. The CLI additionally shells out to poetry/uv export;
    # that is impossible server-side, so lockfiles are parsed statically instead.
    requirements = deps_mod.collect_deps_files(files)
    if requirements:
        setup_cells.append(make_pip_cell(requirements))

    if setup_cells:
        cells.append(make_markdown_cell(SETUP_HEADER))
        collapse = target.collapse_metadata()
        for cell in setup_cells:
            # Collapse code cells only; keep instruction markdown readable for debugging.
            if cell["cell_type"] == "code":
                cell["metadata"].update(collapse)
            cells.append(cell)

    if omit_instructions:
        phase2_text = "# 📂 Phase 2: Repository Construction"
    else:
        phase2_text = (
            "# 📂 Phase 2: Repository Construction\n"
            "---\n"
            "The following cells will recreate your project files within the platform's environment."
        )
    cells.append(make_markdown_cell(phase2_text))

    # Group selected paths by directory (CLI walks the real tree; we derive it from paths)
    by_dir: dict[str, list[str]] = {}
    for path in selected:
        dir_part = path.rsplit("/", 1)[0] if "/" in path else ""
        by_dir.setdefault(dir_part, []).append(path)

    def depth_of(dir_path: str) -> int:
        return len(dir_path.split("/")) if dir_path else 0

    for dir_path in sorted(by_dir, key=lambda d: (depth_of(d), d)):
        group = sorted(by_dir[dir_path])
        depth = depth_of(dir_path)
        header_level = "#" if depth == 0 else min(depth + 1, 4) * "#"
        folder_name = dir_path.rsplit("/", 1)[-1] if dir_path else "project root"
        cells.append(make_markdown_cell(f"{header_level} 📁 {folder_name}"))

        for path in group:
            name = path.rsplit("/", 1)[-1]
            if _is_binary(path):
                cells.append(make_markdown_cell(f"**Skipped data/binary file**: `{path}`\n*(Upload manually if needed)*"))
                continue
            cells.append(make_markdown_cell(f"**📄 {name}**"))
            content = files.get(path, b"")
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                cells.append(make_markdown_cell(f"**Skipped non-UTF8 file**: `{path}`\n*(Upload manually if needed)*"))
                continue
            cells.append(make_writefile_cell(path, text, prefix=target.WORKDIR_PREFIX))

    cells.extend(push_cells)

    from .notebook import assemble_notebook

    return assemble_notebook(cells, target=target_name)
