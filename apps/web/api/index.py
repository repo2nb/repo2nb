import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from handlers import create_app  # works both under uvicorn and Vercel's loader

app = create_app()
