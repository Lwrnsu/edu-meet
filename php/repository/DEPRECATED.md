# Deprecated: `php/repository/` (mysqli)

Do **not** add new `require`s of files in this folder.

## Canonical path

- Use [`php/repositories/`](../repositories/) with `Database::connect()` (PDO).
- Authentication and related services already use `repositories/` only.

## Why this folder remains

Legacy mysqli repository copies are kept so local checkouts and unmerged branches are not broken by deletion. Do not sync or “fix” both trees — edit `repositories/` only for new work.
