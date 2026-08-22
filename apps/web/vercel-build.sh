#!/usr/bin/env bash
# Vercel build command. Vercel's uv sandbox rejects requirements paths outside the
# function dir, so we vendor the engine into api/vendor before the Python step runs.
set -euo pipefail

rm -rf api/vendor
mkdir -p api/vendor
cp -r ../../packages/repo2nb_core/repo2nb_core api/vendor/repo2nb_core

pnpm build
