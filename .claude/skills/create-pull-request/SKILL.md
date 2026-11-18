---
name: create-pull-request
description: How to open a pull request in the Wash Crew repo. Use this every time you create a pull request here, including the before and after screenshot rule for user-facing changes.
---

# Create a pull request

Follow these steps every time you open a pull request in this repository.

## 1. Prepare the branch

- Work on a feature branch, never directly on `main`.
- Keep the change focused on one goal. Split unrelated work into separate PRs.
- Make sure the project builds and any tests or lint checks pass before you open the PR.
- Write clear commit messages that say what changed and why.

## 2. Screenshots for user-facing changes (required)

Any change a player or user can see **must** include before and after screenshots in the PR description, so the reviewer can tell how it looks without running it.

This covers things like UI, HUD, menus, sprites, art, animations, layout, colors, text, and gameplay that looks different on screen.

- Take a **Before** screenshot from the base branch and an **After** screenshot from your branch, of the same screen and state.
- If the change is an interaction or animation, a short GIF or video is welcome in addition to the screenshots.
- For a brand new screen or feature with no previous state, say "Before: N/A (new feature)" and include the After screenshot.
- Skip this only when nothing visible changes (for example refactors, build config, tests, docs). In that case write "Screenshots: N/A, no user-facing change" so it is clear the rule was considered.

Upload the images into the PR description (drag and drop on GitHub, or commit them and link them) rather than leaving them on your machine.

## 3. Write the PR description

Use this layout:

```markdown
## Summary
What this PR does and why, in a few sentences.

## Changes
- Bullet list of the main changes.

## Screenshots
| Before | After |
| ------ | ----- |
| ![before](url) | ![after](url) |

<!-- or: Screenshots: N/A, no user-facing change -->

## How to test
Steps a reviewer can follow to check the change.
```

## 4. Open the PR

- Title: short and in plain words, describing the outcome (for example "Add soap meter to the HUD").
- Base branch: `main`, unless told otherwise.
- Link any related issue in the description.
- Do a final read of the diff before opening, and check that the Screenshots section is filled in or marked N/A.
