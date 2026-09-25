const messages = document.getElementById("messages");
const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const messageCounter = document.getElementById("message-counter");

function updateMessageCounter() {
    messageCounter.textContent = `${input.value.length}/4000`;
}

input.addEventListener("input", updateMessageCounter);
updateMessageCounter();

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

const roomButtons = document.querySelectorAll(".room-button");
const onlineUserList = document.getElementById("online-user-list");
const menuToggle = document.getElementById("menu-toggle");
const menuClose = document.getElementById("menu-close");
const menuOverlay = document.getElementById("menu-overlay");
const menuDrawer = document.getElementById("menu-drawer");
const userlistToggle = document.getElementById("userlist-toggle");
const onlineUsersPanel = document.getElementById("online-users");
const chatContent = document.querySelector(".chat-content");

const registerLoginInput = document.getElementById("register-login-name");
const registerLoginStatus = document.getElementById("register-login-status");

const registerAliasInput = document.getElementById("register-alias");
const registerAliasStatus = document.getElementById("register-alias-status");
const registerPasswordInput = document.getElementById("register-password");
const registerPasswordConfirmInput = document.getElementById("register-password-confirm");
const registerPasswordStatus = document.getElementById("register-password-status");
const registerPasswordConfirmStatus = document.getElementById("register-password-confirm-status");
const registerError = document.getElementById("register-error");
const registerSubmit = document.getElementById("register-submit");
const registerConfirmPanel = document.getElementById("register-confirm-panel");
const registerConfirmCancel = document.getElementById("register-confirm-cancel");
const registerConfirmSubmit = document.getElementById("register-confirm-submit");

let loginCheckTimer = null;
let aliasCheckTimer = null;
let registrationConfirmed = false;

function setAvailabilityStatus(element, state, text) {
    element.textContent = text;
    element.classList.remove(
        "auth-status-available",
        "auth-status-unavailable",
        "auth-status-error"
    );

    if (state === "available") {
        element.classList.add("auth-status-available");
    } else if (state === "unavailable") {
        element.classList.add("auth-status-unavailable");
    } else if (state === "error") {
        element.classList.add("auth-status-error");
    }
}

function updatePasswordStatus() {
    const password = registerPasswordInput.value;

    if (!password) {
        setAvailabilityStatus(registerPasswordStatus, null, "");
        return;
    }

    if (password.length < 8) {
        setAvailabilityStatus(
            registerPasswordStatus,
            "unavailable",
            "✕ Minst 8 tecken krävs."
        );
        return;
    }

    if (password.length > 128) {
        setAvailabilityStatus(
            registerPasswordStatus,
            "unavailable",
            "✕ Max 128 tecken."
        );
        return;
    }

    setAvailabilityStatus(
        registerPasswordStatus,
        "available",
        "✓ Lösenordet uppfyller kraven."
    );
}

function updatePasswordConfirmStatus() {
    const password = registerPasswordInput.value;
    const confirmation = registerPasswordConfirmInput.value;

    if (!confirmation) {
        setAvailabilityStatus(registerPasswordConfirmStatus, null, "");
        return;
    }

    if (password === confirmation) {
        setAvailabilityStatus(
            registerPasswordConfirmStatus,
            "available",
            "✓ Lösenorden matchar."
        );
    } else {
        setAvailabilityStatus(
            registerPasswordConfirmStatus,
            "unavailable",
            "✕ Lösenorden matchar inte."
        );
    }
}

document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Dölj";
        } else {
            input.type = "password";
            button.textContent = "Visa";
        }
    });
});

function checkLoginNameAvailability() {
    clearTimeout(loginCheckTimer);

    const loginName = registerLoginInput.value.trim().toLowerCase();

    if (!loginName) {
        setAvailabilityStatus(registerLoginStatus, null, "");
        return;
    }

    loginCheckTimer = setTimeout(async () => {
        try {
            const response = await fetch("/api/check-login-name", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login_name: loginName
                })
            });

            const result = await response.json();

            if (!result.ok) {
                setAvailabilityStatus(
                    registerLoginStatus,
                    "error",
                    result.error
                );
                return;
            }

            if (result.available) {
                setAvailabilityStatus(
                    registerLoginStatus,
                    "available",
                    "✓ Tillgängligt"
                );
            } else {
                setAvailabilityStatus(
                    registerLoginStatus,
                    "unavailable",
                    "✕ Upptaget"
                );
            }
        } catch {
            setAvailabilityStatus(
                registerLoginStatus,
                "error",
                "Kunde inte kontrollera tillgänglighet."
            );
        }
    }, 300);
}

