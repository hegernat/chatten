# Changelog

## v1.2.0

This release focuses on introducing the first account system, authentication and user identity features, while continuing to improve the chat interface and session handling.

### Added

- User registration with Login-ID, public alias and password.
- Argon2 password hashing.
- Account login and logout.
- Persistent authenticated sessions.
- Account roles: user, moderator and administrator.
- User profile data for username color and font.
- Case-insensitive Login-ID and alias handling.
- Reserved username and alias protection.
- Alias availability checking during registration.
- Login-ID availability checking during registration.
- Password confirmation during registration.
- Password visibility toggle during registration and login.
- Account-specific username colors.
- Server-side authentication state for WebSocket sessions.
- 30-day authenticated session duration.
- Server-side logout and session invalidation.
- Anonymous visitor sessions remain available without an account.
- Server-authoritative idle status for online users.
- Alphabetical ordering of the global online user list.

### Changed

- Registered users now use their account alias instead of anonymous visitor names.
- Anonymous visitor sessions and registered account sessions are handled separately.
- Username changes are restricted for registered accounts and are intended to be handled through Profile.
- Online users can now be displayed with account-specific identity information.
- The authentication menu now provides Profile and Logout actions depending on authentication state.
- Login and registration interfaces were expanded to support the account system.
- Mobile and desktop authentication UI was refined.

### Security

- Passwords are never stored in plaintext.
- Passwords are hashed using Argon2.
- Authentication sessions use HTTP-only cookies.
- Account and alias validation is performed server-side.
- Login-ID and alias uniqueness is enforced server-side.
- Registered account permissions are intended to be enforced server-side rather than trusted from the frontend.

### Notes

This is still an early-development release. The account system and authentication flow are functional but not yet considered complete. Some account, session and logout behaviour still requires further work.

Interfaces, account features and moderation behaviour may change in future versions.

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