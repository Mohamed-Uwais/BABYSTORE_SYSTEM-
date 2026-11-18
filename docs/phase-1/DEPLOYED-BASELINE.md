# VPS baseline supplied by owner — 14 November 2026

Owner-reported checkout: `/var/www/babystore`.

- Commit: `2255375a5440b73894e3f1ef6b445a8fc48ff6e5`
- Commit date: `2026-10-20T05:14:57+00:00`
- Subject: `Merge updates while preserving MAX order numbering`
- MySQL client and mysqldump: `8.0.46-0ubuntu0.24.04.5`, Ubuntu, x86_64.

Isolated development checkout base: `9c8f7b2121405ff8f3c105de1679d5cda8ba1045` (`Bug Fix, UI Updates`). The VPS commit object is not available in local Git, so exact code differences and ancestry have not been established. Do not assume the bases are equivalent or overwrite the deployed numbering changes. No remote fetch, production access or deployment was attempted.

The supplied directory listing is consistent with the repository layout but does not prove that running backend processes or served static assets match this commit. The owner subsequently confirmed no tracked changes. Ignored/untracked files and running deployment/build identity remain unverified. These are client tool versions, not a verified MySQL server version.

The MySQL 8.x schema-only handoff commands in VPS-HANDOFF.md match the supplied client tooling. A 42-table export was downloaded and statically reviewed on 14 November 2026; see SCHEMA-COMPARISON.md. It has not been executed. A credential-free source comparison for the missing deployed commit remains necessary before declaring release parity.

Owner follow-up: `git status --short --untracked-files=no` produced no output (no tracked changes). This does not establish parity with running builds or ignored environment files.
