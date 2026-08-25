import json
import pathlib

from repo2nb_core import deps, generator, scanner
from repo2nb_core.defaults import DEFAULT_RULES, LARGE_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES
from repo2nb_core.notebook import VERSION
from repo2nb_core.scanner import _spec, decide


def test_web_rules_json_matches_core():
    """The web /filters page renders from a committed JSON snapshot; this test keeps it
    in sync with the single source of truth in defaults.py."""
    snapshot = pathlib.Path(__file__).parents[2] / "apps" / "web" / "lib" / "default-rules.json"
    if not snapshot.exists():  # core tests must pass when run outside the monorepo too
        return
    data = json.loads(snapshot.read_text())
    assert data["rules"] == DEFAULT_RULES
    assert data["limits"] == {
        "max_total_bytes": MAX_TOTAL_BYTES,
        "max_files": MAX_FILES,
        "large_file_bytes": LARGE_FILE_BYTES,
    }


def _sources(cells):
    return ["".join(c["source"]) for c in cells]


def test_defaults_exclude_and_reason():
    files = [
        {"path": "app/main.py", "size": 10},
        {"path": "node_modules/react/index.js", "size": 10},
        {"path": "__pycache__/main.cpython-312.pyc", "size": 10},
        {"path": ".env", "size": 10},
    ]
    out = scanner.scan(files, gitignore=None, repo2nbignore=None)
    by_path = {f["path"]: f for f in out}
    assert by_path["app/main.py"]["included"]
    assert not by_path["node_modules/react/index.js"]["included"]
    assert "dependency folder" in by_path["node_modules/react/index.js"]["reason"]
    assert not by_path[".env"]["included"]


def test_gitignore_layer_overrides_defaults():
    # checkpoints/ is a default exclusion, but the project re-includes it via .gitignore negation
    files = [{"path": "checkpoints/tiny.ckpt", "size": 5}]
    out = scanner.scan(files, gitignore="!checkpoints/", repo2nbignore=None)
    assert out[0]["included"], out[0]["reason"]


def test_repo2nbignore_overrides_everything():
    files = [{"path": "model.ckpt", "size": 5}]
    out = scanner.scan(files, gitignore=None, repo2nbignore="!model.ckpt")
    assert out[0]["included"]
    assert "re-included" in out[0]["reason"]


def test_gitignore_glob():
    layers = [(".gitignore", _spec(["*.log", "build/"]))]
    assert decide("a/b.log", layers) == (False, "excluded by .gitignore")
    assert decide("build/x.py", layers)[0] is False
    assert decide("src/x.py", layers)[0] is True


def test_deps_requirements_txt():
    txt = "# comment\n-r base.txt\ntorch==2.1\nnumpy\n--index-url https://example\n"
    assert deps.from_requirements_txt(txt) == ["torch==2.1", "numpy"]


def test_deps_pyproject_poetry():
    data = b'[tool.poetry.dependencies]\npython = "^3.11"\nrequests = "^2.31"\n'
    assert deps.from_pyproject(data) == ["requests"]


def test_deps_lockfile_preferred():
    files = {
        "requirements.txt": b"numpy",
        "poetry.lock": b'[[package]]\nname = "numpy"\nversion = "1.26.4"\n',
    }
    assert deps.collect_deps_files(files) == ["numpy==1.26.4"]


def test_import_scan_fallback():
    files = {
        "train.py": b"import numpy as np\nfrom PIL import Image\nimport cv2\nfrom mypkg import x\nimport os\n",
        "mypkg/__init__.py": b"",
    }
    assert deps.from_import_scan(files) == ["numpy", "opencv-python", "pillow"]


def test_no_manifest_falls_back_to_import_scan():
    files = {"app.py": b"import sklearn\n"}
    assert deps.collect_deps_files(files) == ["scikit-learn"]


CLI_PARITY_FILES = {
    ".git/config": b'[remote "origin"]\nurl = https://github.com/user/repo.git\n',
    "requirements.txt": b"torch==2.1\n",
    "src/train.py": b"print('hi')\n",
    "README.md": b"# read",
}


def _cells(nb):
    return nb["cells"]


