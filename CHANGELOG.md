# Changelog

## [1.0.1] - 2026-09-20

### Added
- Per-user ignore/block functionality.
- Local persistence of ignored users using `localStorage`.
- In-session message history for rooms opened during the current session.
- Background message notifications with separate mention sounds.
- Persistent notification sound preference.
- Custom wallpaper background.
- Live username updates without requiring a page refresh.
- Support for spaces in usernames.
- Ignore controls in the online user list.

### Changed
- Opened rooms continue receiving live messages while browsing another room.
- Online users are shown globally across public rooms.
- Ignored users remain visible in the online user list but are visually marked.
- Message history is kept in client memory and capped at 500 messages per room.
- SQLite message logging remains available, but persistent history is no longer loaded into the chat UI.
- Removed the `CHATTEN` title from the header.
- Updated notification sound controls to use image assets.