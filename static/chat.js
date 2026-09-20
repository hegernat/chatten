const messages = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const roomButtons = document.querySelectorAll(".room-button");
const onlineUserList = document.getElementById("online-user-list");

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const websocket = new WebSocket(`${protocol}//${window.location.host}/ws`);
const soundToggle = document.getElementById("sound-toggle");
const soundIcon = document.getElementById("sound-icon");

const messageSound = new Audio("/static/sounds/msg02.mp3");
const mentionSound = new Audio("/static/sounds/mention01.mp3");

messageSound.volume = 0.25;
mentionSound.volume = 0.25;

let soundEnabled = localStorage.getItem("chatten_sound") !== "false";

let currentRoom = localStorage.getItem("chatten_room") || "lobby";
let pendingRoom = null;
let roomChangeTimer = null;
let roomChangeInProgress = false;
let currentSessionId = null;
let currentUsername = null;
let currentUserColor = null;

const IGNORED_USERS_KEY = "chatten_ignored_users";

let ignoredUsers = new Set(
    JSON.parse(localStorage.getItem(IGNORED_USERS_KEY) || "[]")
);

function saveIgnoredUsers() {
    localStorage.setItem(
        IGNORED_USERS_KEY,
        JSON.stringify([...ignoredUsers])
    );
}

function isUserIgnored(sessionId) {
    return ignoredUsers.has(sessionId);
}

function toggleIgnoredUser(sessionId) {
    const ignored = !ignoredUsers.has(sessionId);

    if (ignored) {
        ignoredUsers.add(sessionId);
    } else {
        ignoredUsers.delete(sessionId);
    }

    saveIgnoredUsers();

    websocket.send(JSON.stringify({
        type: "ignore_user",
        session_id: sessionId,
        ignored: ignored,
    }));

    renderCurrentRoom();
}

const roomMessageHistory = new Map();

function getRoomMessageHistory(roomId) {
    if (!roomMessageHistory.has(roomId)) {
        roomMessageHistory.set(roomId, []);
    }

    return roomMessageHistory.get(roomId);
}

function renderMessage(data) {
    if (isUserIgnored(data.session_id)) {
        return;
    }

    const message = document.createElement("div");
    message.className = "message";

    const username = document.createElement("span");
    username.className = "username";
    username.textContent = data.username;
    username.style.color = data.color;

    username.addEventListener("click", function () {
        input.focus();

        const mention = `@${data.username} `;

        if (!input.value.includes(mention)) {
            input.value += mention;
        }

        input.focus();
    });

    const text = document.createElement("span");
    text.className = "message-text";
    text.textContent = data.text;

    if (
        currentUsername &&
        new RegExp(`(^|\\s)@${currentUsername}(?=\\s|$)`, "i").test(data.text)
    ) {
        message.classList.add("mention");
    }

    const time = document.createElement("span");
    time.className = "message-time";

    const date = new Date(data.timestamp);

    const formatted = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);

    time.textContent = formatted.replace(",", "");

    message.appendChild(username);
    message.appendChild(time);
    message.appendChild(text);

    messages.appendChild(message);
}


function addMessage(data) {
    const history = getRoomMessageHistory(data.room_id);

    history.push(data);

    if (history.length > 500) {
        history.shift();
    }

    if (data.room_id !== currentRoom) {
        return;
    }

    renderMessage(data);
    messages.scrollTop = messages.scrollHeight;
}

function renderCurrentRoom() {
    messages.innerHTML = "";

    const history = getRoomMessageHistory(currentRoom);

    history.forEach((message) => {
        renderMessage(message);
    });

    messages.scrollTop = messages.scrollHeight;
}

function addSystemMessage(data) {
    const message = document.createElement("div");
    message.className = "system-message";

    if (data.type === "user_joined") {
        message.textContent = `${data.username} anslöt till chatten`;
    }

    if (data.type === "user_left") {
        message.textContent = `${data.username} lämnade chatten`;
    }

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}


function updateRoomCount(roomId, count) {
    const button = document.querySelector(
        `.room-button[data-room-id="${roomId}"]`
    );

    if (!button) {
        return;
    }

    const countElement = button.querySelector(".room-count");

    if (!countElement) {
        return;
    }

    countElement.textContent = count > 0 ? `(${count})` : "";
}


function setActiveRoom(roomId) {
    currentRoom = roomId;
    localStorage.setItem("chatten_room", roomId);

    roomButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.roomId === roomId
        );
    });
}

function updateOnlineUsers(users) {
    onlineUserList.innerHTML = "";

    users.forEach((user) => {
        const userElement = document.createElement("div");
        userElement.className = "online-user";
        userElement.dataset.sessionId = user.session_id;
        userElement.style.color = user.color;

        const name = document.createElement("span");
        name.className = "online-user-name";
        name.textContent = user.username;

        if (user.session_id === currentSessionId) {
            userElement.classList.add("self");
            name.textContent += " •";

            name.addEventListener("click", function () {
                openUsernameEditor(userElement, user);
            });

            userElement.appendChild(name);
        } else {
            name.addEventListener("click", function () {
                input.focus();

                const mention = `@${user.username} `;

                if (!input.value.includes(mention)) {
                    input.value += mention;
                }

                input.focus();
            });

            const ignoreButton = document.createElement("button");
            ignoreButton.type = "button";
            ignoreButton.className = "ignore-button";

            const ignored = isUserIgnored(user.session_id);

            const ignoreIcon = document.createElement("img");
            ignoreIcon.src = "/static/images/block.svg";
            ignoreIcon.alt = "";
            ignoreIcon.className = "ignore-icon";

            ignoreButton.appendChild(ignoreIcon);

            ignoreButton.title = ignored
                ? "Sluta ignorera"
                : "Ignorera användare";

            if (ignored) {
                userElement.classList.add("ignored");
            }

            ignoreButton.addEventListener("click", function (event) {
                event.stopPropagation();

                toggleIgnoredUser(user.session_id);

                const nowIgnored = isUserIgnored(user.session_id);

                ignoreButton.title = nowIgnored
                    ? "Sluta ignorera"
                    : "Ignorera användare";

                userElement.classList.toggle("ignored", nowIgnored);
            });

            userElement.appendChild(name);
            userElement.appendChild(ignoreButton);
        }

        onlineUserList.appendChild(userElement);
    });
}

