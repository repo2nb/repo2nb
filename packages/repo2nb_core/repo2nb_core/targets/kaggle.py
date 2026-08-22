"""Kaggle target, ported from repo2nb-cli/repo2nb/targets/kaggle.py."""

from ..notebook import make_code_cell, make_markdown_cell

NAME = "kaggle"
WORKDIR_PREFIX = "/kaggle/working/"
# Kaggle's system directory for virtual documents — never push it.
GITIGNORE_ENTRIES = [".virtual_documents/"]


def collapse_metadata() -> dict:
    # ponytail: best-effort hide; not all viewers respect source_hidden
    return {"jupyter": {"source_hidden": True}}


def get_remote_suffix(git_config_text: str | None) -> str:
    """Parse github origin from a .git/config file's contents."""
    if git_config_text:
        in_origin = False
        for line in git_config_text.splitlines():
            line = line.strip()
            if line == '[remote "origin"]':
                in_origin = True
            elif line.startswith("[") and in_origin:
                in_origin = False
            elif in_origin and line.startswith("url ="):
                url = line.split("=", 1)[1].strip()
                if "github.com" in url:
                    suffix = url.split("github.com")[-1].lstrip(":/").rstrip("/")
                    if suffix.endswith(".git"):
                        return suffix
                    return suffix + ".git"
                return url
    return "user/repo.git"


def auth_cells(remote_suffix: str, omit_instructions: bool = False) -> list:
    if omit_instructions:
        setup_md_text = "# 🛠️ Phase 1: Git Authentication & Setup"
    else:
        setup_md_text = (
            "# 🛠️ Phase 1: Git Authentication & Setup\n"
            "---\n"
            "## 🔑 GitHub Token Setup\n\n"
            "Before running this cell:\n"
            "1. In Kaggle, go to **Add-ons → Secrets** in the top menu\n"
            "2. Click **Add a new secret**\n"
            "3. Name it exactly: `GITHUB_TOKEN`\n"
            "4. Paste your GitHub **fine-grained personal access token** as the value\n"
            "   - Scope it to your repo only with **Contents: Read and Write** permission\n"
            "5. Enable the secret for this notebook by toggling it on\n"
            "6. Then run this cell — your token will never appear in any output\n\n"
            "---\n"
            "**Working on a different branch?** Change `main` to your target branch name in the `git pull` and `git push` cells below."
        )
    setup_md = make_markdown_cell(setup_md_text)

    config_code = '!git config --global user.name "YOUR NAME"\n!git config --global user.email "YOUR EMAIL"'
    config_cell = make_code_cell(config_code)

    remote_code = (
        "from kaggle_secrets import UserSecretsClient\n"
        "import subprocess\n"
        "import os\n\n"
        "# Fetch your Kaggle Secret (relies on Kaggle Secrets instead of raw YOUR_TOKEN)\n"
        'token = UserSecretsClient().get_secret("GITHUB_TOKEN")\n'
        f'remote_url = f"https://{{token}}@github.com/{remote_suffix}"\n\n'
        'subprocess.run(["git", "init"], check=True)\n'
        'subprocess.run(["git", "branch", "-m", "main"], check=True)\n\n'
        "try:\n"
        '    subprocess.run(["git", "remote", "add", "origin", remote_url], check=True, stderr=subprocess.DEVNULL)\n'
        "except subprocess.CalledProcessError:\n"
        '    subprocess.run(["git", "remote", "set-url", "origin", remote_url], check=True)\n\n'
        'print("Remote URL configured successfully. Token was not printed for security.")'
    )
    remote_cell = make_code_cell(remote_code)

    pull_code = '# Change "main" to your branch name if needed\n!git pull origin main'
    pull_cell = make_code_cell(pull_code)

    return [setup_md, config_cell, remote_cell, pull_cell]


def workspace_cells(omit_instructions: bool = False) -> list:
    push_code = (
        "# Un-comment the lines below when you are ready to push!\n"
        "# !git add .\n"
        '# !git commit -m "fix from kaggle session"\n'
        "# !git push origin main"
    )
    push_cell = make_code_cell(push_code)

    if omit_instructions:
        return [make_markdown_cell("# 🚀 Phase 3: Your Workspace"), push_cell]

    cheat_sheet_md = make_markdown_cell(
        "# 🚀 Phase 3: Your Workspace\n"
        "---\n"
        "### <span style='color: #2e7d32;'>**Start manipulating and running your code from here onwards!**</span>\n\n"
        "## Git Cheat Sheet\n"
        "Uncomment the cell below when you are ready to push. Other useful commands:\n"
        "- **Remove a file**: `!git rm path/to/file.ext`\n"
        "- **Remove a folder**: `!git rm -rf path/to/folder`\n"
        "- **Rename a file**: `!git mv old_name.ext new_name.ext`\n"
        "- **Check status**: `!git status`"
    )
    return [cheat_sheet_md, push_cell]
