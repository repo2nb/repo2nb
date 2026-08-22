"""Ported from repo2nb-cli/repo2nb/warnings.py."""

from .notebook import make_markdown_cell


def get_warning_cells() -> list:
    usage_text = (
        "<div style=\"padding: 20px; background-color: #e8f4fd; border-left: 6px solid #1976d2; font-size: 1.25em; margin-top: 10px;\">\n"
        "<h2>⚠️ USAGE INSTRUCTION</h2>\n"
        "Use <b>Run All</b> <i>only on your first use</i> to reconstruct the repository. After initial setup, run cells individually so you don't overwrite your manual edits!\n"
        "</div>"
    )
    return [make_markdown_cell(usage_text)]