function checkAliasAvailability() {
    clearTimeout(aliasCheckTimer);

    const alias = registerAliasInput.value.trim();

    if (!alias) {
        setAvailabilityStatus(registerAliasStatus, null, "");
        return;
    }

    aliasCheckTimer = setTimeout(async () => {
        try {
            const response = await fetch("/api/check-alias", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    alias: alias
                })
            });

            const result = await response.json();

            if (!result.ok) {
                setAvailabilityStatus(
                    registerAliasStatus,
                    "error",
                    result.error
                );
                return;
            }

            if (result.available) {
                setAvailabilityStatus(
                    registerAliasStatus,
                    "available",
                    "✓ Tillgängligt"
                );
            } else {
                setAvailabilityStatus(
                    registerAliasStatus,
                    "unavailable",
                    "✕ Upptaget"
                );
            }
        } catch {
            setAvailabilityStatus(
                registerAliasStatus,
                "error",
                "Kunde inte kontrollera tillgänglighet."
            );
        }
    }, 300);
}

registerSubmit.addEventListener("click", async () => {
    registerError.textContent = "";

    const loginName = registerLoginInput.value.trim().toLowerCase();
    const alias = registerAliasInput.value.trim();
    const password = registerPasswordInput.value;
    const passwordConfirm = registerPasswordConfirmInput.value;

    if (!loginName || !alias || !password || !passwordConfirm) {
        registerError.textContent = "Fyll i alla fält.";
        return;
    }

    if (password !== passwordConfirm) {
        registerError.textContent = "Lösenorden matchar inte.";
        return;
    }

    if (!registrationConfirmed) {
        registerConfirmPanel.classList.remove("hidden");
        return;
    }

    registerSubmit.disabled = true;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login_name: loginName,
                alias: alias,
                password: password,
                password_confirm: passwordConfirm
            })
        });

        const result = await response.json();

        if (!result.ok) {
            registerError.textContent = result.error;
            return;
        }

        registerError.textContent = "";
        registrationConfirmed = false;
        showLoginForm();

        const loginNameInput = document.getElementById("login-name");
        loginNameInput.value = loginName;
        document.getElementById("login-password").focus();

    } catch {
        registerError.textContent =
            "Kunde inte registrera kontot. Försök igen.";
    } finally {
        registerSubmit.disabled = false;
    }
});

registerConfirmCancel.addEventListener("click", () => {
    registrationConfirmed = false;
    registerConfirmPanel.classList.add("hidden");
});

registerConfirmSubmit.addEventListener("click", () => {
    registrationConfirmed = true;
    registerConfirmPanel.classList.add("hidden");
    registerSubmit.click();
});

registerLoginInput.addEventListener(
    "input",
    () => {
        registerError.textContent = "";
        checkLoginNameAvailability();
    }
);

registerAliasInput.addEventListener(
    "input",
    () => {
        registerError.textContent = "";
        checkAliasAvailability();
    }
);

registerPasswordInput.addEventListener(
    "input",
    () => {
        registerError.textContent = "";
        updatePasswordStatus();
        updatePasswordConfirmStatus();
    }
);

registerPasswordConfirmInput.addEventListener(
    "input",
    () => {
        registerError.textContent = "";
        updatePasswordConfirmStatus();
    }
);

function openMenu() {
    menuOverlay.hidden = false;
    menuDrawer.classList.add("open");

    menuToggle.setAttribute("aria-expanded", "true");
    menuDrawer.setAttribute("aria-hidden", "false");
}

function closeMenu() {
    menuDrawer.classList.remove("open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuDrawer.setAttribute("aria-hidden", "true");

    setTimeout(() => {
        if (!menuDrawer.classList.contains("open")) {
            menuOverlay.hidden = true;
        }
    }, 160);
}

const menuProfile = document.getElementById("menu-profile");
const menuLogout = document.getElementById("menu-logout");

let isLoggedIn = false;

const authPanel = document.getElementById("auth-panel");

const loginTab = document.getElementById("auth-login-tab");
const registerTab = document.getElementById("auth-register-tab");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");

const loginNameInput = document.getElementById("login-name");

[loginNameInput, loginPasswordInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            loginSubmit.click();
        }
    });
});

function openAuthPanel(mode = "login") {
    authPanel.classList.remove("hidden");

    if (mode === "register") {
        showRegisterForm();
    } else {
        showLoginForm();
    }
}

function closeAuthPanel() {
    authPanel.classList.add("hidden");
}

function updateAuthMenu() {
    menuLogout.classList.toggle("hidden", !isLoggedIn);
}

