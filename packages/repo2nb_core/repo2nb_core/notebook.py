"""Cell builders, ported from repo2nb-cli's notebook.py. Cells are plain dicts (nbformat v4)."""

import hashlib
from datetime import UTC, datetime

VERSION = "0.1.0"

def content_hash(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def make_markdown_cell(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": text.splitlines(keepends=True)}


def make_code_cell(code: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "source": code.splitlines(keepends=True),
        "outputs": [],
        "execution_count": None,
    }


def make_writefile_cell(filepath: str, content: str, prefix: str = "/kaggle/working/") -> dict:
    code = f"%%writefile {prefix}{filepath}\n{content}"
    cell = make_code_cell(code)
    cell["metadata"]["repo2nb"] = {
        "path": filepath,
        "hash": content_hash(content),
        "generated_by": VERSION,
    }
    return cell


def make_pip_cell(requirements: list) -> dict:
    return make_code_cell("%pip install -q " + " ".join(requirements))


def assemble_notebook(cells: list, target: str = "kaggle") -> dict:
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "repo2nb": {
                "version": VERSION,
                "generated_at": datetime.now(UTC).isoformat(),
                "target": target,
            },
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }
