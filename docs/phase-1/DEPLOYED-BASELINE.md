# VPS baseline supplied by owner — 14 November 2026

Owner-reported checkout: `/var/www/babystore`.

- Commit: `2255375a5440b73894e3f1ef6b445a8fc48ff6e5`
- Commit date: `2026-10-20T05:14:57+00:00`
- Subject: `Merge updates while preserving MAX order numbering`
- MySQL client and mysqldump: `8.0.46-0ubuntu0.24.04.5`, Ubuntu, x86_64.

Isolated development checkout base: `9c8f7b2121405ff8f3c105de1679d5cda8ba1045` (`Bug Fix, UI Updates`). The VPS merge commit object remains unavailable locally. On 18 November 2026, owner-run Git commands reported identical trees for this base and the VPS commit: `6ea49b8dc271d6fb2c41d7ae5bcbd9131885d526`. Local `git rev-parse 9c8f7b2^{tree}` independently matches. Therefore the tracked baseline source and assets are identical despite different commit history; no production-only tracked numbering changes require recovery. No production changes or deployment were performed.

The supplied directory listing is consistent with the repository layout but does not prove that running backend processes or served static assets match this commit. The owner subsequently confirmed no tracked changes. Ignored/untracked files and running deployment/build identity remain unverified. These are client tool versions, not a verified MySQL server version.

The MySQL 8.x schema-only handoff commands in VPS-HANDOFF.md match the supplied client tooling. A 42-table export was downloaded and statically reviewed on 14 November 2026; see SCHEMA-COMPARISON.md. It has not been executed. Tracked-source comparison is now complete via tree identity. Running process/build identity, ignored configuration, schema and business data remain separate release checks.

Owner follow-up: `git status --short --untracked-files=no` produced no output (no tracked changes). This does not establish parity with running builds or ignored environment files.