menuLogout.addEventListener("click", async () => {
    try {
        const response = await fetch("/api/logout", {
            method: "POST"
        });

        const result = await response.json();

        if (!result.ok) {
            return;
        }

        isLoggedIn = false;
        updateAuthMenu();

        currentSessionId = null;
        currentUsername = null;
        currentUserColor = null;

        closeMenu();

        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.close();
        }
    } catch {
        // Behåll inloggat läge om logout-begäran misslyckas.
    }
});

document.getElementById("auth-close").addEventListener("click", closeAuthPanel);

function showLoginForm() {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
}

function showRegisterForm() {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");

    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
}

loginSubmit.addEventListener("click", async () => {
    loginError.textContent = "";

    const loginName = document.getElementById("login-name").value
        .trim()
        .toLowerCase();

    const password = loginPasswordInput.value;

    if (!loginName || !password) {
        loginError.textContent = "Fyll i Login-ID och lösenord.";
        return;
    }

    loginSubmit.disabled = true;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                login_name: loginName,
                password: password
            })
        });

        const result = await response.json();

        if (!result.ok) {
            loginError.textContent = result.error;
            return;
        }
        
        isLoggedIn = true;
        updateAuthMenu();

        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.close();
        }

        closeAuthPanel();

    } catch {
        loginError.textContent =
            "Kunde inte logga in. Försök igen.";
    } finally {
        loginSubmit.disabled = false;
    }
});

loginTab.addEventListener("click", () => {
    showLoginForm();
});

registerTab.addEventListener("click", () => {
    showRegisterForm();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !authPanel.classList.contains("hidden")) {
        closeAuthPanel();
    }
});

function toggleUserlist() {
    const hidden = onlineUsersPanel.classList.toggle("collapsed");

    userlistToggle.textContent = hidden ? "+" : "−";
    userlistToggle.setAttribute(
        "aria-expanded",
        String(!hidden)
    );
    userlistToggle.setAttribute(
        "aria-label",
        hidden
            ? "Visa användarlista"
            : "Dölj användarlista"
    );
}

userlistToggle.addEventListener("click", toggleUserlist);

menuToggle.addEventListener("click", function () {
    if (menuDrawer.classList.contains("open")) {
        closeMenu();
    } else {
        openMenu();
    }
});

menuClose.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

document.querySelectorAll("[data-menu-action]").forEach((button) => {
    button.addEventListener("click", function () {
        const action = button.dataset.menuAction;

        if (action === "profile") {
            closeMenu();
            openAuthPanel("login");
        }
    });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && menuDrawer.classList.contains("open")) {
        closeMenu();
    }
});

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
let websocket = null;

function connectWebSocket() {
    websocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    websocket.onopen = websocketOnOpen;
    websocket.onmessage = websocketOnMessage;
    websocket.onclose = websocketOnClose;
}
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
let activityTimer = null;

function reportActivity() {
    if (websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    if (activityTimer) {
        return;
    }

    websocket.send(JSON.stringify({
        type: "activity"
    }));

    activityTimer = setTimeout(() => {
        activityTimer = null;
    }, 15000);
}

[
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click"
].forEach(eventName => {
    document.addEventListener(eventName, reportActivity, {
        passive: true
    });
});

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

    if (button) {
        const countElement = button.querySelector(".room-count");

        if (countElement) {
            countElement.textContent = count > 0 ? `(${count})` : "";
        }
    }
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
        userElement.style.color = user.idle ? "#e3a35c" : user.color;

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

    const input = document.createElement("div");
    input.className = "username-edit";
    input.contentEditable = "true";
    input.setAttribute("role", "textbox");
    input.setAttribute("aria-label", "Alias");
    input.spellcheck = false;
    input.textContent = user.username;

    input.addEventListener("input", function () {
        if (input.textContent.length > 20) {
            input.textContent = input.textContent.slice(0, 20);
        }
    });

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Spara";
    saveButton.className = "username-save";

    userElement.appendChild(input);
    userElement.appendChild(saveButton);

    input.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection.removeAllRanges();
    selection.addRange(range);

    function saveUsername() {
        const username = input.textContent.trim();

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

function websocketOnOpen() {
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

function websocketOnMessage(event) {
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

            isLoggedIn = data.authenticated;
            updateAuthMenu();

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


function websocketOnClose() {
    console.log("WebSocket connection closed");

    if (document.visibilityState === "hidden") {
        return;
    }

    connectWebSocket();
}

connectWebSocket();

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
    updateMessageCounter();
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