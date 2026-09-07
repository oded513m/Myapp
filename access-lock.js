const ACCESS_SESSION_KEY = "myapp-access-unlocked";

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

async function hashValue(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createAccessLock() {
  const lock = document.createElement("div");
  lock.className = "access-lock";
  lock.innerHTML = `
    <form class="access-lock-panel">
      <p class="eyebrow">Private app</p>
      <h1>Unlock My app</h1>
      <p class="access-lock-message">Enter your username and password to continue.</p>
      <label class="field">
        <span>Username</span>
        <input name="username" type="text" autocomplete="username" required />
      </label>
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <p class="access-lock-error" role="alert"></p>
      <button class="primary-button" type="submit">Log in</button>
    </form>`;
  document.body.append(lock);
  return lock;
}

async function startAccessLock() {
  if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "true") return;

  const lock = createAccessLock();
  const form = lock.querySelector("form");
  const usernameInput = form.elements.username;
  const passwordInput = form.elements.password;
  const error = lock.querySelector(".access-lock-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    const usernameHash = await hashValue(normalizeValue(usernameInput.value));
    const passwordHash = await hashValue(passwordInput.value);

    if (usernameHash !== ACCESS_CREDENTIALS.usernameHash || passwordHash !== ACCESS_CREDENTIALS.passwordHash) {
      error.textContent = "Incorrect username or password.";
      passwordInput.select();
      return;
    }

    sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    lock.remove();
  });

  usernameInput.focus();
}

startAccessLock();
