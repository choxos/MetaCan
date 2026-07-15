"""The Gemma arm over round_100: three backends at once, resumable, provenance recorded.

WHY THREE BACKENDS
------------------
Gemma-4-31B is served by NVIDIA build (works, ~18s per 3-record smoke test), Ollama
cloud (works, ~6x faster on the same smoke test), and OpenRouter's free tier (429s
under load, recovers later). One arm's wall-clock is set by whichever backend it is
stuck on, so it runs all three concurrently and takes whatever finishes. A backend
that is rate-limited contributes nothing that pass; that is not a failure, it is one
lane of three.

WHY THE BACKEND IS RECORDED PER CHUNK
-------------------------------------
Same model NAME is not the same SERVING STACK: quantization, sampling defaults, and
context handling differ between hosts, and any of those can move a label. If Gemma's
labels ever enter a result, "which backend produced this" has to be answerable, so
meta_NNN.json is written beside every chunk. It is named meta_, not chunk_, because
the validator globs chunk_*.json and a sidecar matching that glob would be silently
read as labels.

WHY EVERY CHUNK IS GUARDED
--------------------------
macOS revokes ~/Documents access from long-running processes at random. One unguarded
exception in a thread took down an entire executor once while the log looked routine,
so a chunk that raises costs a chunk and a pass, never the run.
"""

from __future__ import annotations

from ml.repair_round100 import main as repair_main


def main():
    repair_main(["repair", "--arm", "gemma", "--workers", "14"])


if __name__ == "__main__":
    main()