function openUsernameEditor(userElement, user) {
    if (userElement.querySelector(".username-edit")) {
        return;
    }

    userElement.innerHTML = "";
    userElement.classList.add("editing");

    const input = document.createElement("input");
    input.className = "username-edit";
    input.type = "text";
    input.maxLength = 20;
    input.value = user.username;
    input.autocomplete = "off";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Spara";
    saveButton.className = "username-save";

    userElement.appendChild(input);
    userElement.appendChild(saveButton);

    input.focus();
    input.select();

    function saveUsername() {
        const username = input.value.trim();

        if (!username) {
            return;
        }

        if (websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        websocket.send(
            JSON.stringify({
                type: "change_username",
                username: username,
            })
        );
    }

    saveButton.addEventListener("click", function (event) {
        event.stopPropagation();
        saveUsername();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveUsername();
        }
    });
}

function changeRoom(roomId) {
    if (roomId === currentRoom) {
        return;
    }

    if (websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    if (roomChangeInProgress) {
        return;
    }

    pendingRoom = roomId;

    clearTimeout(roomChangeTimer);

    roomChangeTimer = setTimeout(() => {
        if (!pendingRoom) {
            return;
        }

        roomChangeInProgress = true;

        websocket.send(
            JSON.stringify({
                type: "join_room",
                room_id: pendingRoom,
            })
        );

        pendingRoom = null;
    }, 150);
}

function updateSoundToggle() {
    soundIcon.src = soundEnabled
        ? "/static/images/notification-sound.svg"
        : "/static/images/notification-sound-off.svg";

    soundToggle.setAttribute(
        "aria-label",
        soundEnabled ? "Ljud av" : "Ljud på"
    );

    soundToggle.setAttribute(
        "title",
        soundEnabled ? "Ljud av" : "Ljud på"
    );
}

function playNotificationSound() {
    if (!soundEnabled) return;
    if (document.visibilityState !== "hidden") return;

    messageSound.currentTime = 0;
    messageSound.play().catch(() => {});
}

function playMentionSound() {
    if (!soundEnabled) return;
    if (document.visibilityState !== "hidden") return;

    mentionSound.currentTime = 0;
    mentionSound.play().catch(() => {});
}

websocket.onopen = function () {
    messages.innerHTML = "";
    input.focus();

    const savedRoom = localStorage.getItem("chatten_room");

    if (savedRoom && savedRoom !== "lobby") {
        websocket.send(JSON.stringify({
            type: "join_room",
            room_id: savedRoom,
        }));
    }
};

websocket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case "message":
            addMessage(data);

            if (data.session_id !== currentSessionId) {
                const mentioned =
                    currentUsername &&
                    data.text.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);

                if (mentioned) {
                    playMentionSound();
                } else {
                    playNotificationSound();
                }
            }

            break;

        case "user_joined":
        case "user_left":
            addSystemMessage(data);
            break;

        case "room_user_count":
            updateRoomCount(
                data.room_id,
                data.count
            );
            break;

        case "online_users":
            updateOnlineUsers(data.users);
            break;

        case "room_changed":
            setActiveRoom(data.room_id);

            roomChangeInProgress = false;

            renderCurrentRoom();
            input.focus();
            break;

        case "rate_limited":
            console.log(data.message);
            break;

        case "username":
            currentSessionId = data.session_id;
            currentUsername = data.username;
            currentUserColor = data.color;
            break;

        case "username_changed":
            if (data.session_id === currentSessionId) {
                currentUsername = data.username;
                currentUserColor = data.color;
            }

            for (const history of roomMessageHistory.values()) {
                for (const message of history) {
                    if (message.session_id === data.session_id) {
                        message.username = data.username;
                        message.color = data.color;
                    }
                }
            }

            renderCurrentRoom();
            break;

        case "username_change_failed":
            console.log(data.message);
            break;
    }
};


websocket.onclose = function () {
    console.log("WebSocket connection closed");
};


form.addEventListener("submit", function (event) {
    event.preventDefault();

    const text = input.value.trim();

    if (!text) {
        return;
    }

    if (websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    websocket.send(
        JSON.stringify({
            type: "message",
            text: text,
        })
    );

    input.value = "";
    input.focus();
});


roomButtons.forEach((button) => {
    button.addEventListener("click", function () {
        changeRoom(button.dataset.roomId);
    });
});

soundToggle.addEventListener("click", function () {
    soundEnabled = !soundEnabled;

    localStorage.setItem(
        "chatten_sound",
        soundEnabled ? "true" : "false"
    );

    updateSoundToggle();

    if (soundEnabled) {
        messageSound.play().then(() => {
            messageSound.pause();
            messageSound.currentTime = 0;
        }).catch(() => {});
    }
});

updateSoundToggle();