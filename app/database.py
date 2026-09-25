import aiosqlite


DATABASE_PATH = "/data/batadas.db"


async def init_db():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                username TEXT NOT NULL DEFAULT 'historik',
                color TEXT NOT NULL DEFAULT '#888888',
                room_id TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                reply_to_id TEXT
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                login_name TEXT NOT NULL UNIQUE,
                alias TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                username_font TEXT NOT NULL DEFAULT 'agave',
                username_color TEXT NOT NULL DEFAULT '#8fd694',
                created_at TEXT NOT NULL
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id)
            )
        """)

        cursor = await db.execute(
            "PRAGMA table_info(messages)"
        )

        columns = {
            row[1]
            for row in await cursor.fetchall()
        }

        if "username" not in columns:
            await db.execute(
                """
                ALTER TABLE messages
                ADD COLUMN username TEXT NOT NULL
                DEFAULT 'historik'
                """
            )

        if "color" not in columns:
            await db.execute(
                """
                ALTER TABLE messages
                ADD COLUMN color TEXT NOT NULL
                DEFAULT '#888888'
                """
            )

        await db.commit()


async def save_message(
    message_id: str,
    session_id: str,
    username: str,
    color: str,
    room_id: str,
    text: str,
    created_at: str,
    reply_to_id: str | None = None,
):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """
            INSERT INTO messages (
                id,
                session_id,
                username,
                color,
                room_id,
                text,
                created_at,
                reply_to_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                message_id,
                session_id,
                username,
                color,
                room_id,
                text,
                created_at,
                reply_to_id,
            ),
        )

        await db.commit()


async def get_recent_messages(
    room_id: str,
    limit: int = 100,
):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """
            SELECT
                id,
                session_id,
                username,
                color,
                room_id,
                text,
                created_at,
                reply_to_id
            FROM messages
            WHERE room_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (room_id, limit),
        )

        rows = await cursor.fetchall()

        return [dict(row) for row in reversed(rows)]

async def create_account(
    account_id: str,
    login_name: str,
    alias: str,
    password_hash: str,
    created_at: str,
):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """
            INSERT INTO accounts (
                id,
                login_name,
                login_name_normalized,
                alias,
                alias_normalized,
                password_hash,
                role,
                username_font,
                username_color,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'user', 'agave', '#7fc4c8', ?)
            """,
            (
                account_id,
                login_name,
                login_name.casefold(),
                alias,
                alias.casefold(),
                password_hash,
                created_at,
            ),
        )

        await db.commit()

async def create_session(
    session_id: str,
    account_id: str,
    created_at: str,
    expires_at: str,
):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """
            INSERT INTO sessions (
                id,
                account_id,
                created_at,
                expires_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                session_id,
                account_id,
                created_at,
                expires_at,
            ),
        )
        await db.commit()


async def get_session(session_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """
            SELECT
                sessions.id,
                sessions.account_id,
                sessions.created_at,
                sessions.expires_at,
                accounts.login_name,
                accounts.alias,
                accounts.role,
                accounts.username_font,
                accounts.username_color
            FROM sessions
            JOIN accounts ON accounts.id = sessions.account_id
            WHERE sessions.id = ?
            """,
            (session_id,),
        )

        session = await cursor.fetchone()

    if session is None:
        return None

    return dict(session)

async def delete_session(session_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "DELETE FROM sessions WHERE id = ?",
            (session_id,),
        )
        await db.commit()

async def login_name_exists(login_name: str) -> bool:
    normalized = login_name.casefold()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            """
            SELECT 1
            FROM accounts
            WHERE login_name_normalized = ?
               OR alias_normalized = ?
            LIMIT 1
            """,
            (normalized, normalized),
        )
        return await cursor.fetchone() is not None


async def alias_exists(alias: str) -> bool:
    normalized = alias.casefold()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            """
            SELECT 1
            FROM accounts
            WHERE alias_normalized = ?
               OR login_name_normalized = ?
            LIMIT 1
            """,
            (normalized, normalized),
        )
        return await cursor.fetchone() is not None