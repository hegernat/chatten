import asyncio
import time
import uuid
import re
from datetime import datetime, timezone

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from app.database import init_db, save_message, get_recent_messages

app = FastAPI(title="Chatten")

@app.on_event("startup")
async def startup():
    await init_db()

app.mount("/static", StaticFiles(directory="static"), name="static")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

USERNAME_COLORS = [
    "#8fd694",  # green
    "#e6a0c8",  # pink
    "#8fb9e8",  # blue
    "#b9a0e6",  # purple
    "#e3cf7a",  # yellow
]

DISCONNECT_GRACE_PERIOD = 300
ROOM_CHANGE_COOLDOWN = 0.25
MAX_MESSAGE_LENGTH = 4000

MESSAGE_RATE_CAPACITY = 5
MESSAGE_RATE_REFILL = 1.0

ROOMS = {
    "lobby": "lobbyn",
    "baren": "baren",
    "loungen": "loungen",
    "balkongen": "balkongen",
}

DEFAULT_ROOM = "lobby"

RESERVED_USERNAMES = {
    "admin",
    "dadmin",
    "administrator",
    "moderator",
    "mod",
    "staff",
    "support",
    "system",
    "bot",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def timestamp():
    return datetime.now(timezone.utc).isoformat()


def next_message_id():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.connections: dict[WebSocket, dict] = {}
        self.sessions: dict[str, dict] = {}
        self.ignored_users = {}

    def next_visitor_number(self) -> int:
        number = 1

        active_numbers = {
            int(session["username"][8:])
            for session in self.sessions.values()
            if session["username"].startswith("Besökare")
            and session["username"][8:].isdigit()
        }

        while number in active_numbers:
            number += 1

        return number

    def set_ignored_user(self, session_id: str, target_session_id: str, ignored: bool):
        ignored_set = self.ignored_users.setdefault(session_id, set())

        if ignored:
            ignored_set.add(target_session_id)
        else:
            ignored_set.discard(target_session_id)


    def is_ignored(self, session_id: str, target_session_id: str) -> bool:
        return target_session_id in self.ignored_users.get(session_id, set())


    def is_blocked_between(self, session_a: str, session_b: str) -> bool:
        return (
            self.is_ignored(session_a, session_b)
            or self.is_ignored(session_b, session_a)
        )

    # -----------------------------------------------------------------------
    # Sessions
    # -----------------------------------------------------------------------

    def get_or_create_session(
        self,
        session_id: str | None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ):
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]

            if client_ip:
                session["ip"] = client_ip

            if user_agent:
                session["user_agent"] = user_agent

            session["last_seen"] = timestamp()

            return session

        session_id = str(uuid.uuid4())
        now = timestamp()

        session = {
            "session_id": session_id,
            "username": f"Besökare{self.next_visitor_number()}",
            "color": USERNAME_COLORS[
                len(self.sessions) % len(USERNAME_COLORS)
            ],
            "ip": client_ip,
            "user_agent": user_agent,
            "created_at": now,
            "last_seen": now,
            "message_tokens": MESSAGE_RATE_CAPACITY,
            "message_token_time": time.monotonic(),
            "last_message_text": None,
            "last_message_time": 0.0,
            "leave_task": None,
        }

        self.sessions[session_id] = session

        return session

    # -----------------------------------------------------------------------
    # Presence
    # -----------------------------------------------------------------------

    def session_is_connected(self, session_id: str) -> bool:
        return any(
            connection["session_id"] == session_id
            for connection in self.connections.values()
        )

    def session_is_present(self, session: dict) -> bool:
        """
        A session is considered present if it has an active connection
        OR if it is currently inside the disconnect grace period.
        """
        if self.session_is_connected(session["session_id"]):
            return True

        leave_task = session.get("leave_task")

        if leave_task and not leave_task.done():
            return True

        return False

    def session_is_connected_in_room(
        self,
        session_id: str,
        room_id: str,
    ) -> bool:
        return any(
            connection["session_id"] == session_id
            and connection["room_id"] == room_id
            for connection in self.connections.values()
        )

    # -----------------------------------------------------------------------
    # Room counts
    # -----------------------------------------------------------------------

    def room_user_count(self, room_id: str) -> int:
        session_ids = {
            connection["session_id"]
            for connection in self.connections.values()
            if connection["room_id"] == room_id
        }

        return len(session_ids)

    def room_users(self, room_id: str) -> list[dict]:
        users = {}

        for connection in self.connections.values():
            if connection["room_id"] != room_id:
                continue

            session_id = connection["session_id"]

            if session_id not in users:
                users[session_id] = {
                    "session_id": session_id,
                    "username": connection["username"],
                    "color": connection["color"],
                }

        return list(users.values())

    def online_users(self) -> list[dict]:
        users = {}

        for connection in self.connections.values():
            session_id = connection["session_id"]

            if session_id not in users:
                users[session_id] = {
                    "session_id": session_id,
                    "username": connection["username"],
                    "color": connection["color"],
                }

        return list(users.values())

    def consume_message_token(self, session: dict) -> bool:
        now = time.monotonic()

        elapsed = now - session["message_token_time"]

        session["message_tokens"] = min(
            MESSAGE_RATE_CAPACITY,
            session["message_tokens"] + (
                elapsed * MESSAGE_RATE_REFILL
            ),
        )

        session["message_token_time"] = now

        if session["message_tokens"] < 1:
            return False

        session["message_tokens"] -= 1

        return True

    def change_username(self, session, new_username) -> tuple[bool, str]:
        new_username = " ".join(new_username.split())

        if not 2 <= len(new_username) <= 20:
            return False, "Namnet måste vara mellan 2 och 20 tecken."

        if not re.fullmatch(r"[A-Za-zÅÄÖåäö0-9_ -]+", new_username):
            return False, "Namnet får bara innehålla bokstäver, siffror, _ och -."

        normalized = new_username.casefold()
        reserved_check = normalized.replace("_", "").replace("-", "")

        if reserved_check in RESERVED_USERNAMES:
            return False, "Det användarnamnet är reserverat."

        if normalized in RESERVED_USERNAMES:
            return False, "Det användarnamnet är reserverat."

        for other_session in self.sessions.values():
            if other_session["session_id"] == session["session_id"]:
                continue

            if not self.session_is_present(other_session):
                continue

            if other_session["username"].casefold() == normalized:
                return False, "Det användarnamnet används redan."

        session["username"] = new_username
        session["last_seen"] = timestamp()

        for connection in self.connections.values():
            if connection["session_id"] == session["session_id"]:
                connection["username"] = new_username

        return True, ""

    # -----------------------------------------------------------------------
    # Connections
    # -----------------------------------------------------------------------

    async def connect(
        self,
        websocket: WebSocket,
        session: dict,
    ):
        await websocket.accept()

        connection_id = str(uuid.uuid4())

        self.connections[websocket] = {
            "connection_id": connection_id,
            "session_id": session["session_id"],
            "room_id": DEFAULT_ROOM,
            "opened_rooms": {DEFAULT_ROOM},
            "username": session["username"],
            "color": session["color"],
            "last_room_change": 0.0,
        }

        # A new connection cancels any pending leave.
        leave_task = session.get("leave_task")

        if leave_task and not leave_task.done():
            leave_task.cancel()

        session["leave_task"] = None
        session["last_seen"] = timestamp()

        return connection_id

    def disconnect(self, websocket: WebSocket):
        return self.connections.pop(websocket, None)

    # -----------------------------------------------------------------------
    # Broadcasting
    # -----------------------------------------------------------------------

    async def broadcast(
        self,
        message: dict,
        room_id: str | None = None,
    ):
        dead_connections = []

        for connection, data in list(self.connections.items()):
            if room_id is not None and data["room_id"] != room_id:
                continue

            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for connection in dead_connections:
            self.disconnect(connection)

    async def send_room_user_count(self, room_id: str):
        await self.broadcast(
            {
                "type": "room_user_count",
                "room_id": room_id,
                "count": self.room_user_count(room_id),
            }
        )

    async def send_all_room_counts(self, websocket: WebSocket):
        for room_id in ROOMS:
            await websocket.send_json(
                {
                    "type": "room_user_count",
                    "room_id": room_id,
                    "count": self.room_user_count(room_id),
                }
            )

    async def send_room_users(self, websocket: WebSocket, room_id: str):
        await websocket.send_json(
            {
                "type": "room_users",
                "room_id": room_id,
                "users": self.room_users(room_id),
            }
        )

    async def broadcast_room_users(self, room_id: str):
        users = self.room_users(room_id)

        await self.broadcast(
            {
                "type": "room_users",
                "room_id": room_id,
                "users": users,
            },
            room_id=room_id,
        )

    async def send_online_users(self, websocket: WebSocket):
        await websocket.send_json(
            {
                "type": "online_users",
                "users": self.online_users(),
            }
        )

    async def broadcast_online_users(self):
        await self.broadcast(
            {
                "type": "online_users",
                "users": self.online_users(),
            }
        )

    # -----------------------------------------------------------------------
    # Room changes
    # -----------------------------------------------------------------------

    async def change_room(
        self,
        websocket: WebSocket,
        session: dict,
        new_room_id: str,
    ):
        if new_room_id not in ROOMS:
            return

        connection = self.connections.get(websocket)

        if not connection:
            return

        now = time.monotonic()

        if now - connection["last_room_change"] < ROOM_CHANGE_COOLDOWN:
            return

        old_room_id = connection["room_id"]

        if old_room_id == new_room_id:
            return

        connection["last_room_change"] = now

        session["last_seen"] = timestamp()

        # Move this connection silently.
        connection["room_id"] = new_room_id
        connection["opened_rooms"].add(new_room_id)

        # Update affected room counts.
        await self.send_room_user_count(old_room_id)
        await self.send_room_user_count(new_room_id)

        # Tell the client which room it is now in.
        await websocket.send_json(
            {
                "type": "room_changed",
                "room_id": new_room_id,
            }
        )

    # -----------------------------------------------------------------------
    # Session leave
    # -----------------------------------------------------------------------

    async def schedule_leave(
        self,
        session: dict,
        room_id: str,
    ):
        try:
            await asyncio.sleep(DISCONNECT_GRACE_PERIOD)

            # Session came back during the grace period.
            if self.session_is_connected(session["session_id"]):
                return

            # The entire session is genuinely gone.
            await self.broadcast(
                {
                    "type": "user_left",
                    "session_id": session["session_id"],
                    "username": session["username"],
                    "timestamp": timestamp(),
                },
                room_id=room_id,
            )

            await self.send_room_user_count(room_id)
            await self.broadcast_online_users()

            self.sessions.pop(session["session_id"], None)

            self.ignored_users.pop(session["session_id"], None)

            for ignored_set in self.ignored_users.values():
                ignored_set.discard(session["session_id"])

        except asyncio.CancelledError:
            pass

        finally:
            # Only clear the task if this is still the task belonging
            # to this session.
            current_task = asyncio.current_task()

            if session.get("leave_task") is current_task:
                session["leave_task"] = None


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# HTTP routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    session_id = request.cookies.get("chatten_session")

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    session = manager.get_or_create_session(
        session_id,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    with open(
        "templates/index.html",
        "r",
        encoding="utf-8",
    ) as file:
        content = file.read()

    response = HTMLResponse(content=content)

    if session_id != session["session_id"]:
        response.set_cookie(
            key="chatten_session",
            value=session["session_id"],
            httponly=True,
            samesite="lax",
        )

    return response


# -----------------------------------------------------------------------
# WebSocket
# -----------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    session_id = websocket.cookies.get("chatten_session")

    client_ip = websocket.client.host if websocket.client else None
    user_agent = websocket.headers.get("user-agent")

    session = manager.get_or_create_session(
        session_id,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    # A session with an active connection OR a pending leave task
    # is considered already present.
    was_present = manager.session_is_present(session)

    connection_id = await manager.connect(
        websocket,
        session,
    )

    room_id = DEFAULT_ROOM

    # -----------------------------------------------------------------------
    # New session joined Chatten
    # -----------------------------------------------------------------------

    if not was_present:
        await manager.broadcast(
            {
                "type": "user_joined",
                "connection_id": connection_id,
                "session_id": session["session_id"],
                "username": session["username"],
                "color": session["color"],
                "timestamp": timestamp(),
            },
            room_id=room_id,
        )

    await manager.send_room_user_count(room_id)
    await manager.send_all_room_counts(websocket)

    await websocket.send_json(
        {
            "type": "username",
            "session_id": session["session_id"],
            "username": session["username"],
            "color": session["color"],
        }
    )

    await manager.send_online_users(websocket)
    await manager.broadcast_online_users()

    # -----------------------------------------------------------------------
    # Receive messages
    # -----------------------------------------------------------------------

    try:
        while True:
            data = await websocket.receive_json()

            session["last_seen"] = timestamp()

            message_type = data.get("type")

            # ---------------------------------------------------------------
            # Change username
            # ---------------------------------------------------------------

            if message_type == "change_username":
                new_username = data.get("username")

                if not isinstance(new_username, str):
                    continue

                success, error = manager.change_username(session, new_username)

                if not success:
                    await websocket.send_json({
                        "type": "username_change_failed",
                        "message": error,
                    })
                    continue

                connection = manager.connections.get(websocket)

                if not connection:
                    continue

                room_id = connection["room_id"]

                await manager.broadcast(
                    {
                        "type": "username_changed",
                        "session_id": session["session_id"],
                        "username": session["username"],
                        "color": session["color"],
                    },
                    room_id=room_id,
                )

                await manager.broadcast_online_users()

                continue
            # ---------------------------------------------------------------
            # Ignore / unignore user
            # ---------------------------------------------------------------

            if message_type == "ignore_user":
                target_session_id = data.get("session_id")
                ignored = data.get("ignored")

                if not isinstance(target_session_id, str):
                    continue

                if not isinstance(ignored, bool):
                    continue

                if target_session_id == session["session_id"]:
                    continue

                if target_session_id not in manager.sessions:
                    continue

                manager.set_ignored_user(
                    session["session_id"],
                    target_session_id,
                    ignored,
                )

                continue

            # ---------------------------------------------------------------
            # Normal chat message
            # ---------------------------------------------------------------

            if message_type == "message":
                text = data.get("text", "")

                if not isinstance(text, str):
                    continue

                text = text.strip()

                if not text:
                    continue

                if len(text) > MAX_MESSAGE_LENGTH:
                    continue
                
                now = time.monotonic()

                if (
                    session["last_message_text"] == text
                    and now - session["last_message_time"] < 10
                ):
                    await websocket.send_json(
                        {
                            "type": "rate_limited",
                            "message": "Samma meddelande kan inte skickas igen direkt.",
                        }
                    )
                    continue

                session["last_message_text"] = text
                session["last_message_time"] = now

                connection = manager.connections.get(websocket)

                if not connection:
                    continue

                room_id = connection["room_id"]

                message_id = next_message_id()
                created_at = timestamp()

                await save_message(
                    message_id=message_id,
                    session_id=session["session_id"],
                    username=session["username"],
                    color=session["color"],
                    room_id=room_id,
                    text=text,
                    created_at=created_at,
                )

                message_data = {
                    "type": "message",
                    "id": message_id,
                    "connection_id": connection_id,
                    "session_id": session["session_id"],
                    "username": session["username"],
                    "color": session["color"],
                    "room_id": room_id,
                    "text": text,
                    "timestamp": created_at,
                }

                dead_connections = []

                for target_websocket, target_connection in list(manager.connections.items()):
                    if room_id not in target_connection["opened_rooms"]:
                        continue

                    target_session_id = target_connection["session_id"]

                    if target_session_id != session["session_id"]:
                        if manager.is_blocked_between(
                            session["session_id"],
                            target_session_id,
                        ):
                            continue

                    try:
                        await target_websocket.send_json(message_data)
                    except Exception:
                        dead_connections.append(target_websocket)

                for dead_websocket in dead_connections:
                    manager.disconnect(dead_websocket)

            # ---------------------------------------------------------------
            # Change room
            # ---------------------------------------------------------------

            elif message_type == "join_room":
                new_room_id = data.get("room_id")

                if not isinstance(new_room_id, str):
                    continue

                await manager.change_room(
                    websocket,
                    session,
                    new_room_id,
                )

    # -----------------------------------------------------------------------
    # Disconnect
    # -----------------------------------------------------------------------

    except WebSocketDisconnect:
        disconnected = manager.disconnect(websocket)

        if not disconnected:
            return

        session_id = disconnected["session_id"]
        room_id = disconnected["room_id"]

        session = manager.sessions.get(session_id)

        if not session:
            return

        # Another connection belonging to this session is still alive.
        if manager.session_is_connected(session_id):
            return

        # Start the grace period for the entire session.
        leave_task = session.get("leave_task")

        if leave_task and not leave_task.done():
            leave_task.cancel()

        leave_task = asyncio.create_task(
            manager.schedule_leave(
                session,
                room_id,
            )
        )

        session["leave_task"] = leave_task