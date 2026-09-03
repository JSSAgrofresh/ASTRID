/**
 * Minimal ambient types for Node's built-in `node:sqlite` module.
 *
 * `@types/node` in this project is pinned to the v20 line (see
 * package.json), which predates `node:sqlite` (added in Node 22.5, used
 * here unflagged and stable on the Node 24 runtime this app actually
 * runs on — confirmed with `node -e "require('node:sqlite')"`, no
 * experimental warning). Rather than bump `@types/node` for the whole
 * project, this declares only the surface `db/connection.ts` and
 * `db/task-repository.ts` actually use.
 */
declare module "node:sqlite" {
  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
  }

  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
