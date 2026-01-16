---
description: Create well-structured conventional commits
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
---

Create a well-structured commit message following conventional commits format.

## Process

1. Run `git status` to see staged and unstaged changes
2. Run `git diff` to see the actual changes
3. Suggest a commit message using conventional format:
   - **feat**: New feature
   - **fix**: Bug fix
   - **refactor**: Code refactoring
   - **docs**: Documentation changes
   - **style**: Formatting, whitespace
   - **chore**: Maintenance, dependencies

4. Format: `type(scope): description`
   - Example: `feat(calendar): add event overlap detection`
   - Example: `fix(badge): correct scroll visibility logic`

5. Stage any unstaged files if needed with `git add`
6. Create the commit with `git commit -m "message"`

## Guidelines

- Keep first line under 50 characters
- Use imperative mood ("add" not "added")
- Be specific about what changed
- Reference issue numbers if relevant: "fix #123"
