const ACCESS_PASSWORD_KEY = "myapp-access-password";
const ACCESS_SESSION_KEY = "myapp-access-unlocked";

async function hashAccessPassword(password) {
  const data = new TextEncoder().encode(password);
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
        <span>Password</span>
        <input name="password" type="password" autocomplete="current-password" minlength="4" required />
      </label>
      <label class="field access-confirm-field" hidden>
        <span>Confirm password</span>
        <input name="confirm" type="password" autocomplete="new-password" minlength="4" />
      </label>
      <p class="access-lock-error" role="alert"></p>
      <button class="primary-button" type="submit">Unlock</button>
    </form>`;
  document.body.append(lock);
  return lock;
}

async function startAccessLock() {
  if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "true") return;

  const lock = createAccessLock();
  const form = lock.querySelector("form");
  const message = lock.querySelector(".access-lock-message");
  const confirmField = lock.querySelector(".access-confirm-field");
  const confirmInput = form.elements.confirm;
  const passwordInput = form.elements.password;
  const error = lock.querySelector(".access-lock-error");
  const hasPassword = Boolean(localStorage.getItem(ACCESS_PASSWORD_KEY));

  message.textContent = hasPassword
    ? "Enter your password to continue."
    : "Create a password to protect this app on this device.";
  confirmField.hidden = hasPassword;
  passwordInput.autocomplete = hasPassword ? "current-password" : "new-password";
  passwordInput.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const password = passwordInput.value;

    if (!hasPassword) {
      if (password !== confirmInput.value) {
        error.textContent = "Passwords do not match.";
        return;
      }
      localStorage.setItem(ACCESS_PASSWORD_KEY, await hashAccessPassword(password));
    } else if (await hashAccessPassword(password) !== localStorage.getItem(ACCESS_PASSWORD_KEY)) {
      error.textContent = "Incorrect password.";
      passwordInput.select();
      return;
    }

    sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    lock.remove();
  });
}

startAccessLock();
