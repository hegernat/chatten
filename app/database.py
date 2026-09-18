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