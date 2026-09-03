# ASTRID "developer" sandbox image for OpenClaw.
#
# Minimal, reproducible image for the sandboxed OpenClaw agent that edits
# code inside one isolated Git worktree per task. Built as a self-contained
# image (does NOT depend on OpenClaw's own openclaw-sandbox:bookworm-slim
# base) — same Debian base and non-root user convention as that base
# (see https://docs.openclaw.ai/gateway/sandboxing), plus Node.js/npm,
# nothing else. No credentials, tokens, SSH keys, or git config are ever
# baked into this image — the container gets no host mounts beyond the
# one task worktree (see agents.entries.developer in openclaw.json).
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox

CMD ["sleep", "infinity"]
