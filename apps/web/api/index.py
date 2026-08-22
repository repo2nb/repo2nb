import os
import sys

_base = os.path.dirname(__file__)
# vendor/ holds the engine on Vercel (copied by vercel-build.sh); locally the
# venv-installed repo2nb_core is used when vendor/ is absent.
sys.path.insert(0, os.path.join(_base, "vendor"))
sys.path.insert(1, _base)

from handlers import create_app  # works both under uvicorn and Vercel's loader

app = create_app()
