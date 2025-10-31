# AI Agent Project Instructions

Welcome! This repository implements a Model Context Protocol (MCP) server for the MOCO API. Please follow the guidance below when contributing or generating code with Copilot.

## Repository Structure

- `src/` – TypeScript source code organized by feature:
  - `config/` – Environment configuration helpers.
  - `prompts/` – Prompt orchestrations exposed to MCP clients.
  - `services/` – API clients for MOCO endpoints.
  - `tools/` – Individual MCP tools composed in prompts.
  - `utils/` – Shared utilities for date/time handling and error reporting.
  - `index.ts` – stdio MCP entrypoint.
  - `http.ts` – Streamable HTTP transport wrapper.
- `tests/` – Jest test suites:
  - `unit/` – Isolated tests for config and utilities.
  - `integration/` – End-to-end API client tests using mocked HTTP.
  - `http/` – Integration-style tests validating the HTTP transport contract.
  - `mcp/` – Reserved for future protocol coverage (currently skipped in Jest config).
- `Dockerfile` & `Dockerfile.http` – Container builds for stdio and HTTP transports.
- `.vscode/launch.json` – Debug profiles for both transports.
- `.env.example` – Documented environment variables required at runtime.

## TypeScript & Build Conventions

- The project is ESM-first with `"type": "module"` and `module: "ESNext"` in `tsconfig.json`.
- Always code in TypeScript within `src/`; compiled assets live in `dist/` (generated via `npm run build`).
- Prefer named exports and keep modules side-effect free where possible.
- Use existing utility helpers (`errorHandler`, `dateUtils`, etc.) to avoid duplication.
- When touching entrypoints (`index.ts`, `http.ts`), preserve the CLI detection guard implemented through the dynamic `import.meta.url` helper for ts-jest compatibility.

## Testing Expectations

- Primary command: `npm test` (runs all Jest suites).
- Use `npm run test:unit`, `npm run test:integration`, or `npm run test:mcp` when scoping suites.
- HTTP transport tests rely on `supertest`; ensure new endpoints or behavior changes include coverage in `tests/http/`.
- Keep tests deterministic—mock external network calls via existing service abstractions.
- Run `npm run lint` (TypeScript no-emit) before submitting changes.

## Documentation Discipline

- Update `README.md` whenever behavior, environment variables, or client integration instructions change.
- Mirror new environment variables in `.env.example` with concise comments.
- Document new scripts or workflows inside the README "Quick Start" or "Advanced Configuration" sections.
- When adding prompts or tools, extend the relevant tables in README and include examples where helpful.

## Developer Tooling

- Debug via VS Code launch configurations: `Debug MCP CLI (stdio)` and `Debug MCP HTTP Server` (delegates to `npm run debug:http`).
- The `debug:http` script loads `.env` automatically; ensure local credentials remain out of version control.
- Docker images should continue to build with `npm run docker:build` and `npm run docker:build:http`; verify after modifying dependencies or node runtime requirements.
- The logger implementation should be done in `utils/logger.ts` to maintain consistent log formatting across transports. The default log level is `info`. The environment variable `LOG_LEVEL` can be set to adjust verbosity.

## Contribution Notes

- Maintain compatibility with Node.js ≥ 24 as declared in `package.json`.
- Keep dependencies minimal; justify new packages in PR descriptions.
- Coordinate any protocol-level changes with corresponding adjustments in tests and documentation.
- Respect existing TypeScript strictness—prefer explicit types and handle error cases gracefully using utilities like `errorHandler`.

## Development Workflow

- Commit changes with clear messages referencing relevant issues.
- Open pull requests against the `develop` branch for review.
- Ensure all tests pass and linting checks complete before merging.

## Additional Guidelines

- When new environment variables are introduced, ensure they are documented in `.env.example` and `README.md`.
- For any modifications to the HTTP transport, validate changes with appropriate tests in `tests/http/`.
- Use the existing logging utility for any new logging requirements to maintain consistency.
- All the environment variables used in the project should be read through the configuration helpers located in `src/config/environment.ts` to ensure centralized management.

## Documentation References

- The folder `docs/` is a git submodule containing the official MOCO API documentation. Refer to it for any API-specific details when implementing or updating service clients.
- Each API has its own section in the `docs/sections` directory in the documentation. Make sure to link to the relevant sections when adding new features or updating existing ones.

Following these guidelines will help ensure Copilot suggestions stay aligned with project standards and that the codebase remains reliable and well-documented. Happy hacking! 🚀
