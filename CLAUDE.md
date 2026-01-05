# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install              # install dependencies
bun dev:web              # start web dev server with HMR
bun start:web            # start web in production mode
bun test                 # run all tests
bun test <file>          # run single test file
bun check                # typecheck with tsc
```

## Architecture

Bun monorepo with workspaces in `apps/` and `packages/`.

**apps/web**: Full-stack React app using Bun.serve() with:
- HTML imports for frontend bundling (no vite/webpack)
- File-based API routes in the server
- Postgres for persistence

## Workflow

Run `bun test` and `bun check` after significant changes.

## Bun Conventions

- Use `Bun.serve()` with routes, not express
- Use `bun:test` for testing
- Bun auto-loads .env files
- HTML files can directly import .tsx/.css and Bun bundles automatically
- Use `bun --hot` for dev server with HMR
