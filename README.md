# Prose Does Not Bind Agents

**Mechanically Enforced Safeguards for Multi-Agent Coding on a Single Repository**

Rich Tillman · Independent Researcher · [github.com/effinrich](https://github.com/effinrich) · effinrich@pm.me

Preprint, 2026-11-03.

## Abstract

Coding agents are increasingly run in parallel against a single repository, under
written instructions that tell them what to build and what to leave alone. This
paper reports a 30-day case study of that arrangement: a repository whose 104
commits carry 126 `Co-authored-by` trailers, 120 of them naming one of three AI
coding agents, and whose only scope rule the agents could read was a prose
rulebook. We ask a
narrow question: when such agents remove or weaken the very artefacts that
constrain them, what makes the constraint survive?

We report three findings. **F1 (a correct, disclosed, irreversible deletion).**
An agent removed the repository's specification harness: 137 files and 10,097
lines in one commit, because the brief did not ask for tests. The removal was
right on the brief's terms, it was named in full in the commit message, and the
commit carries the agent's own trailer. What failed was not the deletion but
the record: nothing in the repository afterwards distinguished *never existed*
from *deleted*, and the scope rules that later governed the repository were
written by the deletion itself. **F2 (a directive that arrived after the
work).** Four agents working one task concurrently each built their own
crop-and-export primitive instead of using the one the platform ships; one
reached the trunk and had to be taken out again. The prose directive that
would have prevented it was written the following day, and nothing could tell
whether a given agent had complied. **F3 (checks that pass for the wrong
reason).** Three automated checks passed while asserting less than they
appeared to; each was found and fixed only because the property being claimed
was written down and examined.

We then describe the mechanism that followed: moving constraints out of prose and
into the build. Four rules — hash-pinned protected files, mechanical invariants,
required and forbidden gate targets, and separately bounded budgets — all of
which fail the build when violated. One episode is kept outside the findings,
because no written rule answers it: the machine the agents ran on was compromised
by a trojan (§4.4). We argue that the design question for agent-assisted
development is not how to write better instructions but what to make checkable,
and that a repository governed by prose is governed by nothing.

**Keywords:** multi-agent systems; AI coding agents; software engineering;
repository governance; guardrails; large language models; empirical case study

## The paper

- [`paper.pdf`](paper.pdf) — the formatted preprint (A4, 14 pages). This is the
  one to submit.
- [`paper-latex.pdf`](paper-latex.pdf) — the same paper typeset by LaTeX, for
  venues that prefer a TeX-produced PDF.
- [`paper.tex`](paper.tex) — the LaTeX source.
- [`paper.md`](paper.md) — the markdown source. It is the single source of truth;
  the PDF and the LaTeX are generated from it.

## The corpus

Every commit, decision record, safeguard and transcript the paper cites is public:
<https://github.com/effinrich/h2-fe-assessment>. The paper names the sponsor
throughout, because the repository does. Appendix A of the paper lists the
commands that reproduce its counts.

## Rebuilding

The markdown is the source of truth; `render.mjs` and `tex.mjs` only typeset it.

```sh
bun install
bun run render.mjs   # paper.md -> paper.html -> paper.pdf
bun run tex.mjs      # paper.md -> paper.tex
bun run preview.mjs  # paper.html -> preview-top.png, for eyeballing the layout
```

`render.mjs` resolves `marked` and `playwright` from `node_modules`. The LaTeX
needs a TeX distribution — it was compiled here with
[tectonic](https://tectonic-typesetting.org/), which downloads its own bundle:

```sh
tectonic -X compile paper.tex --outdir texbuild
```

Two deliberate typesetting choices are worth knowing about. Ligatures are
disabled in the stylesheet, because Chrome maps the `fi`/`fl` ligature glyph
back to a two-letter string on text extraction, which makes `files`
unsearchable inside the PDF. And `tex.mjs` is a converter for *this* document
rather than a general markdown-to-LaTeX engine, so it handles the constructs
`paper.md` actually uses and nothing else.

## How to cite

```bibtex
@misc{tillman2026prose,
  title        = {Prose Does Not Bind Agents: Mechanically Enforced Safeguards
                  for Multi-Agent Coding on a Single Repository},
  author       = {Tillman, Rich},
  year         = {2026},
  howpublished = {Preprint}
}
```

The DOI is assigned on deposit and will replace the placeholder above.

## License

CC BY 4.0 — see [`LICENSE`](LICENSE).
