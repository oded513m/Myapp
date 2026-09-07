const ACCESS_NAME_KEY = "myapp-access-admin-name";
const ACCESS_PASSWORD_KEY = "myapp-access-password";
const ACCESS_SESSION_KEY = "myapp-access-unlocked";
const REQUIRED_ADMIN_NAME = "appadmin";

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
      <p class="access-lock-message"></p>

      <label class="field">
        <span>Name</span>
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

      <label class="field access-confirm-field" hidden>
        <span>Confirm password</span>
        <input name="confirm" type="password" autocomplete="new-password" minlength="4" />
      </label>

      <p class="access-lock-error" role="alert"></p>
      <button class="primary-button" type="submit">Unlock</button>
      <button class="primary-button secondary-button" type="button" hidden>Change password</button>
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
  const confirmField = lock.querySelector(".access-confirm-field");
  const newField = lock.querySelector(".access-new-field");
  const confirmInput = form.elements.confirm;
  const error = lock.querySelector(".access-lock-error");
  const actionButton = lock.querySelector(".primary-button");
  const changeButton = lock.querySelector(".secondary-button");
  const hasPassword = Boolean(localStorage.getItem(ACCESS_PASSWORD_KEY));
  const changeMode = { active: false };

  function updateFormMode() {
    if (!hasPassword) {
      message.textContent = "Create your admin name and password to protect this app on this device.";
      confirmField.hidden = false;
      newField.hidden = true;
      actionButton.textContent = "Create password";
      changeButton.hidden = true;
      nameInput.placeholder = REQUIRED_ADMIN_NAME;
      passwordInput.autocomplete = "new-password";
      newPasswordInput.value = "";
      confirmInput.value = "";
      return;
    }

    if (changeMode.active) {
      message.textContent = "Enter your admin name and old password before setting a new password.";
      newField.hidden = false;
      confirmField.hidden = false;
      actionButton.textContent = "Update password";
      changeButton.textContent = "Cancel";
      changeButton.hidden = false;
      passwordInput.autocomplete = "current-password";
      newPasswordInput.autocomplete = "new-password";
    } else {
      message.textContent = "Enter your admin name and password to continue.";
      newField.hidden = true;
      confirmField.hidden = true;
      actionButton.textContent = "Unlock";
      changeButton.textContent = "Change password";
      changeButton.hidden = false;
      passwordInput.autocomplete = "current-password";
      newPasswordInput.value = "";
      confirmInput.value = "";
    }
  }

  changeButton.addEventListener("click", () => {
    error.textContent = "";
    changeMode.active = !changeMode.active;
    nameInput.value = "";
    passwordInput.value = "";
    newPasswordInput.value = "";
    confirmInput.value = "";
    updateFormMode();
    nameInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    const enteredName = normalizeAdminName(nameInput.value);
    const password = passwordInput.value;

    if (!hasPassword) {
      if (enteredName !== REQUIRED_ADMIN_NAME) {
        error.textContent = "Admin name must be appadmin.";
        nameInput.select();
        return;
      }

      if (password.length < 4) {
        error.textContent = "Password must be at least 4 characters.";
        passwordInput.select();
        return;
      }

      if (password !== confirmInput.value) {
        error.textContent = "Passwords do not match.";
        return;
      }

      localStorage.setItem(ACCESS_NAME_KEY, await hashValue(REQUIRED_ADMIN_NAME));
      localStorage.setItem(ACCESS_PASSWORD_KEY, await hashValue(password));
    } else if (changeMode.active) {
      const storedNameHash = localStorage.getItem(ACCESS_NAME_KEY);
      const enteredNameHash = await hashValue(enteredName);

      if (enteredName !== REQUIRED_ADMIN_NAME || enteredNameHash !== storedNameHash) {
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
      if (newPassword.length < 4) {
        error.textContent = "New password must be at least 4 characters.";
        newPasswordInput.select();
        return;
      }

      if (newPassword !== confirmInput.value) {
        error.textContent = "New passwords do not match.";
        return;
      }

      localStorage.setItem(ACCESS_NAME_KEY, await hashValue(REQUIRED_ADMIN_NAME));
      localStorage.setItem(ACCESS_PASSWORD_KEY, await hashValue(newPassword));
      changeMode.active = false;
      sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
      lock.remove();
      return;
    } else {
      const storedNameHash = localStorage.getItem(ACCESS_NAME_KEY);
      const enteredNameHash = await hashValue(enteredName);

      if (enteredNameHash !== storedNameHash || enteredName !== REQUIRED_ADMIN_NAME) {
        error.textContent = "Incorrect admin name or password.";
        nameInput.select();
        return;
      }

      if (await hashValue(password) !== localStorage.getItem(ACCESS_PASSWORD_KEY)) {
        error.textContent = "Incorrect admin name or password.";
        passwordInput.select();
        return;
      }
    }

    sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    lock.remove();
  });

  updateFormMode();
  nameInput.focus();
}

startAccessLock();
