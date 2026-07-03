---
description: Universal code style rules for the entire project
---

# Code Style

- Functions should do one thing. If you need the word "and" to describe it, split it.
- Name variables after what they contain, functions after what they do.
- Don't abbreviate names. `getUserProfile` not `getUsrProf`. Clarity beats brevity.
- No commented-out code. Delete it. Git remembers.
- Handle errors explicitly. Don't swallow exceptions or ignore error returns.
- Keep files under 300 lines. If a file is growing, extract a module.
- Imports go at the top, grouped: stdlib, external packages, internal modules.
- Use 2 spaces for indentation. No tabs.
- Line length max 80 characters. Break long lines after commas or operators.
- Use single quotes for strings, except to avoid escaping.
- Always include a newline at the end of files.
- For tests, use descriptive names that explain the scenario and expected outcome.
