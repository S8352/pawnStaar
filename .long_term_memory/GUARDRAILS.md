# GUARDRAILS.md

This file serves as the master rulebook for the project.

## Table of Contents
- [Coding Standards](#coding-standards)
- [Architectural Principles](#architectural-principles)
- [Command-Line Conventions](#command-line-conventions)
- [Memory Management Protocols](#memory-management-protocols)
- [Git Discipline](#git-discipline)

---

## Coding Standards
- **Naming Conventions:**
  - `camelCase` for variables and functions.
  - `PascalCase` for classes and components.
  - `UPPER_SNAKE_CASE` for constants.
  - `kebab-case` for filenames.
- **Code Style:**
  - Follow established style guides for the language (e.g., PEP 8 for Python, Prettier for JavaScript/TypeScript).
  - Max line length: 120 characters.
  - Use comments to explain *why*, not *what*.

---

## Architectural Principles
- **SOLID:**
  - **S**ingle Responsibility Principle: Each module or class should have one, and only one, reason to change.
  - **O**pen/Closed Principle: Software entities should be open for extension but closed for modification.
  - **L**iskov Substitution Principle: Subtypes must be substitutable for their base types.
  - **I**nterface Segregation Principle: No client should be forced to depend on methods it does not use.
  - **D**ependency Inversion Principle: High-level modules should not depend on low-level modules. Both should depend on abstractions.
- **Clean Architecture:**
  - Keep business logic independent of frameworks and external agencies.
  - Structure the project in layers (e.g., Domain, Application, Infrastructure, Presentation).

---

## Command-Line Conventions
- **Command Chaining:**
  - Use `&&` to chain commands that are dependent on the success of the previous command.
  - Use `;` for sequential execution where success is not required (use with caution).
- **Tool Usage:**
  - Prefer project-local tools (e.g., via `npm scripts`) over globally installed tools to ensure version consistency.
  - Document all custom scripts in the `scripts/` directory.

---

## Memory Management Protocols
- **Cache Pruning:**
  - `.cache_memory/` should be cleared at the beginning of a major new feature or sprint.
  - Review `CURRENT_CONTEXT.md` and `CURRENT_TODO.md` weekly to ensure they are up-to-date.
- **LTM Refinement:**
  - `PROJECT_CONTEXT_AND_ROADMAP.md` should be reviewed and updated quarterly or after major releases.
  - `DECISION_LOG.md` is append-only. Periodically synthesize key decisions into the main project documentation.
  - Run `scripts/update_index.sh` after adding any new document to `.long_term_memory/`.

---

## Git Discipline
- **Branching Strategy:**
  - `main`: Production-ready code.
  - `develop`: Integration branch for features.
  - `feature/<feature-name>`: For new feature development.
  - `bugfix/<bug-name>`: For fixing bugs.
  - `hotfix/<fix-name>`: For critical production fixes.
- **Commit Message Format:**
  - Follow the Conventional Commits specification.
  - Example: `feat(auth): implement password reset endpoint`
  - Example: `fix(ui): correct button alignment on mobile`
