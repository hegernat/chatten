# Chatten

A minimal self-hosted web chat focused on simplicity, privacy and automated moderation.

## Overview

Chatten is a lightweight browser-based chat application inspired by the simplicity of older web chats. It is designed to be easy to self-host and deliberately avoids gamification such as karma, XP, reputation systems and similar mechanics.

The project is currently under active development.

## Features

### Chat

- Public chat rooms
- WebSocket-based live messaging
- SQLite message logging
- Anonymous visitor names such as `Besökare1`, `Besökare2`, etc.
- Registered user accounts with public aliases
- Custom username colors for registered users
- Reserved username and alias protection
- Basic username and alias validation
- Message timestamps
- `@mention` highlighting
- Optional background notification sounds
- Separate notification sound for mentions
- Persistent notification sound preference
- Online user list
- Alphabetically ordered global online user list
- Room user counts
- In-session room history for rooms opened during the current session
- Opened rooms continue receiving live messages while browsing another room
- Per-user ignore/block functionality
- Persistent ignored-user state using `localStorage`

### Accounts and authentication

- Account registration with Login-ID, alias and password
- Argon2 password hashing
- Login and logout
- Persistent authenticated sessions
- 30-day authenticated session duration
- HTTP-only authentication cookies
- Account roles for users, moderators and administrators
- Account-specific username colors
- Username font settings
- Server-side authentication and authorization groundwork
- Password confirmation during registration
- Password visibility controls
- No email-based password recovery

### Interface

- Main application menu
- Profile and authentication controls
- Responsive desktop and mobile interface
- Responsive mobile user list overlay
- Live username updates without requiring a page refresh
- Dark, minimal terminal-inspired UI
- Agave Nerd Font
- Multi-line message input
- `Shift+Enter` support for line breaks
- Message character counter
- Docker-based deployment

## Tech stack

- Python 3.12
- FastAPI
- Uvicorn
- WebSockets
- SQLite
- aiosqlite
- Argon2
- Docker / Docker Compose
- Vanilla JavaScript
- CSS
- HTML

## Project structure

```text
chatten/
├── app/
│   ├── database.py
│   └── main.py
├── static/
│   ├── fonts/
│   ├── images/
│   ├── sounds/
│   ├── chat.js
│   └── style.css
├── templates/
│   └── index.html
├── tests/
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── compose.yml
├── requirements.txt
├── README.md
└── CHANGELOG.md
```

## Running with Docker

Clone the repository and enter the project directory:

```bash
git clone git@github.com:hegernat/chatten.git
cd chatten
```

Build and start the application:

```bash
docker compose up -d --build
```

The application listens on port `8000`.

Check the container:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f chatten
```

Stop the application:

```bash
docker compose down
```

## Development

The project is currently intended primarily for self-hosting and development.

Changes to Python files require rebuilding the container:

```bash
docker compose up -d --build
```

Changes to files mounted directly from the host, such as files under `static/` and `templates/`, can normally be picked up with a container restart and a browser hard refresh.

## Data

Chat messages are logged to a local SQLite database mounted at:

```text
/data/batadas.db
```

The chat UI does not load persistent SQLite history on page load. Room history is kept in client memory for rooms opened during the current session.

The local `data/` directory is excluded from Git so runtime data is not published to the repository.

## Current moderation direction

The moderation system is intentionally being built around automation rather than depending on volunteer moderators.

Current protections include:

- Message rate limiting
- Duplicate-message detection
- Reserved usernames and aliases
- Basic username and alias validation
- Per-user ignore/block functionality

Planned or under consideration:

- Automatic spam detection
- URL and link-spam controls
- Escalating temporary write blocks
- Room-level slow mode
- Cloudflare Turnstile where appropriate
- Reporting and moderation tools

## Account system status

The account system is functional but still under development.

Current account functionality includes:

- Registration
- Login
- Logout
- Persistent sessions
- Public aliases
- Account-specific username colors
- User, moderator and administrator roles

Known unfinished areas include parts of the logout/session transition and the future Profile interface. Account and moderation behaviour may change as development continues.

## Design principles

Chatten aims to remain:

- Simple
- Lightweight
- Self-hostable
- Minimal
- Free of unnecessary gamification
- Focused on conversation rather than engagement metrics

## Status

Early development. Features, interfaces, account functionality and moderation behaviour may change substantially.

## License

No license has been selected yet.
