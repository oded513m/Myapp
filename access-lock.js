const ACCESS_NAME_KEY = "myapp-access-admin-name";
const ACCESS_PASSWORD_KEY = "myapp-access-password";
const ACCESS_SESSION_KEY = "myapp-access-unlocked";
const ACCESS_VERSION_KEY = "myapp-access-version";
const REQUIRED_ADMIN_NAME = "appadmin";
const DEFAULT_PASSWORD = "admin123";

function normalizeAdminName(value) {
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
        <input name="name" type="text" autocomplete="username" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input name="password" type="password" autocomplete="current-password" minlength="4" required />
      </label>

      <label class="field access-new-field" hidden>
        <span>New password</span>
        <input name="newPassword" type="password" autocomplete="new-password" minlength="4" />
      </label>

      <p class="access-lock-error" role="alert"></p>
      <button class="primary-button" type="submit">Unlock</button>
      <button class="primary-button secondary-button" type="button">Change password</button>
    </form>`;
  document.body.append(lock);
  return lock;
}

async function startAccessLock() {
  if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "true") return;

  const lock = createAccessLock();
  const form = lock.querySelector("form");
  const message = lock.querySelector(".access-lock-message");
  const nameInput = form.elements.name;
  const passwordInput = form.elements.password;
  const newPasswordInput = form.elements.newPassword;
  const newField = lock.querySelector(".access-new-field");
  const error = lock.querySelector(".access-lock-error");
  const actionButton = lock.querySelector(".primary-button");
  const changeButton = lock.querySelector(".secondary-button");
  const changeMode = { active: false };

  function updateFormMode() {
    if (changeMode.active) {
      message.textContent = "Enter your username, old password, and new password.";
      newField.hidden = false;
      actionButton.textContent = "Update password";
      changeButton.textContent = "Cancel";
      passwordInput.autocomplete = "current-password";
      newPasswordInput.autocomplete = "new-password";
    } else {
      message.textContent = "Enter your admin name and password to continue.";
      newField.hidden = true;
      actionButton.textContent = "Unlock";
      changeButton.textContent = "Change password";
      passwordInput.autocomplete = "current-password";
      newPasswordInput.value = "";
    }
  }

  changeButton.addEventListener("click", () => {
    error.textContent = "";
    changeMode.active = !changeMode.active;
    nameInput.value = "";
    passwordInput.value = "";
    newPasswordInput.value = "";
    updateFormMode();
    nameInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    const enteredName = normalizeAdminName(nameInput.value);
    const password = passwordInput.value;

    if (changeMode.active) {
      if (enteredName !== REQUIRED_ADMIN_NAME) {
        error.textContent = "Incorrect admin name.";
        nameInput.select();
        return;
      }

      if (await hashValue(password) !== localStorage.getItem(ACCESS_PASSWORD_KEY)) {
        error.textContent = "Incorrect old password.";
        passwordInput.select();
        return;
      }

      const newPassword = newPasswordInput.value;
      if (newPassword.length < 1) {
        error.textContent = "Enter a new password.";
        newPasswordInput.select();
        return;
      }
      localStorage.setItem(ACCESS_PASSWORD_KEY, await hashValue(newPassword));
      changeMode.active = false;
      sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
      lock.remove();
      return;
    } else {
      if (enteredName !== REQUIRED_ADMIN_NAME || await hashValue(password) !== localStorage.getItem(ACCESS_PASSWORD_KEY)) {
        error.textContent = "Incorrect admin name or password.";
        nameInput.select();
        return;
      }
    }

    sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    lock.remove();
  });

  if (localStorage.getItem(ACCESS_VERSION_KEY) !== "2") {
    localStorage.setItem(ACCESS_NAME_KEY, await hashValue(REQUIRED_ADMIN_NAME));
    localStorage.setItem(ACCESS_PASSWORD_KEY, await hashValue(DEFAULT_PASSWORD));
    localStorage.setItem(ACCESS_VERSION_KEY, "2");
  }

  updateFormMode();
  nameInput.focus();
}

startAccessLock();
