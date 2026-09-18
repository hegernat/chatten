# Chatten

A minimal self-hosted web chat focused on simplicity, privacy and automated moderation.

## Overview

Chatten is a lightweight browser-based chat application inspired by the simplicity of older web chats. It is designed to be easy to self-host and deliberately avoids gamification such as karma, XP, reputation systems and similar mechanics.

The project is currently under active development.

## Features

- Public chat rooms
- Persistent room history using SQLite
- Anonymous visitor names such as `Besökare1`, `Besökare2`, etc.
- Custom usernames
- Username colors
- Reserved username protection
- Basic username character restrictions
- WebSocket-based live messaging
- Message timestamps
- `@mention` highlighting
- Optional background notification sounds
- Separate notification sound for mentions
- Online user list
- Room user counts
- Persistent room selection across page refreshes
- Basic message rate limiting
- Duplicate-message protection
- Responsive desktop and mobile interface
- Dark, minimal terminal-inspired UI
- Agave Nerd Font
- Docker-based deployment

## Tech stack

- Python 3.12
- FastAPI
- Uvicorn
- WebSockets
- SQLite
- aiosqlite
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
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── compose.yml
├── requirements.txt
└── README.md
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

Chat messages are stored in a local SQLite database mounted at:

```text
/data/batadas.db
```

The local `data/` directory is excluded from Git so runtime data is not published to the repository.

## Current moderation direction

The moderation system is intentionally being built around automation rather than depending on volunteer moderators.

Current protections include:

- Message rate limiting
- Duplicate-message detection
- Reserved usernames
- Basic username validation

Planned or under consideration:

- Automatic spam detection
- URL and link-spam controls
- Escalating temporary write blocks
- Room-level slow mode
- Cloudflare Turnstile where appropriate
- Reporting and moderation tools

## Design principles

Chatten aims to remain:

- Simple
- Lightweight
- Self-hostable
- Minimal
- Free of unnecessary gamification
- Focused on conversation rather than engagement metrics

## Status

Early development. Features, interfaces and moderation behaviour may change substantially.

## License

No license has been selected yet.
