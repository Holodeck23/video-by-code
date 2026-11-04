# Security and sharing boundaries

This is a local authoring toolkit. It executes scene JavaScript in Chrome and processes
media with ffmpeg. Run pages, scripts and media from sources you trust. It is not a
sandbox for arbitrary uploaded HTML or a hosted rendering service.

- No API keys, credentials, private chats, customer evidence or selected source media
  belong in the code checkout. Keep client production folders in private storage.
- The renderer launches an isolated automation browser; it does not use your signed-in
  browsing profile. It accepts a local page filename, not a hosted URL submission.
- The optional hand-drawn example requests Google Fonts. The principal worked examples
  and the eight style studies use local/system fonts and do not load network assets.
- Python/Node subprocesses pass argument arrays rather than shell strings. Output paths
  are chosen by the local operator. Do not expose these CLIs directly to web requests.
- Handbook export renders repository-authored Markdown, including its raw HTML. Treat
  documentation contributions as code when producing an HTML handbook.
- Before sharing, scan the working snapshot **and Git history** for credentials, private
  material, unintended media and third-party source. Review dependencies and provenance.
  Automated scans can miss problems; record their scope and the reviewed exceptions.

The initial pre-share review found no secret findings or known npm dependency advisories
in the pinned starter dependency graph. This is a dated review, not a continuing security
guarantee. Recheck when dependencies or sharing scope change. See `VALIDATION.md`.