def test_notebook_cli_structure_without_git():
    files = {"requirements.txt": b"torch==2.1\n", "src/train.py": b"print(1)\n"}
    nb = generator.generate(dict(files), selected=["src/train.py"], target_name="kaggle")
    sources = _sources(nb["cells"])
    [c["cell_type"] for c in nb["cells"]]
    # warning banner first
    assert "USAGE INSTRUCTION" in sources[0]
    # no git: no phase 1 / phase 3
    assert not any("Phase 1" in s for s in sources)
    assert not any("Phase 3" in s for s in sources)
    # setup header + pip cell
    assert any("repo2nb setup" in s for s in sources)
    assert any("%pip install -q torch==2.1" in s for s in sources)
    # phase 2 with folder header + writefile
    assert any("Phase 2" in s for s in sources)
    assert any("📁 src" in s for s in sources)
    writefiles = [s for s in sources if s.startswith("%%writefile")]
    assert any(s.startswith("%%writefile /kaggle/working/src/train.py\n") and "print(1)" in s for s in writefiles)
    # metadata parity
    assert nb["metadata"]["repo2nb"]["target"] == "kaggle"
    assert nb["metadata"]["repo2nb"]["version"] == VERSION
    assert nb["nbformat"] == 4


def test_notebook_git_phases_kaggle():
    nb = generator.generate(dict(CLI_PARITY_FILES), selected=["src/train.py"], target_name="kaggle")
    sources = _sources(nb["cells"])
    joined = "\n".join(sources)
    assert "Phase 1: Git Authentication & Setup" in joined
    assert "Add-ons → Secrets" in joined
    assert any('UserSecretsClient().get_secret("GITHUB_TOKEN")' in s for s in sources)
    assert any("https://{token}@github.com/user/repo.git" in s for s in sources)
    assert any("!git pull origin main" in s for s in sources)
    assert "Git Cheat Sheet" in joined
    assert any('# !git push origin main' in s for s in sources)


def test_notebook_colab_target_differences():
    nb = generator.generate(dict(CLI_PARITY_FILES), selected=["src/train.py"], target_name="colab")
    sources = _sources(nb["cells"])
    joined = "\n".join(sources)
    assert "Colab Secrets" in joined
    assert 'userdata.get("GITHUB_TOKEN")' in joined
    assert any(s.startswith("%%writefile /content/src/train.py") for s in sources)


def test_binary_and_setup_collapse():
    files = {**CLI_PARITY_FILES, "data/edges.csv": b"a,b\n1,2\n"}
    selected = ["src/train.py", "data/edges.csv"]
    nb = generator.generate(dict(files), selected=selected, target_name="kaggle")
    cells = _cells(nb)
    sources = _sources(cells)
    assert any("Skipped data/binary file**: `data/edges.csv`" in s for s in sources)
    # only setup cells (pip install) get collapse metadata; writefile cells stay plain
    pip_cell = next(c for c in cells if "".join(c["source"]).startswith("%pip install"))
    assert pip_cell["metadata"].get("jupyter", {}).get("source_hidden") is True
    wf = next(c for c in cells if "".join(c["source"]).startswith("%%writefile"))
    assert "source_hidden" not in wf["metadata"]


def test_writefile_metadata_hash():
    nb = generator.generate(dict(CLI_PARITY_FILES), selected=["src/train.py"], target_name="kaggle")
    wf = next(c for c in _cells(nb) if "".join(c["source"]).startswith("%%writefile"))
    assert wf["metadata"]["repo2nb"]["path"] == "src/train.py"
    assert wf["metadata"]["repo2nb"]["hash"].startswith("sha256:")


def test_webapi_bridge():
    import base64

    from repo2nb_core import webapi

    scan = json.loads(webapi.scan_payload(json.dumps({
        "files": [{"path": "a.py", "size": 3}, {"path": "data/x.csv", "size": 5}],
    })))
    assert scan["files"][0]["included"] is True
    assert scan["files"][1]["included"] is False

    out = json.loads(webapi.generate_payload(json.dumps({
        "files": {"src/train.py": base64.b64encode(b"print(1)\n").decode()},
        "selection": ["src/train.py"],
        "target": "kaggle",
    })))
    src = "\n".join("".join(c["source"]) for c in out["notebook"]["cells"])
    assert "%%writefile /kaggle/working/src/train.py" in src
