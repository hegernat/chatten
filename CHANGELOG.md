# Changelog

## [1.1.0] - 2026-09-21

### Added
- Main application menu with entries for profile, settings, help, privacy, and terms.
- Responsive user list toggle for desktop and mobile.
- Mobile user list displayed as an overlay without obscuring message content.
- Message character counter.
- Multi-line message input with Shift+Enter support.
- Preserved line breaks in sent messages.

### Changed
- Increased maximum message length from 2,000 to 4,000 characters.
- Public chat rooms are now displayed as button-style controls.
- Active chat room is visually distinguished from inactive rooms.
- Improved mobile layout for the user list.
- Prevented vertical scrolling in the room navigation.
- Improved long-message wrapping and readability.


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