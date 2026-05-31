/**
 * GYM ROUTINE TRACKER - App Logic
 * Vanilla JS, Mobile-First
 */

let syncInterval = null;

async function testAppsScriptConnection() {
  if (!isAppsScriptConfigured()) return;

  try {
    const res = await fetch(buildAppsScriptActionUrl("ping"));
    const data = await res.json();

    console.log("[APPS SCRIPT] conectado", data);
  } catch (err) {
    console.error("[APPS SCRIPT] error de conexion", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  testAppsScriptConnection();
});

function buildAppsScriptActionUrl(action) {
  const params = new URLSearchParams({ action });

  if (typeof APPS_SCRIPT_API_KEY !== "undefined" && APPS_SCRIPT_API_KEY) {
    params.set("apiKey", APPS_SCRIPT_API_KEY);
  }

  return APPS_SCRIPT_URL + "?" + params.toString();
}

async function appsScriptRequest(action, payload) {
  if (!isAppsScriptConfigured()) {
    throw new Error("Apps Script no configurado.");
  }

  const res = await fetch(buildAppsScriptActionUrl(action), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data = null;

  try {
    data = JSON.parse(raw);
  } catch (_) {
    data = { ok: false, error: raw || "Respuesta invalida del servidor." };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Error de conexion.");
  }

  return data;
}

function isAppsScriptConfigured() {
  return (
    typeof APPS_SCRIPT_URL !== "undefined" &&
    APPS_SCRIPT_URL &&
    APPS_SCRIPT_URL !== "URL_PUBLICA_DEL_APPS_SCRIPT" &&
    APPS_SCRIPT_URL !== "PEGAR_URL_PUBLICA_DE_APPS_SCRIPT_AQUI"
  );
}

function showAuthMessage(message, isError = false) {
  const el = document.getElementById("auth-message");
  if (!el) return;

  el.textContent = message || "";
  el.style.color = isError ? "#c62828" : "#555";
}

function getAppModalStack() {
  let stack = document.getElementById("app-modal-stack");

  if (!stack) {
    stack = document.createElement("div");
    stack.id = "app-modal-stack";
    document.body.appendChild(stack);
  }

  return stack;
}

function getAppToastStack() {
  let stack = document.getElementById("app-toast-stack");

  if (!stack) {
    stack = document.createElement("div");
    stack.id = "app-toast-stack";
    stack.className = "app-toast-stack";
    document.body.appendChild(stack);
  }

  return stack;
}

function closeAppModal(overlay, value, resolve) {
  if (overlay.dataset.closing === "true") return;
  overlay.dataset.closing = "true";
  overlay.classList.remove("is-visible");
  setTimeout(() => {
    overlay.remove();
    resolve(value);
  }, 160);
}

function showAppConfirm(options = {}) {
  const {
    title = "Confirmar",
    message = "",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    tone = "primary",
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
        <h2 id="app-modal-title"></h2>
        <p></p>
        <div class="app-modal-actions">
          <button type="button" class="app-modal-btn cancel"></button>
          <button type="button" class="app-modal-btn ${tone}"></button>
        </div>
      </div>
    `;

    const titleEl = overlay.querySelector("h2");
    const messageEl = overlay.querySelector("p");
    const cancelBtn = overlay.querySelector(".app-modal-btn.cancel");
    const confirmBtn = overlay.querySelector(`.app-modal-btn.${tone}`);

    titleEl.textContent = title;
    messageEl.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    cancelBtn.addEventListener("click", () =>
      closeAppModal(overlay, false, resolve),
    );
    confirmBtn.addEventListener("click", () =>
      closeAppModal(overlay, true, resolve),
    );
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeAppModal(overlay, false, resolve);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAppModal(overlay, false, resolve);
      if (event.key === "Enter") closeAppModal(overlay, true, resolve);
    });

    getAppModalStack().appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    confirmBtn.focus();
  });
}

function showAppInput(options = {}) {
  const {
    title = "Ingresar dato",
    message = "",
    value = "",
    placeholder = "",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-input-title">
        <h2 id="app-input-title"></h2>
        <p></p>
        <input class="app-modal-input" type="text" autocomplete="off" spellcheck="false">
        <div class="app-modal-actions">
          <button type="button" class="app-modal-btn cancel"></button>
          <button type="button" class="app-modal-btn primary"></button>
        </div>
      </div>
    `;

    const titleEl = overlay.querySelector("h2");
    const messageEl = overlay.querySelector("p");
    const input = overlay.querySelector(".app-modal-input");
    const cancelBtn = overlay.querySelector(".app-modal-btn.cancel");
    const confirmBtn = overlay.querySelector(".app-modal-btn.primary");

    titleEl.textContent = title;
    messageEl.textContent = message;
    input.value = value;
    input.placeholder = placeholder;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    cancelBtn.addEventListener("click", () =>
      closeAppModal(overlay, null, resolve),
    );
    confirmBtn.addEventListener("click", () =>
      closeAppModal(overlay, input.value, resolve),
    );
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeAppModal(overlay, null, resolve);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAppModal(overlay, null, resolve);
      if (event.key === "Enter") closeAppModal(overlay, input.value, resolve);
    });

    getAppModalStack().appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    input.focus();
    input.select();
  });
}

function showAppToast(message, type = "info") {
  const stack = getAppToastStack();
  const toast = document.createElement("div");
  toast.className = `app-toast ${type}`;
  toast.textContent = message;

  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));

  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 180);
  }, 2800);
}

function downloadPdfBlob(pdfBlob, fileName) {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCurrentUserWhatsappNumber() {
  const usuario = getStoredUsuario();
  const rawPhone = usuario?.telefono || localStorage.getItem("telefono") || "";
  let phone = String(rawPhone).replace(/\D/g, "");

  if (!phone) return "";

  if (!phone.startsWith("54")) {
    phone = "54" + phone;
  }

  return phone;
}

function showPdfReadyModal({ pdfBlob, fileName }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";
    overlay.innerHTML = `
      <div class="app-modal app-pdf-modal" role="dialog" aria-modal="true" aria-labelledby="app-pdf-modal-title">
        <h2 id="app-pdf-modal-title">PDF generado</h2>
        <p>Descargá el archivo y adjuntalo manualmente en tu WhatsApp.</p>
        <div class="app-modal-actions app-pdf-modal-actions">
          <button type="button" class="app-modal-btn primary" data-action="download">Descargar PDF</button>
          <button type="button" class="app-modal-btn success" data-action="whatsapp">Enviar a mi WhatsApp</button>
          <button type="button" class="app-modal-btn cancel" data-action="close">Cerrar</button>
        </div>
      </div>
    `;

    const closeModal = () => closeAppModal(overlay, true, resolve);
    const download = () => {
      downloadPdfBlob(pdfBlob, fileName);
      showAppToast("PDF descargado.", "success");
    };

    overlay
      .querySelector('[data-action="download"]')
      .addEventListener("click", () => {
        download();
      });

    overlay
      .querySelector('[data-action="whatsapp"]')
      .addEventListener("click", () => {
        const phone = getCurrentUserWhatsappNumber();
        if (!phone) {
          showAppToast("No se encontró tu teléfono.", "warning");
          return;
        }

        downloadPdfBlob(pdfBlob, fileName);
        const message = encodeURIComponent(
          "Me envío mi rutina en PDF. Adjunto el archivo descargado.",
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener");
        showAppToast("Adjuntá manualmente el PDF descargado.", "info");
      });

    overlay
      .querySelector('[data-action="close"]')
      .addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal();
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });

    getAppModalStack().appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    overlay.querySelector('[data-action="download"]').focus();
  });
}

function showAuthPanel(panel) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) loginForm.style.display = panel === "login" ? "block" : "none";
  if (registerForm)
    registerForm.style.display = panel === "register" ? "block" : "none";
  showAuthMessage("");
}

function getAuthSuccess(data) {
  return (
    data?.ok === true ||
    data?.success === true ||
    data?.login === true ||
    data?.registered === true
  );
}

function getAuthUser(data) {
  return data?.usuario || data?.user || data?.data || data;
}

function normalizeAuthValue(value) {
  return (value || "").toString().trim().toUpperCase();
}

function getFriendlyAuthMessage(message, fallback) {
  const code = normalizeAuthValue(message);

  const messages = {
    SIN_FECHA_VENCIMIENTO:
      "Tu cuenta todavía no tiene una fecha de acceso asignada.",
    PAGO_PENDIENTE: "Tu pago está pendiente. Consultá con el administrador.",
    CUENTA_PENDIENTE:
      "Tu cuenta está pendiente de aprobación por el administrador.",
    PENDIENTE: "Tu cuenta está pendiente de aprobación por el administrador.",
    BLOQUEADO: "Tu cuenta está bloqueada. Consultá con el administrador.",
    VENCIDO: "Tu acceso está vencido. Consultá con el administrador.",
  };

  if (messages[code]) return messages[code];

  if (/^[A-Z0-9_]+$/.test(code) && code.includes("_")) {
    return fallback;
  }

  return message || fallback;
}

function getStoredUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch (_) {
    return {};
  }
}

function getUsuarioField(usuario, keys) {
  for (const key of keys) {
    if (
      usuario &&
      usuario[key] !== undefined &&
      usuario[key] !== null &&
      usuario[key] !== ""
    ) {
      return usuario[key];
    }
  }

  return "";
}

function parseFechaUsuario(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = String(value).trim();

  let match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const hour = Number(match[4] || 23);
    const minute = Number(match[5] || 59);
    const second = Number(match[6] || 59);

    return new Date(year, month, day, hour, minute, second);
  }

  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    return new Date(year, month, day, 23, 59, 59);
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function calcularDiasRestantes(fecha) {
  if (!fecha || isNaN(fecha.getTime())) return null;

  const DAY_MS = 1000 * 60 * 60 * 24;
  const diffMs = fecha - new Date();

  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / DAY_MS);
}

function getRemainingMembershipTime(fecha) {
  if (!fecha || isNaN(fecha.getTime())) {
    return { expired: false, label: "Activo", days: null, hours: null };
  }

  const diffMs = fecha.getTime() - Date.now();
  if (diffMs <= 0) {
    return { expired: true, label: "Renovar", days: 0, hours: 0 };
  }

  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return { expired: false, label: `${hours} h`, days: 0, hours };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return {
    expired: false,
    label: days === 1 ? "1 día" : `${days} días`,
    days,
    hours,
  };
}

function setMembershipChip(topText, bottomText, stateClass, title) {
  const chip = document.getElementById("btn-plan");
  if (!chip) return;

  const classes = [
    "pro-ok",
    "pro-warning",
    "pro-orange",
    "pro-danger",
    "pro-expired",
    "trial",
    "pending",
    "blocked",
    "neutral",
  ];

  chip.classList.add("membership-chip");
  chip.classList.remove(...classes);
  chip.classList.add(stateClass || "neutral");
  chip.innerHTML = `
    <span class="membership-chip-main">${escapeHtml(topText)}</span>
    <span class="membership-chip-sub">${escapeHtml(bottomText)}</span>
  `;
  chip.title = title || `${topText} ${bottomText}`;
  chip.setAttribute("aria-label", chip.title);
}

function updateMembershipChip(usuarioOverride = null) {
  const usuario = usuarioOverride || getStoredUsuario();

  if (!usuario || Object.keys(usuario).length === 0) {
    setMembershipChip("ACTIVAR", "PRO", "neutral", "Activar Plan PRO");
    return;
  }

  const estado = normalizeAuthValue(getUsuarioField(usuario, ["Estado", "estado"]));
  const pago = normalizeAuthValue(getUsuarioField(usuario, ["Pago", "pago"]));
  const fechaVencimientoRaw = getUsuarioField(usuario, [
    "FechaVencimiento",
    "fechaVencimiento",
    "fecha_vencimiento",
    "expira",
  ]);
  const fechaVencimiento = parseFechaUsuario(fechaVencimientoRaw);
  const remaining = getRemainingMembershipTime(fechaVencimiento);
  const pagoSi = pago === "SI" || pago === "SÍ";

  if (estado === "BLOQUEADO" || estado.includes("BLOQUEADO")) {
    setMembershipChip("BLOQUEADO", "Cuenta", "blocked", "Cuenta bloqueada");
    return;
  }

  if (estado === "PENDIENTE" || estado.includes("PENDIENTE") || pago === "PENDIENTE" || pago.includes("PENDIENTE")) {
    setMembershipChip("PENDIENTE", "Cuenta", "pending", "Cuenta pendiente");
    return;
  }

  if (estado === "PRUEBA") {
    if (remaining.expired) {
      setMembershipChip("PRUEBA", "Vencida", "pro-expired", "Prueba vencida");
      return;
    }

    setMembershipChip("PRUEBA", remaining.label, "trial", "Periodo de prueba");
    return;
  }

  if (estado === "VENCIDO" || estado.includes("VENCIDO") || (estado === "ACTIVO" && pagoSi && remaining.expired)) {
    setMembershipChip("VENCIDO", "Renovar", "pro-expired", "Renovar Plan PRO");
    return;
  }

  if (estado === "ACTIVO" && pagoSi) {
    if (remaining.days !== null && remaining.days <= 5) {
      let tone = "pro-warning";
      if (remaining.hours < 24 || remaining.days <= 2) {
        tone = "pro-danger";
      } else if (remaining.days <= 4) {
        tone = "pro-orange";
      }

      setMembershipChip("RENOVAR", remaining.label, tone, "Renovar Plan PRO");
      return;
    }

    setMembershipChip("PRO", remaining.label, "pro-ok", "Plan PRO activo");
    return;
  }

  setMembershipChip("ACTIVAR", "PRO", "neutral", "Activar Plan PRO");
}

function actualizarDiasHeaderDesdeUsuario() {
  const usuario = getStoredUsuario();
  updateMembershipChip(usuario);
  if (!usuario || Object.keys(usuario).length === 0) return false;

  const el = document.getElementById("dias-restantes");
  if (!el) return true;

  const estado = normalizeAuthValue(
    getUsuarioField(usuario, ["Estado", "estado"]),
  );
  const pago = normalizeAuthValue(getUsuarioField(usuario, ["Pago", "pago"]));
  const fechaVencimientoRaw = getUsuarioField(usuario, [
    "FechaVencimiento",
    "fechaVencimiento",
    "fecha_vencimiento",
    "expira",
  ]);

  function setDiasText(texto, color) {
    el.innerText = texto;
    el.style.color = color;
    el.style.fontWeight = "700";
    el.style.lineHeight = "1.15";
  }

  if (estado === "BLOQUEADO") {
    setDiasText("Acceso bloqueado", "#d11");
    return true;
  }

  if (estado === "VENCIDO") {
    setDiasText("Acceso vencido", "#d11");
    return true;
  }

  if (estado === "PENDIENTE") {
    setDiasText("Pendiente de aprobación", "#d11");
    return true;
  }

  const fechaVencimiento = parseFechaUsuario(fechaVencimientoRaw);

  if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) {
    if (estado === "PRUEBA") {
      setDiasText("Prueba sin fecha", "#d11");
      return true;
    }

    if (estado === "ACTIVO" && pago === "SI") {
      setDiasText("", "#444");
      return true;
    }

    return false;
  }

  const ahora = new Date();
  const msRestantes = fechaVencimiento.getTime() - ahora.getTime();
  const horasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60));
  const diasRestantes = Math.max(1, Math.round(horasRestantes / 24));

  if (msRestantes <= 0) {
    if (estado === "PRUEBA") {
      setDiasText("Prueba vencida", "#d11");
      return true;
    }

    if (estado === "ACTIVO" && pago === "SI") {
      setDiasText("Acceso vencido", "#d11");
      return true;
    }
  }

  if (estado === "PRUEBA") {
    if (horasRestantes < 24) {
      setDiasText(`Faltan ${horasRestantes} h de prueba`, "#444");
      return true;
    }

    setDiasText(
      diasRestantes === 1
        ? "Falta 1 día de prueba"
        : `Faltan ${diasRestantes} días de prueba`,
      "#444",
    );
    return true;
  }

  if (estado === "ACTIVO" && pago === "SI") {
    if (horasRestantes < 24) {
      setDiasText(`Quedan ${horasRestantes} h`, "#0a8f4b");
      return true;
    }

    setDiasText(
      diasRestantes === 1 ? "Queda 1 día" : `Quedan ${diasRestantes} días`,
      "#0a8f4b",
    );
    return true;
  }

  return false;
}

function actualizarHeaderDesdeUsuarioReal() {
  return actualizarDiasHeaderDesdeUsuario();
}

function getPlanMessageElement() {
  const modal = document.getElementById("plan-modal");
  if (!modal) return null;

  let message = document.getElementById("plan-message");
  if (message) return message;

  message = document.createElement("p");
  message.id = "plan-message";
  message.style.marginTop = "12px";
  message.style.fontSize = "14px";
  message.style.fontWeight = "600";
  message.style.lineHeight = "1.35";

  const btnTransferido = document.getElementById("btn-transferido");
  if (btnTransferido && btnTransferido.parentNode) {
    btnTransferido.parentNode.insertBefore(message, btnTransferido.nextSibling);
  } else {
    modal.appendChild(message);
  }

  return message;
}

function showPlanMessage(text, type = "info") {
  const message = getPlanMessageElement();
  if (!message) return;

  message.textContent = text || "";
  message.style.color = type === "error" ? "#d11" : "#0a8f4b";
}

function normalizeAdminWhatsappNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("54")) return digits;
  return "54" + digits;
}

async function openAdminWhatsappForReceipt() {
  const data = await appsScriptRequest("obtenerTelefonoAdmin", {});

  if (data?.ok !== true) {
    showPlanMessage("No hay teléfono de administrador configurado.", "error");
    return false;
  }

  const telefonoAdmin = normalizeAdminWhatsappNumber(data.telefonoAdmin);

  if (!telefonoAdmin) {
    showPlanMessage("No hay teléfono de administrador configurado.", "error");
    return false;
  }

  const mensaje =
    "Hola, ya transferí el Plan PRO de Rutina Gym. Te adjunto el comprobante.";
  const url =
    "https://wa.me/" + telefonoAdmin + "?text=" + encodeURIComponent(mensaje);
  window.open(url, "_blank", "noopener");
  return true;
}

function getContactUserLabel(usuario) {
  const alias =
    usuario?.AliasCliente ||
    usuario?.aliasCliente ||
    usuario?.alias ||
    "";
  if (alias) return String(alias).trim();

  const nombre = usuario?.nombre || usuario?.Nombre || "";
  const apellido = usuario?.apellido || usuario?.Apellido || "";
  const nombreCompleto = `${nombre} ${apellido}`.trim();

  return nombreCompleto || "sin identificar";
}

async function contactAdminWhatsapp() {
  try {
    const data = await appsScriptRequest("obtenerTelefonoAdmin", {});
    const telefonoAdmin = normalizeAdminWhatsappNumber(data?.telefonoAdmin);

    if (data?.ok !== true || !telefonoAdmin) {
      showAppToast("No se encontró el teléfono del administrador.", "warning");
      return;
    }

    const usuario = getStoredUsuario();
    const userLabel = getContactUserLabel(usuario);
    const userPhone =
      usuario?.telefono || localStorage.getItem("telefono") || "sin identificar";
    const mensaje =
      "Hola Admin, me contacto con vos porque tengo el siguiente problema:\n\n" +
      `Mi usuario es: ${userLabel}\n` +
      `Mi teléfono es: ${userPhone || "sin identificar"}`;
    const url =
      "https://wa.me/" + telefonoAdmin + "?text=" + encodeURIComponent(mensaje);

    window.open(url, "_blank", "noopener");
  } catch (error) {
    console.error("Error obteniendo teléfono del administrador", error);
    showAppToast("No se encontró el teléfono del administrador.", "warning");
  }
}

function getLoginBlockMessage(user, data) {
  const apiMessage = data?.motivo || data?.message || data?.error;
  const estado = normalizeAuthValue(user?.estado || data?.estado);
  const rol = normalizeAuthValue(user?.rol || data?.rol);
  const pago = normalizeAuthValue(user?.pago || data?.pago);
  const acceso =
    data?.acceso === true ||
    data?.acceso === "true" ||
    user?.acceso === true ||
    user?.acceso === "true";

  if (estado === "BLOQUEADO") {
    return getFriendlyAuthMessage(
      apiMessage,
      "Tu cuenta está bloqueada. Consultá con el administrador.",
    );
  }

  if (estado === "VENCIDO") {
    return getFriendlyAuthMessage(
      apiMessage,
      "Tu acceso está vencido. Consultá con el administrador.",
    );
  }

  if (rol === "ADMIN") return "";

  if (estado === "PENDIENTE") {
    return "Tu cuenta está pendiente de aprobación por el administrador.";
  }

  if (data?.acceso === false || data?.acceso === "false") {
    return getFriendlyAuthMessage(
      apiMessage,
      "Tu acceso no está habilitado. Consultá con tu entrenador.",
    );
  }

  if (user?.acceso === false || user?.acceso === "false") {
    return getFriendlyAuthMessage(
      apiMessage,
      "Tu acceso no está habilitado. Consultá con tu entrenador.",
    );
  }

  if (estado === "PRUEBA") {
    return acceso
      ? ""
      : getFriendlyAuthMessage(
          apiMessage,
          "Tu prueba no está habilitada o está vencida.",
        );
  }

  if (estado === "ACTIVO") {
    return pago === "SI"
      ? ""
      : getFriendlyAuthMessage(
          apiMessage,
          "Tu pago está pendiente. Consultá con el administrador.",
        );
  }

  if (estado !== "ACTIVO") {
    return getFriendlyAuthMessage(
      apiMessage,
      "Tu cuenta está pendiente de aprobación por el administrador.",
    );
  }

  return "";
}

function enterAppAfterLogin(user) {
  localStorage.removeItem("licencia_exp");
  localStorage.removeItem("plan");
  localStorage.removeItem("gym_tester_start_v1");
  localStorage.removeItem("session_token");

  localStorage.setItem("usuario", JSON.stringify(user));

  if (user?.telefono) localStorage.setItem("telefono", user.telefono);
  if (user?.session_token)
    localStorage.setItem("session_token", user.session_token);
  if (user?.token) localStorage.setItem("session_token", user.token);

  const loginScreen = document.getElementById("login-screen");
  const appContainer = document.getElementById("app-container");

  if (loginScreen) loginScreen.style.display = "none";
  if (appContainer) appContainer.style.display = "block";

  actualizarDiasHeaderDesdeUsuario();
  updateMembershipChip(user);
  init();
}

async function handleAppsScriptLogin() {
  const telefono = document.getElementById("login-phone")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!telefono || !password) {
    showAuthMessage("Ingresá teléfono y password.", true);
    return;
  }

  try {
    showAuthMessage("Ingresando...");
    const data = await appsScriptRequest("login", { telefono, password });
    const user = getAuthUser(data);
    if (user && !user.telefono) user.telefono = telefono;

    if (!getAuthSuccess(data)) {
      showAuthMessage(
        data?.error || data?.message || "No se pudo iniciar sesión.",
        true,
      );
      return;
    }

    const blockMessage = getLoginBlockMessage(user, data);
    if (blockMessage) {
      showAuthMessage(blockMessage, true);
      return;
    }

    enterAppAfterLogin(user);
  } catch (err) {
    console.error("[APPS SCRIPT] login error", err);
    showAuthMessage(err.message || "Error de conexión.", true);
  }
}

async function handleAppsScriptRegister() {
  const nombre = document.getElementById("register-name")?.value.trim();
  const apellido = document.getElementById("register-lastname")?.value.trim();
  const mail = document.getElementById("register-mail")?.value.trim();
  const telefono = document.getElementById("register-phone")?.value.trim();
  const password = document.getElementById("register-password")?.value;
  const confirmarPassword = document.getElementById(
    "register-password-confirm",
  )?.value;

  if (
    !nombre ||
    !apellido ||
    !mail ||
    !telefono ||
    !password ||
    !confirmarPassword
  ) {
    showAuthMessage("Completá todos los campos.", true);
    return;
  }

  if (password !== confirmarPassword) {
    showAuthMessage("Las contraseñas no coinciden.", true);
    return;
  }

  try {
    showAuthMessage("Registrando...");
    const data = await appsScriptRequest("register", {
      nombre,
      apellido,
      mail,
      telefono,
      password,
    });

    if (!getAuthSuccess(data)) {
      showAuthMessage(
        data?.error || data?.message || "No se pudo registrar.",
        true,
      );
      return;
    }

    const registerPassword = document.getElementById("register-password");
    const registerPasswordConfirm = document.getElementById(
      "register-password-confirm",
    );

    if (registerPassword) registerPassword.value = "";
    if (registerPasswordConfirm) registerPasswordConfirm.value = "";

    showAuthPanel("login");
    const loginPhone = document.getElementById("login-phone");
    if (loginPhone) loginPhone.value = telefono;
    showAuthMessage(
      "Registro recibido. Tu cuenta queda pendiente de aprobación por el administrador.",
    );
  } catch (err) {
    console.error("[APPS SCRIPT] register error", err);
    showAuthMessage(err.message || "Error de conexión.", true);
  }
}

function setupAppsScriptAuth() {
  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnShowRegister = document.getElementById("btn-show-register");
  const btnShowLogin = document.getElementById("btn-show-login");

  if (btnLogin) btnLogin.onclick = handleAppsScriptLogin;
  if (btnRegister) btnRegister.onclick = handleAppsScriptRegister;
  if (btnShowRegister)
    btnShowRegister.onclick = () => showAuthPanel("register");
  if (btnShowLogin) btnShowLogin.onclick = () => showAuthPanel("login");
}

document.addEventListener("DOMContentLoaded", () => {
  setupAppsScriptAuth();
});
// --- CONFIGURATION ---
const APP_VERSION = "1.0.0";
const DEFAULT_DAYS = 4;
const DEFAULT_EX_PER_DAY = 6;
const SAVE_DEBOUNCE_MS = 500;

// --- EXERCISE CATALOG ---
const BASE_CATALOG = {
  PECHO: [
    "Press banca plano",
    "Aperturas con mancuernas",
    "Fondos en paralelas",
    "Pullover",
  ],
  ESPALDA: [
    "Dominadas",
    "Remo con barra",
    "Jalón al pecho",
    "Remo con mancuerna",
  ],
  HOMBROS: [
    "Press militar",
    "Elevaciones laterales",
    "Pájaros (posterior)",
    "Frontal mancuerna",
  ],
  PIERNAS: [
    "Sentadilla",
    "Prensa",
    "Peso muerto rumano",
    "Extensión cuádriceps",
  ],
  BÍCEPS: [
    "Curl con barra",
    "Curl alternado",
    "Curl martillo",
    "Curl concentrado",
  ],
  TRÍCEPS: [
    "Press francés",
    "Extensión polea",
    "Fondos banco",
    "Patada tríceps",
  ],
  GLÚTEOS: ["Hip thrust", "Patada polea", "Sentadilla sumo", "Puente glúteo"],
  ABDOMEN: ["Crunch", "Plancha", "Elevación piernas", "Rueda abdominal"],
};

const USER_CATALOG_KEY = "gym_custom_catalog_v1";

function loadUserCatalog() {
  const data = localStorage.getItem(USER_CATALOG_KEY);

  if (!data) return {};

  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveUserCatalog(catalog) {
  localStorage.setItem(USER_CATALOG_KEY, JSON.stringify(catalog));
}

function getFinalCatalog() {
  const userCatalog = loadUserCatalog();

  const finalCatalog = JSON.parse(JSON.stringify(BASE_CATALOG));

  Object.keys(userCatalog).forEach((section) => {
    if (!finalCatalog[section]) {
      finalCatalog[section] = [];
    }

    userCatalog[section].forEach((ex) => {
      if (!finalCatalog[section].includes(ex)) {
        finalCatalog[section].push(ex);
      }
    });
  });

  return finalCatalog;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getExerciseGroup(exerciseName) {
  const catalog = getFinalCatalog();

  for (const [grupo, items] of Object.entries(catalog)) {
    if (items.includes(exerciseName)) {
      return grupo;
    }
  }

  return "";
}

function createUserCatalogSection(sectionName) {
  const section = (sectionName || "").trim().toUpperCase();
  if (!section) return null;

  const finalCatalog = getFinalCatalog();
  if (finalCatalog[section]) {
    showAppToast("Esa sección ya existe.", "warning");
    return null;
  }

  const userCatalog = loadUserCatalog();
  userCatalog[section] = [];
  saveUserCatalog(userCatalog);
  showAppToast("Sección agregada", "success");
  return section;
}

function setExerciseName(dayId, index, exerciseName) {
  const exercise =
    state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios[index];
  exercise.nombre = exerciseName;
  exercise.grupo = getExerciseGroup(exerciseName);
  debouncedSave();
}

function openExercisePicker(options = {}) {
  const {
    currentValue = "",
    onSelect,
    allowedNames = null,
    includeClear = false,
    clearText = "Sin filtro",
    showCreateActions = false,
  } = options;

  const overlay = document.createElement("div");
  overlay.className = "exercise-picker-overlay";
  overlay.innerHTML = `
    <div class="exercise-picker-panel" role="dialog" aria-modal="true" aria-labelledby="exercise-picker-title">
      <div class="exercise-picker-header">
        <h2 id="exercise-picker-title">Elegir ejercicio</h2>
        <button type="button" class="exercise-picker-close" aria-label="Cerrar">Cerrar</button>
      </div>
      <input class="exercise-picker-search" type="search" placeholder="Buscar ejercicio..." autocomplete="off">
      <div class="exercise-picker-actions"></div>
      <div class="exercise-picker-list"></div>
    </div>
  `;

  const searchInput = overlay.querySelector(".exercise-picker-search");
  const actionsEl = overlay.querySelector(".exercise-picker-actions");
  const listEl = overlay.querySelector(".exercise-picker-list");
  const allowedSet = Array.isArray(allowedNames) ? new Set(allowedNames) : null;

  const closePicker = (afterClose) => {
    overlay.classList.remove("is-visible");
    setTimeout(() => {
      overlay.remove();
      if (typeof afterClose === "function") {
        afterClose();
      }
    }, 160);
  };

  const selectExercise = (name) => {
    if (typeof onSelect === "function") {
      onSelect(name);
    }
    closePicker();
  };

  const renderList = () => {
    const query = searchInput.value.trim().toLowerCase();
    const catalog = getFinalCatalog();
    let html = "";
    let total = 0;

    if (includeClear && (!query || clearText.toLowerCase().includes(query))) {
      html += `
        <button type="button" class="exercise-picker-option ${!currentValue ? "active" : ""}" data-name="">
          ${escapeHtml(clearText)}
        </button>
      `;
      total++;
    }

    Object.entries(catalog).forEach(([grupo, items]) => {
      const groupMatches = grupo.toLowerCase().includes(query);
      const sectionItems = Array.isArray(items) ? items : [];
      const filteredItems = sectionItems.filter((item) => {
        if (allowedSet && !allowedSet.has(item)) return false;
        const itemMatches = item.toLowerCase().includes(query);
        return !query || groupMatches || itemMatches;
      });
      const showEmptyGroup =
        sectionItems.length === 0 && !allowedSet && (!query || groupMatches);

      if (filteredItems.length === 0 && !showEmptyGroup) return;

      total += filteredItems.length || 1;
      html += `
        <div class="exercise-picker-group">
          <div class="exercise-picker-group-title">${escapeHtml(grupo)}</div>
          ${
            showEmptyGroup
              ? `<div class="exercise-picker-empty-inline">Sin ejercicios todavía</div>`
              : filteredItems
                  .map(
                    (item) => `
            <button type="button" class="exercise-picker-option ${item === currentValue ? "active" : ""}" data-name="${escapeHtml(item)}">
              ${escapeHtml(item)}
            </button>
          `,
                  )
                  .join("")
          }
        </div>
      `;
    });

    listEl.innerHTML =
      total > 0
        ? html
        : `<div class="exercise-picker-empty">No se encontraron ejercicios.</div>`;
  };

  if (showCreateActions) {
    actionsEl.innerHTML = `
      <button type="button" class="exercise-picker-action" data-action="section">+ Crear sección</button>
      <button type="button" class="exercise-picker-action" data-action="exercise">+ Crear ejercicio</button>
    `;

    actionsEl
      .querySelector('[data-action="section"]')
      .addEventListener("click", async () => {
        closePicker(async () => {
          const ok = await addNewSectionFlow();
          openExercisePicker({
            ...options,
            currentValue,
          });
        });
      });

    actionsEl
      .querySelector('[data-action="exercise"]')
      .addEventListener("click", async () => {
        closePicker(async () => {
          const created = await addNewExerciseFlow();
          openExercisePicker({
            ...options,
            currentValue,
          });
        });
      });
  }

  overlay
    .querySelector(".exercise-picker-close")
    .addEventListener("click", closePicker);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePicker();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePicker();
  });
  listEl.addEventListener("click", (event) => {
    const option = event.target.closest(".exercise-picker-option");
    if (!option) return;
    selectExercise(option.dataset.name || "");
  });
  searchInput.addEventListener("input", renderList);

  document.body.appendChild(overlay);
  renderList();
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  searchInput.focus();
}

function openSectionPicker(options = {}) {
  const { currentValue = "", onSelect, onCancel, allowCreate = false } = options;

  const overlay = document.createElement("div");
  overlay.className = "exercise-picker-overlay section-picker-overlay";
  overlay.innerHTML = `
    <div class="exercise-picker-panel section-picker-panel" role="dialog" aria-modal="true" aria-labelledby="section-picker-title">
      <div class="exercise-picker-header">
        <h2 id="section-picker-title">Elegir sección</h2>
        <button type="button" class="exercise-picker-close" aria-label="Cerrar">Cerrar</button>
      </div>
      <input class="exercise-picker-search" type="search" placeholder="Buscar sección..." autocomplete="off">
      <div class="exercise-picker-actions"></div>
      <div class="exercise-picker-list"></div>
    </div>
  `;

  const searchInput = overlay.querySelector(".exercise-picker-search");
  const actionsEl = overlay.querySelector(".exercise-picker-actions");
  const listEl = overlay.querySelector(".exercise-picker-list");

  const closePicker = (afterClose) => {
    overlay.classList.remove("is-visible");
    setTimeout(() => {
      overlay.remove();
      if (typeof afterClose === "function") {
        afterClose();
      }
    }, 160);
  };

  const selectSection = (section) => {
    if (typeof onSelect === "function") {
      onSelect(section);
    }
    closePicker();
  };

  const cancelPicker = () => {
    if (typeof onCancel === "function") {
      onCancel();
    }
    closePicker();
  };

  const renderList = () => {
    const query = searchInput.value.trim().toLowerCase();
    const sections = Object.keys(getFinalCatalog()).filter((section) => {
      return !query || section.toLowerCase().includes(query);
    });

    listEl.innerHTML =
      sections.length > 0
        ? sections
            .map(
              (section) => `
          <button type="button" class="exercise-picker-option section-picker-option ${section === currentValue ? "active" : ""}" data-section="${escapeHtml(section)}">
            ${escapeHtml(section)}
          </button>
        `,
            )
            .join("")
        : `<div class="exercise-picker-empty">No se encontraron secciones.</div>`;
  };

  if (allowCreate) {
    actionsEl.innerHTML = `
      <button type="button" class="exercise-picker-action" data-action="section">+ Crear sección</button>
    `;

    actionsEl
      .querySelector('[data-action="section"]')
      .addEventListener("click", () => {
        closePicker(async () => {
          const sectionName = await showAppInput({
            title: "Crear sección",
            message: "Ingresá el nombre de la sección nueva.",
            placeholder: "Ej: PANTORRILLAS",
            confirmText: "Crear",
            cancelText: "Cancelar",
          });

          if (!sectionName) {
            openSectionPicker(options);
            return;
          }

          const createdSection = createUserCatalogSection(sectionName);
          if (createdSection) {
            if (typeof onSelect === "function") {
              onSelect(createdSection);
            }
            return;
          }

          openSectionPicker(options);
        });
      });
  }

  overlay
    .querySelector(".exercise-picker-close")
    .addEventListener("click", cancelPicker);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cancelPicker();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cancelPicker();
  });
  listEl.addEventListener("click", (event) => {
    const option = event.target.closest(".section-picker-option");
    if (!option) return;
    selectSection(option.dataset.section || "");
  });
  searchInput.addEventListener("input", renderList);

  document.body.appendChild(overlay);
  renderList();
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  searchInput.focus();
}

// Sistema de licencias antiguo eliminado

// --- STATE ---
let state = {
  currentWeek: 1,
  openDay: 1,
  rutina: {
    meta: { version: APP_VERSION, updatedAt: null },
    semanas: {},
  },
};

let saveTimeout = null;

// --- INITIALIZATION ---
function init() {
  loadFromStorage();

  if (
    !state.rutina ||
    !state.rutina.semanas ||
    Object.keys(state.rutina.semanas).length === 0
  ) {
    seedInitialData();
  }

  renderTabs();
  renderApp();
  setupEventListeners();

  document.body.addEventListener("click", (e) => {
    if (
      e.target &&
      e.target.tagName === "BUTTON" &&
      typeof hapticTap === "function"
    ) {
      hapticTap();
    }
  });

  // updateDiasRestantes(); // COMENTADO PARA NO ROMPER TEXTO DEL HEADER

  // ---> INICIO DE LÍNEA A AGREGAR <---
  initWeightModule();
  initProgressModule();
  initMainMenu();
  // ---> FIN DE LÍNEA A AGREGAR <---
  verificarModoTester(); // LLAMADA AL MODO TESTER
}

// Sincronización manejada por startUserAccessSync()

function seedInitialData() {
  for (let w = 1; w <= 3; w++) {
    state.rutina.semanas[w] = { dias: {} };
    for (let d = 1; d <= DEFAULT_DAYS; d++) {
      state.rutina.semanas[w].dias[d] = { ejercicios: [] };
      for (let e = 0; e < DEFAULT_EX_PER_DAY; e++) {
        // Seed some examples for W1 D1
        if (w === 1 && d === 1 && e === 0) {
          state.rutina.semanas[w].dias[d].ejercicios.push(
            createExerciseObject("Press banca plano", "PECHO", 4, "5.5.6.6"),
          );
        } else if (w === 1 && d === 1 && e === 1) {
          state.rutina.semanas[w].dias[d].ejercicios.push(
            createExerciseObject("Remo con barra", "ESPALDA", 3, "8"),
          );
        } else {
          state.rutina.semanas[w].dias[d].ejercicios.push(
            createExerciseObject(),
          );
        }
      }
    }
  }
  saveToStorage(true);
}

function createExerciseObject(
  nombre = "",
  grupo = "",
  series = "",
  reps = "",
  peso = "",
) {
  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + Math.random().toString(36),
    nombre,
    grupo,
    series,
    reps,
    peso,
  };
}

function generateRoutineText() {
  let text = "🏋️ Rutina Gym\n\n";

  const semanas = state.rutina.semanas;

  Object.keys(semanas).forEach((w) => {
    text += "SEMANA " + w + "\n";

    const dias = semanas[w].dias;

    Object.keys(dias).forEach((d) => {
      text += "\nDía " + d + "\n";

      dias[d].ejercicios.forEach((ex) => {
        if (!ex.nombre) return;

        text += "• " + ex.nombre;

        if (ex.series) text += " | " + ex.series + " sets";

        if (ex.reps) text += " | " + ex.reps + " reps";

        if (ex.peso) text += " | " + ex.peso + " kg";

        text += "\n";
      });
    });

    text += "\n";
  });

  return text;
}

function shareRoutineWhatsApp() {
  const text = generateRoutineText();

  const url = "https://wa.me/?text=" + encodeURIComponent(text);

  window.open(url, "_blank");
}

// --- RENDERING ---
function renderTabs() {
  const tabsContainer = document.getElementById("week-tabs");

  tabsContainer.innerHTML = "";

  const semanas = Object.keys(state.rutina.semanas);

  semanas.forEach((w) => {
    const btn = document.createElement("button");

    // 1. Asignamos la clase y el estado activo original (fundamental para CSS)
    btn.className = `tab-btn ${state.currentWeek == w ? "active" : ""}`;

    // 2. Insertamos el HTML con el nombre y la cruz roja
    btn.innerHTML = `SEMANA ${w} <span class="delete-week" onclick="deleteWeek(${w}, event)" title="Eliminar semana">✖</span>`;

    // 3. Abrimos correctamente el evento click para cambiar de pestaña
    btn.onclick = () => {
      state.currentWeek = parseInt(w);

      renderTabs();

      renderApp();

      scrollActiveWeekIntoView();
    }; // Aquí cierra el onclick correctamente

    tabsContainer.appendChild(btn);
  });

  scrollActiveWeekIntoView();
}

function scrollActiveWeekIntoView() {
  const container = document.getElementById("week-tabs");

  const active = container.querySelector(".tab-btn.active");

  if (!active) return;

  active.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}

function renderApp() {
  const container = document.getElementById("days-accordion");

  const weekLabel = document.getElementById("current-week-label");

  const weekData = state.rutina.semanas[state.currentWeek];

  weekLabel.textContent = `Semana ${state.currentWeek}`;

  container.innerHTML = "";

  Object.keys(weekData.dias).forEach((dayId) => {
    const dia = weekData.dias[dayId];

    const dayCard = document.createElement("div");

    dayCard.className = "day-card";

    // guardar qué día es en el DOM
    dayCard.dataset.day = dayId;

    // no abrir siempre el día 1
    if (state.openDay == dayId) {
      dayCard.classList.add("open");
    }

    dayCard.innerHTML = `
            <div class="day-header">
                <h3>Día ${dayId}</h3>
                <div style="display:flex; align-items:center; gap:16px;">
                    <button class="delete-day" type="button" onclick="deleteDay(${dayId}, event)">✖</button>
                    <span class="arrow">▼</span>
                </div>
            </div>


            <div class="day-content" id="day-content-${dayId}">
            </div>

            <button class="btn-add-ex" onclick="addExerciseField(${dayId})">+ Agregar Ejercicio</button>
        `;

    const contentContainer = dayCard.querySelector(".day-content");

    dia.ejercicios.forEach((ex, idx) => {
      contentContainer.appendChild(createExerciseRow(dayId, idx, ex));
    });

    dayCard.querySelector(".day-header").onclick = () => {
      document.querySelectorAll(".day-card").forEach((c) => {
        if (c !== dayCard) c.classList.remove("open");
      });

      dayCard.classList.toggle("open");
      state.openDay = dayId;

      if (dayCard.classList.contains("open")) {
        dayCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    container.appendChild(dayCard);
  });
}

function createExerciseRow(dayId, index, exercise) {
  const row = document.createElement("div");

  row.className = "exercise-row";
  row.dataset.day = dayId; // identifica el día
  row.dataset.index = index; // identifica el ejercicio dentro del día

  const finalCatalog = getFinalCatalog();

  let optionsHtml = `
    <option value="">Seleccionar ejercicio...</option>
    <option value="__ADD_SECTION__">+ Crear sección...</option>
    <option value="__ADD_EXERCISE__">+ Crear ejercicio...</option>
`;

  for (const [grupo, items] of Object.entries(finalCatalog)) {
    optionsHtml += `<optgroup label="${grupo}">`;

    items.forEach((item) => {
      const selected = exercise.nombre === item ? "selected" : "";

      optionsHtml += `<option value="${item}" ${selected}>${item}</option>`;
    });

    optionsHtml += `</optgroup>`;
  }

  const exerciseLabel = exercise.nombre || "Seleccionar ejercicio...";
  const activeClass = exercise.nombre ? "has-value" : "";

  row.innerHTML = `

        <!-- ===================================================== -->
        <!-- BOTON ELIMINAR EJERCICIO                              -->
        <!-- Se posiciona arriba a la derecha con CSS              -->
        <!-- Llama a deleteExercise(dayId,index)                   -->
        <!-- ===================================================== -->

        <button class="delete-exercise"
                type="button"
                title="Eliminar ejercicio"
                onclick="deleteExercise(${dayId}, ${index}, this)">
            ✖
        </button>


        <!-- ===================================================== -->
        <!-- SELECTOR DE EJERCICIO                                 -->
        <!-- ===================================================== -->

        <div class="ex-title-container">
            <button class="ex-picker-button ${activeClass}"
                    type="button"
                    onclick="openRoutineExercisePicker(${dayId}, ${index})">
                ${escapeHtml(exerciseLabel)}
            </button>
        </div>


        <!-- ===================================================== -->
        <!-- INPUT SERIES                                          -->
        <!-- ===================================================== -->

        <div class="input-group sets">
            <label>Sets</label>
            <input type="number" value="${exercise.series}" placeholder="0" min="0" inputmode="numeric"
                   oninput="updateEx(${dayId}, ${index}, 'series', this)">
        </div>


        <!-- ===================================================== -->
        <!-- INPUT REPS                                            -->
        <!-- ===================================================== -->

        <div class="input-group reps">
            <label>Reps</label>
            <input type="text" value="${exercise.reps}" placeholder="8-10"
                   oninput="updateEx(${dayId}, ${index}, 'reps', this)">
        </div>


        <!-- ===================================================== -->
        <!-- INPUT PESO                                            -->
        <!-- ===================================================== -->

        <div class="input-group weight">
            <label>Peso</label>

            <div class="weight-wrapper">
                <input
                    type="text"
                    value="${exercise.peso}"
                    placeholder="60/70/75"
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck="false"
                    oninput="updateEx(${dayId}, ${index}, 'peso', this)"
                >
                <span class="unit-toggle">kg</span>
            </div>

            <div class="peso-max">
                ${calculateMaxWeight(exercise.peso)}
            </div>
        </div>
    `;

  return row;
}

window.handleExerciseSelect = async (dayId, index, selectEl) => {
  const val = selectEl.value;

  if (val === "__ADD_SECTION__") {
    const ok = await addNewSectionFlow();
    selectEl.value = ""; // vuelve a “Seleccionar…”
    if (ok) renderApp();
    return;
  }

  if (val === "__ADD_EXERCISE__") {
    const created = await addNewExerciseFlow();

    selectEl.value = ""; // vuelve a “Seleccionar…”

    if (created) {
      renderApp();
    }

    return;
  }

  // Selección normal
  updateEx(dayId, index, "nombre", selectEl);
};

window.openRoutineExercisePicker = (dayId, index) => {
  const exercise =
    state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios[index];

  openExercisePicker({
    currentValue: exercise?.nombre || "",
    showCreateActions: true,
    onSelect: (exerciseName) => {
      if (!exerciseName) return;
      setExerciseName(dayId, index, exerciseName);
      renderApp();
      showAppToast("Ejercicio actualizado", "success");
    },
  });
};

async function addNewSectionFlow() {
  let section = await showAppInput({
    title: "Crear sección",
    message: "Ingresá el nombre de la sección nueva.",
    placeholder: "Ej: PANTORRILLAS",
    confirmText: "Crear",
    cancelText: "Cancelar",
  });

  if (!section) return false;

  section = section.trim();

  if (!section) return false;

  return Boolean(createUserCatalogSection(section));
}

async function addNewExerciseFlow() {
  let exName = await showAppInput({
    title: "Crear ejercicio",
    message: "Ingresá el nombre del ejercicio.",
    placeholder: "Ej: Buen día con barra",
    confirmText: "Crear",
    cancelText: "Cancelar",
  });

  if (!exName) return false;

  exName = exName.trim();

  if (!exName) return false;

  const section = await new Promise((resolve) => {
    openSectionPicker({
      allowCreate: true,
      onSelect: (sectionName) => resolve(sectionName),
      onCancel: () => resolve(null),
    });
  });

  if (!section) return false;

  // Guardar en catálogo de usuario
  const userCatalog = loadUserCatalog();
  const finalCatalog = getFinalCatalog();

  // Evitar duplicados
  const alreadyExistsInFinal = (finalCatalog[section] || []).includes(exName);
  const alreadyExistsInUser = (userCatalog[section] || []).includes(exName);

  if (alreadyExistsInFinal || alreadyExistsInUser) {
    showAppToast("Ese ejercicio ya existe en esa sección.", "warning");
    return false;
  }

  if (!userCatalog[section]) {
    userCatalog[section] = [];
  }

  userCatalog[section].push(exName);

  saveUserCatalog(userCatalog);

  showAppToast("Ejercicio agregado", "success");

  return true;
}

// --- ACTIONS ---
window.updateEx = (dayId, idx, field, el) => {
  const value = el.value;
  const exercise =
    state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios[idx];

  if (field === "nombre") {
    exercise.nombre = value;
    const opt = el.options[el.selectedIndex];
    exercise.grupo = opt.parentElement.label || "";
  } else {
    if (field === "peso") {
      exercise[field] = value;

      const pesoMax = calculateMaxWeight(value);

      const container = el.closest(".input-group.weight");
      const maxLabel = container.querySelector(".peso-max");

      if (maxLabel) {
        maxLabel.textContent = pesoMax;
      }
    } else {
      exercise[field] = value;
    }
  }

  debouncedSave();
};

window.addExerciseField = (dayId) => {
  state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios.push(
    createExerciseObject(),
  );

  renderApp();

  debouncedSave();

  showAppToast("Ejercicio agregado", "success");

  setTimeout(() => {
    const content = document.getElementById(`day-content-${dayId}`);

    if (!content) return;

    const rows = content.querySelectorAll(".exercise-row");

    if (rows.length === 0) return;

    rows[rows.length - 1].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 50);
};

// --- DATA PERSISTENCE ---
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToStorage(true), SAVE_DEBOUNCE_MS);
}

function saveToStorage(showTime = false) {
  state.rutina.meta.updatedAt = new Date().toISOString();
  localStorage.setItem("gym_rutina_v1", JSON.stringify(state.rutina));

  if (showTime) {
    const now = new Date();
    const timeStr =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");
    document.getElementById("last-saved").textContent = `Guardado: ${timeStr}`;
  }
}

function loadFromStorage() {
  const data = localStorage.getItem("gym_rutina_v1");
  if (data) {
    try {
      state.rutina = JSON.parse(data);
    } catch (e) {
      console.error("Error loading data", e);
    }
  }
}

// --- UI HELPERS & EVENTS ---
function setupEventListeners() {
  document.getElementById("btn-share-wa").textContent =
    "Generar PDF / WhatsApp";
  document.getElementById("btn-share-wa").onclick = () => {
    generarPDFRutina();
  };

  document.getElementById("btn-reset-week").onclick = async () => {
    const ok = await showAppConfirm({
      title: "Reiniciar semana",
      message: "Se borrarán los datos cargados de esta semana.",
      confirmText: "Reiniciar",
      cancelText: "Cancelar",
      tone: "warning",
    });
    if (!ok) return;
    const dias = state.rutina.semanas[state.currentWeek].dias;
    Object.keys(dias).forEach((dia) => {
      dias[dia].ejercicios.forEach((ex) => {
        ex.series = "";
        ex.reps = "";
        ex.peso = "";
      });
    });
    renderApp();
    saveToStorage(true);
    showAppToast("Semana reiniciada", "warning");
  };

  document.getElementById("btn-duplicate-week").onclick = () => {
    const semanaActual = state.currentWeek;
    const siguienteSemana = semanaActual + 1;

    if (!state.rutina.semanas[siguienteSemana]) {
      state.rutina.semanas[siguienteSemana] = { dias: {} };
    }

    const diasActuales = state.rutina.semanas[semanaActual].dias;

    const nuevosDias = {};

    Object.keys(diasActuales).forEach((dia) => {
      nuevosDias[dia] = {
        ejercicios: diasActuales[dia].ejercicios.map((ex) => {
          return {
            id: crypto.randomUUID(),
            nombre: ex.nombre,
            grupo: ex.grupo,
            series: ex.series,
            reps: ex.reps,
            peso: "",
          };
        }),
      };
    });

    state.rutina.semanas[siguienteSemana].dias = nuevosDias;

    showAppToast("Rutina duplicada a Semana " + siguienteSemana, "success");

    renderTabs();
    saveToStorage(true);
  };

  document.getElementById("btn-add-day").onclick = () => {
    const dias = state.rutina.semanas[state.currentWeek].dias;

    const nuevoDia = Object.keys(dias).length + 1;

    dias[nuevoDia] = {
      ejercicios: Array(DEFAULT_EX_PER_DAY)
        .fill(0)
        .map(() => createExerciseObject()),
    };

    renderApp();
    saveToStorage(true);
    showAppToast("Día agregado", "success");
  };

  /* ----------- NUEVO BLOQUE: AGREGAR SEMANA ----------- */

  document.getElementById("btn-add-week").onclick = () => {
    const semanas = state.rutina.semanas;

    const nuevaSemana = Object.keys(semanas).length + 1;

    const diasBase = state.rutina.semanas[state.currentWeek].dias;

    const nuevosDias = {};

    Object.keys(diasBase).forEach((dia) => {
      nuevosDias[dia] = {
        ejercicios: diasBase[dia].ejercicios.map(() => createExerciseObject()),
      };
    });

    semanas[nuevaSemana] = { dias: nuevosDias };

    state.currentWeek = nuevaSemana;

    renderTabs();
    renderApp();
    saveToStorage(true);
    showAppToast("Semana agregada", "success");
  };

  /* ---------------------------------------------------- */
}

function calculateMaxWeight(pesoTexto) {
  if (!pesoTexto) return "";

  const numeros = pesoTexto
    .replace(/,/g, " ")
    .replace(/\//g, " ")
    .split(" ")
    .map((n) => parseFloat(n))
    .filter((n) => !isNaN(n));

  if (numeros.length === 0) return "";

  const max = Math.max(...numeros);

  return "máx: " + max + " kg";
}

function hapticTap() {
  if (!navigator.vibrate) return;

  navigator.vibrate(10);
}

function updateDiasRestantes(serverUser = null) {
  if (actualizarDiasHeaderDesdeUsuario()) {
    return;
  }

  const el = document.getElementById("dias-restantes");
  const modal = document.getElementById("plan-modal");
  const app = document.getElementById("app-container");
  const btnPlan = document.getElementById("btn-plan");

  if (!el) return;

  const DAY_MS = 1000 * 60 * 60 * 24;

  function desbloquearApp() {
    if (app) {
      app.style.pointerEvents = "auto";
      app.style.filter = "none";
    }

    // cerrar modal SOLO si fue abierto por bloqueo automático
    if (modal && modal.dataset.locked === "true") {
      modal.style.display = "none";
      modal.dataset.locked = "false";
    }
  }

  function bloquearApp() {
    if (modal) {
      modal.style.display = "block";
      modal.dataset.locked = "true";
    }
    if (app) {
      app.style.pointerEvents = "none";
      app.style.filter = "blur(2px)";
    }
  }

  let plan = null;
  let expira = null;

  if (serverUser && serverUser.plan) {
    plan = serverUser.plan;
    expira = serverUser.expira;

    localStorage.setItem("plan", plan);

    if (expira) {
      localStorage.setItem("licencia_exp", expira);
    }
  } else {
    plan = localStorage.getItem("plan");
    expira = localStorage.getItem("licencia_exp");
  }

  if (!expira) {
    el.innerText = "";
    el.style.color = "#444";
    desbloquearApp();

    if (btnPlan) {
      updateMembershipChip();
      btnPlan.style.display = "inline-block";
    }

    return;
  }

  const hoy = new Date();
  const venc = new Date(expira);
  const diff = Math.ceil((venc - hoy) / DAY_MS);

  if (diff <= 0) {
    el.innerText = "Licencia vencida";
    el.style.color = "#d11";

    if (btnPlan) {
      updateMembershipChip();
      btnPlan.style.display = "inline-block";
    }

    bloquearApp();
    return;
  }

  if (plan === "pro") {
    el.innerText = diff + " días restantes";
    el.style.color = "#0a8f4b";

    if (btnPlan) {
      updateMembershipChip();
      btnPlan.style.display = "inline-block";
    }

    desbloquearApp();
    return;
  }

  desbloquearApp();

  if (diff <= 3) {
    el.innerText = "⚠ " + diff + " días restantes";
    el.style.color = "#d11";
  } else {
    el.innerText = diff + " días restantes";
    el.style.color = "#444";
  }

  if (btnPlan) {
    updateMembershipChip();
    btnPlan.style.display = "inline-block";
  }
}

// ---- BOTON PLAN PRO ----
document.addEventListener("DOMContentLoaded", function () {
  const btnPlan = document.getElementById("btn-plan");
  const btnCerrar = document.getElementById("btn-cerrar-plan");

  updateMembershipChip();

  if (btnPlan) {
    btnPlan.onclick = () => {
      const modal = document.getElementById("plan-modal");

      if (modal) {
        showPlanMessage("");
        modal.style.display = "block";
        modal.dataset.locked = "false";
      }
    };
  }

  if (btnCerrar) {
    btnCerrar.onclick = () => {
      showPlanMessage("");
      document.getElementById("plan-modal").style.display = "none";
    };
  }
});

/* =========================================================
   BOTÓN: "YA TRANSFERÍ"
   ---------------------------------------------------------
   Esta función se ejecuta cuando el usuario confirma que
   realizó la transferencia para activar el plan PRO.

   Flujo completo:
   1) Obtiene teléfono del usuario guardado en localStorage
   2) Obtiene el alias desde donde el usuario transfirió
   3) Envía la solicitud a Apps Script (action=solicitarPago)
   4) Cierra el modal de pago
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-transferido").onclick = async () => {
    /* -------------------------------------------------------
       1) OBTENER DATOS DEL USUARIO
       ------------------------------------------------------- */

    // usuario actual guardado al iniciar sesión
    const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "{}");
    const telefono = usuarioActual.telefono || localStorage.getItem("telefono");

    // alias que el usuario escribió en el campo del modal
    const aliasInput = document.getElementById("alias-cliente");
    const aliasCliente = aliasInput ? aliasInput.value.trim() : "";
    showPlanMessage("");

    /* -------------------------------------------------------
       2) VALIDACIONES BÁSICAS
       ------------------------------------------------------- */

    // si por algún motivo no existe el teléfono
    if (!telefono) {
      showPlanMessage("Error: usuario no identificado", "error");
      return;
    }

    // si el usuario no escribió el alias desde donde pagó
    if (!aliasCliente) {
      showPlanMessage(
        "Por favor escribí el alias desde donde hiciste la transferencia",
        "error",
      );
      return;
    }

    /* -------------------------------------------------------
       3) ENVIAR SOLICITUD A APPS SCRIPT
       -------------------------------------------------------
       Apps Script registra la solicitud y actualiza la fila
       del usuario desde Google Sheets/AppSheet.
       ------------------------------------------------------- */

    try {
      const data = await appsScriptRequest("solicitarPago", {
        telefono: telefono,
        aliasCliente: aliasCliente,
        monto: 5000,
        planSolicitado: "PRO",
        fechaSolicitudPago: new Date().toISOString(),
      });

      if (data?.ok === true) {
        showPlanMessage(
          "Solicitud enviada correctamente. Revisaremos el pago y activaremos tu cuenta.",
        );
        if (aliasInput) aliasInput.value = "";

        const whatsappOpened = await openAdminWhatsappForReceipt();
        if (!whatsappOpened) return;

        setTimeout(() => {
          const modal = document.getElementById("plan-modal");
          if (modal) modal.style.display = "none";
          showPlanMessage("");
        }, 2000);

        return;
      }

      showPlanMessage(
        data?.message || data?.error || "No se pudo registrar la solicitud",
        "error",
      );
    } catch (err) {
      /* -------------------------------------------------------
        4) ERROR DE CONEXIÓN O EXCEPCIÓN
       ------------------------------------------------------- */

      console.error(err);

      showPlanMessage(err?.message || "Error de conexión", "error");
    }
  };
});

// después del login exitoso

function startUserAccessSync() {
  if (syncInterval) clearInterval(syncInterval);
  consultarEstadoUsuario();
  syncInterval = setInterval(consultarEstadoUsuario, 15000);
}

async function consultarEstadoUsuario() {
  const telefono = localStorage.getItem("telefono");
  if (!telefono) {
    updateDiasRestantes();
    return;
  }

  try {
    const data = await appsScriptRequest("checkAccess", { telefono });

    if (!data?.ok || !data?.usuario) {
      updateDiasRestantes();
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    actualizarDiasHeaderDesdeUsuario();
    updateMembershipChip(data.usuario);
  } catch (err) {
    console.error("Error sync usuario:", err);

    // si falla el servidor seguimos con el usuario guardado localmente
    actualizarDiasHeaderDesdeUsuario();
    updateMembershipChip();
  }
}

async function generarPDFRutina() {
  const fileName = "rutina_gym.pdf";

  try {
    showAppToast("Generando PDF...", "info");

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error("jsPDF no disponible.");
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const semanas = state?.rutina?.semanas || {};
    const semKeys = Object.keys(semanas).sort((a, b) => Number(a) - Number(b));
    const pdfSemanas = semKeys.length > 0 ? semKeys : ["1"];

    const getDia = (semanaKey, diaKey) => {
      const semana = semanas?.[semanaKey] || {};
      const dias = semana?.dias || {};
      return dias?.[diaKey] || null;
    };

    const getEjercicios = (semanaKey, diaKey) => {
      const dia = getDia(semanaKey, diaKey);
      return Array.isArray(dia?.ejercicios)
        ? dia.ejercicios.filter((e) => e && typeof e === "object")
        : [];
    };

    const toText = (value, fallback) => {
      if (value === undefined || value === null) return fallback;
      const text = String(value).trim();
      return text || fallback;
    };

    const toRow = (exercise) => [
      toText(exercise.nombre, "Ejercicio sin nombre"),
      toText(exercise.series, "-"),
      toText(exercise.reps, "-"),
      toText(exercise.peso, "-"),
    ];

    const chunks = [];
    for (let i = 0; i < pdfSemanas.length; i += 4) {
      chunks.push(pdfSemanas.slice(i, i + 4));
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    //espacio entre “Día” y la primera tabla está determinado por una sola variable: startX.
    //const startX = 25; la tabla empieza en 25 mm probar const startX = 16;
    const startX = 18;
    const marginRight = 14;
    const usableWidth = pageWidth - startX - marginRight;
    const weekWidth = usableWidth / 4;
    //ANCHO DE COLUMNAS
    const colEjercicio = weekWidth * 0.5;
    const colS = weekWidth * 0.08;
    const colR = weekWidth * 0.17;
    const colKg = weekWidth * 0.25;

    chunks.forEach((chunk, chunkIndex) => {
      if (chunkIndex > 0) {
        doc.addPage();
      }

      doc.setFontSize(18);
      doc.text("Rutina de Entrenamiento", 14, 15);

      let startY = 25;
      //LETRA DE SEMANA
      doc.setFontSize(9);
      chunk.forEach((semana, index) => {
        const tableX = startX + index * weekWidth;
        doc.text("SEMANA " + semana, tableX, startY);
      });

      startY += 5;
      const tablesStartY = startY;

      for (let dia = 1; dia <= 4; dia++) {
        let maxFinalY = startY;
        //LETRA DE DIA
        doc.setFontSize(9);
        //etiqueta del día
        // doc.text("Día " + dia, 10, startY + 7); el texto está en 10 mm, dejando 15 mm de espacio.
        // probar doc.text("Día " + dia, 12, startY + 7); mas chico mueve "dia" mas a la izquierda
        doc.text("Día " + dia, 8, startY + 7);

        let maxEjercicios = 1;
        chunk.forEach((semana) => {
          const ejercicios = getEjercicios(semana, dia);
          if (ejercicios.length > maxEjercicios) {
            maxEjercicios = ejercicios.length;
          }
        });

        chunk.forEach((semana, index) => {
          const ejercicios = getEjercicios(semana, dia);

          let tabla =
            ejercicios.length > 0
              ? ejercicios.map(toRow)
              : [["Sin ejercicios cargados", "-", "-", "-"]];

          while (tabla.length < maxEjercicios) {
            tabla.push(["", "", "", ""]);
          }

          const tableX = startX + index * weekWidth;

          doc.autoTable({
            startY: startY,
            margin: { left: tableX },
            head: [["Ejercicio", "S", "R", "Kg"]],
            body: tabla,
            theme: "grid",
            tableWidth: weekWidth,
            styles: {
              fontSize: 7,
              cellPadding: 0.5,
              valign: "middle",
              overflow: "visible",
            },
            columnStyles: {
              0: { cellWidth: colEjercicio },
              1: { cellWidth: colS, halign: "center" },
              2: { cellWidth: colR, halign: "center" },
              3: { cellWidth: colKg, halign: "center" },
            },
          });

          if (doc.lastAutoTable?.finalY > maxFinalY) {
            maxFinalY = doc.lastAutoTable.finalY;
          }
        });

        startY = maxFinalY + 5;
      }

      doc.setLineWidth(0.8);
      doc.setDrawColor(0, 150, 120); // verde similar al header

      for (let i = 1; i < chunk.length; i++) {
        const lineX = startX + i * weekWidth;
        doc.line(lineX, tablesStartY, lineX, startY - 5);
      }
    });

    const blob = doc.output("blob");
    try {
      await showPdfReadyModal({ pdfBlob: blob, fileName });
    } catch (modalError) {
      console.error("Error mostrando modal PDF", modalError);
      downloadPdfBlob(blob, fileName);
      showAppToast(
        "PDF descargado. Adjuntalo manualmente en WhatsApp.",
        "warning",
      );
    }
  } catch (error) {
    console.error("Error generando PDF", error);
    showAppToast("No se pudo generar el PDF.", "error");
  }
}

/* ================================================= */
/* ELIMINAR EJERCICIO                                */
/* ================================================= */

async function deleteExercise(dayId, index, btn) {
  const ok = await showAppConfirm({
    title: "Eliminar ejercicio",
    message: "Se eliminará este ejercicio de la rutina.",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    tone: "danger",
  });
  if (!ok) return;

  const semana = state.rutina.semanas[state.currentWeek];
  const dia = semana.dias[dayId];

  // eliminar del estado
  dia.ejercicios.splice(index, 1);

  // guardar cambios
  saveToStorage(true);

  // eliminar solo la fila del DOM
  const row = btn.closest(".exercise-row");
  if (row) row.remove();
}

/* ================================================= */
/* ELIMINAR DIA                                */
/* ================================================= */

window.deleteDay = (dayId, event) => {
  // Evitamos que al hacer clic en la X se expanda/contraiga el acordeón
  if (event) event.stopPropagation();
  showAppConfirm({
    title: "Eliminar día",
    message: "Se eliminará este día y todos sus ejercicios. ¿Confirmás?",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    tone: "danger",
  }).then((ok) => {
    if (!ok) return;

    const dias = state.rutina.semanas[state.currentWeek].dias;

    // 1. Elimina el día del objeto usando la key (dayId) real
    delete dias[dayId];

    // 2. Si el día eliminado era el que estaba abierto, limpiamos el estado
    // y tratamos de abrir otro día válido para que no quede la pantalla vacía
    if (state.openDay == dayId) {
      state.openDay = null;
      const diasDisponibles = Object.keys(dias);
      if (diasDisponibles.length > 0) {
        state.openDay = diasDisponibles[0];
      }
    }

    // 3. Guardar estado permanentemente y re-renderizar la interfaz
    saveToStorage(true);
    renderApp();
  });
};

/* ================================================= */
/* ELIMINAR SEMANA                                   */
/* ================================================= */
window.deleteWeek = (weekId, event) => {
  // Evitar que el clic en la X cambie la semana activa
  if (event) event.stopPropagation();

  const semanas = state.rutina.semanas;
  const numSemanas = Object.keys(semanas).length;

  if (numSemanas <= 1) {
    showAppToast("No podés eliminar la única semana disponible.", "warning");
    return;
  }

  showAppConfirm({
    title: "Eliminar semana",
    message: "Esta acción eliminará la semana completa. ¿Confirmás?",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    tone: "danger",
  }).then((ok) => {
    if (!ok) return;

    // 1. Eliminar la semana del objeto global
    delete semanas[weekId];

    // 2. Si borramos la semana que estábamos mirando, saltamos a la primera que haya quedado
    if (state.currentWeek == weekId) {
      const semanasRestantes = Object.keys(semanas);
      state.currentWeek = parseInt(semanasRestantes[0]);
    }

    // 3. Persistir y reconstruir la pantalla
    saveToStorage(true);
    renderTabs();
    renderApp();

    if (typeof scrollActiveWeekIntoView === "function") {
      scrollActiveWeekIntoView();
    }
  });
};

/* ========================================================= */
/* MÓDULO CONTROL DE PESO CORPORAL                           */
/* ========================================================= */

const WEIGHT_STORAGE_KEY = "gym_weight_log_v1";
let weightLog = [];
let isWeightModuleInitialized = false; // <-- GUARD PARA EVITAR DUPLICACIÓN

function loadWeightLog() {
  const data = localStorage.getItem(WEIGHT_STORAGE_KEY);
  if (data) {
    try {
      weightLog = JSON.parse(data);
      weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (e) {
      console.error("Error cargando historial de peso", e);
      weightLog = [];
    }
  } else {
    weightLog = [];
  }
}

function saveWeightLog() {
  weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
  localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(weightLog));
}

function clearAppStorageKeys(storage) {
  if (!storage) return;

  Object.keys(storage).forEach((key) => {
    if (key.startsWith("gym_")) {
      storage.removeItem(key);
    }
  });
}

async function handleResetLocalData() {
  const ok = await showAppConfirm({
    title: "Borrar datos locales",
    message:
      "Todos los datos cargados en este dispositivo —rutinas, ejercicios creados, secciones, peso corporal y progreso— serán borrados completamente. Esta acción no elimina tu cuenta ni tus pagos.\n\n¿Seguro querés continuar?",
    confirmText: "Sí, quiero borrar",
    cancelText: "No, cancelar",
    tone: "danger",
  });

  if (!ok) return;

  clearAppStorageKeys(localStorage);
  clearAppStorageKeys(sessionStorage);

  showAppToast("Datos locales borrados", "success");

  setTimeout(() => {
    window.location.reload();
  }, 800);
}

/* ========================================================= */
/* MENÚ PRINCIPAL NAVEGACIÓN                                 */
/* ========================================================= */
function initMainMenu() {
  const btnMenu = document.getElementById("btn-main-menu");
  const overlay = document.getElementById("main-menu-overlay");
  const btnClose = document.getElementById("btn-close-menu");
  const btnProgress = document.getElementById("btn-progress-module");
  const btnWeight = document.getElementById("btn-weight-module");
  const btnContactAdmin = document.getElementById("btn-contact-admin");
  const btnResetLocalData = document.getElementById("btn-reset-local-data");
  if (btnMenu && overlay && btnClose) {
    // Abrir menú principal
    btnMenu.addEventListener("click", () => {
      overlay.style.display = "flex";
    });
    // Cerrar menú con la cruz
    btnClose.addEventListener("click", () => {
      overlay.style.display = "none";
    });
    // Cerrar si tocan fuera del menú
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.style.display = "none";
      }
    });
    // Cerrar menú si pulsan en "Peso Corporal" (para dejar que actúe su propio evento)
    if (btnWeight) {
      btnWeight.addEventListener("click", () => {
        overlay.style.display = "none";
      });
    }

    if (btnResetLocalData) {
      btnResetLocalData.addEventListener("click", () => {
        overlay.style.display = "none";
        handleResetLocalData();
      });
    }

    if (btnContactAdmin) {
      btnContactAdmin.addEventListener("click", () => {
        overlay.style.display = "none";
        contactAdminWhatsapp();
      });
    }
  }
}

function initWeightModule() {
  // Si ya se agregaron los listeners previamente, abortamos silenciosamente
  if (isWeightModuleInitialized) return;

  loadWeightLog();

  // Asignar fecha de hoy al input por defecto
  const dateInput = document.getElementById("weight-date");
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const btnOpen = document.getElementById("btn-weight-module");
  const btnClose = document.getElementById("btn-close-weight");
  const appContainer = document.getElementById("app-container");
  const weightContainer = document.getElementById("weight-container");

  // Transiciones de vistas (se registran UNA SOLA VEZ)
  if (btnOpen && btnClose && appContainer && weightContainer) {
    btnOpen.addEventListener("click", () => {
      appContainer.style.display = "none";
      weightContainer.style.display = "flex";
      renderWeightModule();
    });

    btnClose.addEventListener("click", () => {
      appContainer.style.display = "block";
      weightContainer.style.display = "none";
    });
  }

  const btnAdd = document.getElementById("btn-add-weight");
  if (btnAdd) {
    btnAdd.addEventListener("click", addWeightRecord);
  }

  // Sellamos la inicialización para futuras llamadas de init()
  isWeightModuleInitialized = true;
}

function addWeightRecord() {
  const dateInput = document.getElementById("weight-date");
  const valueInput = document.getElementById("weight-value");

  const date = dateInput.value;
  const valueStr = valueInput.value.replace(",", "."); // Tolerancia a comas
  const value = parseFloat(valueStr);

  if (!date) {
    showAppToast("Por favor, seleccioná una fecha.", "warning");
    return;
  }
  if (isNaN(value) || value <= 0) {
    showAppToast("Por favor, ingresá un peso corporal válido.", "warning");
    return;
  }

  // Sobrescribir si hay registro mismo día, de lo contrario agregar
  const existingIndex = weightLog.findIndex((w) => w.date === date);
  if (existingIndex >= 0) {
    weightLog[existingIndex].weight = value;
  } else {
    weightLog.push({ date: date, weight: value });
  }

  saveWeightLog();
  renderWeightModule();

  valueInput.value = ""; // Limpiar input post-guardado
  showAppToast("Peso guardado", "success");
}

window.deleteWeightRecord = async function (date) {
  const ok = await showAppConfirm({
    title: "Eliminar registro",
    message: "Se borrará este registro de peso corporal.",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    tone: "danger",
  });
  if (!ok) return;
  weightLog = weightLog.filter((w) => w.date !== date);
  saveWeightLog();
  renderWeightModule();
};

function renderWeightModule() {
  renderWeightTable();
  renderWeightChart();
}

/* ========================================================= */
/* TABLA DE REGISTROS (Render)                               */
/* ========================================================= */
function renderWeightTable() {
  const tbody = document.getElementById("weight-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Invertimos clonando el log para mostrar del más nuevo al más antiguo
  const reversedLog = [...weightLog].reverse();

  if (reversedLog.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='3' style='text-align:center; padding: 24px 0; color: #8e8e93;'>Aún no hay registros cargados</td></tr>";
    return;
  }

  reversedLog.forEach((record) => {
    const parts = record.date.split("-");
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${formattedDate}</td>
            <td style="color: var(--primary);">${record.weight.toFixed(1)}</td>
            <td>
                <button class="btn-delete-weight" title="Borrar registro" onclick="deleteWeightRecord('${record.date}')">✖</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

/* ========================================================= */
/* GRÁFICO DE EVOLUCIÓN (Native HTML5 Canvas)                */
/* ========================================================= */
function renderWeightChart() {
  const canvas = document.getElementById("weight-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Requiere mínimo 2 puntos para unir una línea
  if (weightLog.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Agregá al menos 2 registros para ver el gráfico",
      width / 2,
      height / 2,
    );
    return;
  }

  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const weights = weightLog.map((w) => w.weight);
  const minW = Math.min(...weights) - 1.5; // Margen dinámico inferior
  const maxW = Math.max(...weights) + 1.5; // Margen dinámico superior
  const range = maxW - minW;

  // Dibujo de líneas horizontales base
  ctx.strokeStyle = "#e5e5ea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(width - padding, padding);
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Dibujo de la línea de evolución (Azul)
  ctx.strokeStyle = "#007aff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  weightLog.forEach((record, idx) => {
    const x = padding + (idx / (weightLog.length - 1)) * chartW;
    const normalizedY = (record.weight - minW) / range;
    const y = height - padding - normalizedY * chartH;

    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dibujo de los puntos en los cruces
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#007aff";

  weightLog.forEach((record, idx) => {
    const x = padding + (idx / (weightLog.length - 1)) * chartW;
    const normalizedY = (record.weight - minW) / range;
    const y = height - padding - normalizedY * chartH;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}

/* ===================================================== */
/* MÓDULO: PROGRESO DE EJERCICIOS                        */
/* ===================================================== */

const PROGRESS_STORAGE_KEY = "gym_progress_v1";
let progressData = [];

function syncProgressExerciseButtons() {
  const formSelect = document.getElementById("progress-exercise-select");
  const filterSelect = document.getElementById("progress-filter-select");
  const formButton = document.getElementById("progress-exercise-picker-btn");
  const filterButton = document.getElementById("progress-filter-picker-btn");

  if (formButton && formSelect) {
    formButton.textContent = formSelect.value || "Selecciona Ejercicio...";
    formButton.classList.toggle("has-value", Boolean(formSelect.value));
  }

  if (filterButton && filterSelect) {
    filterButton.textContent = filterSelect.value || "Todos los registros";
    filterButton.classList.toggle("has-value", Boolean(filterSelect.value));
  }
}

function ensureProgressCustomSelectors() {
  const formSelect = document.getElementById("progress-exercise-select");
  const filterSelect = document.getElementById("progress-filter-select");

  if (formSelect && !document.getElementById("progress-exercise-picker-btn")) {
    const button = document.createElement("button");
    button.id = "progress-exercise-picker-btn";
    button.type = "button";
    button.className = "progress-exercise-picker-btn";
    button.addEventListener("click", () => {
      openExercisePicker({
        currentValue: formSelect.value,
        onSelect: (exerciseName) => {
          formSelect.value = exerciseName;
          syncProgressExerciseButtons();
        },
      });
    });
    formSelect.insertAdjacentElement("afterend", button);
  }

  if (filterSelect && !document.getElementById("progress-filter-picker-btn")) {
    const button = document.createElement("button");
    button.id = "progress-filter-picker-btn";
    button.type = "button";
    button.className = "progress-exercise-picker-btn";
    button.addEventListener("click", () => {
      const exercisesWithRecords = [
        ...new Set(progressData.map((r) => r.exercise).filter(Boolean)),
      ].sort();

      openExercisePicker({
        currentValue: filterSelect.value,
        allowedNames: exercisesWithRecords,
        includeClear: true,
        clearText: "Todos los registros",
        onSelect: (exerciseName) => {
          filterSelect.value = exerciseName;
          syncProgressExerciseButtons();
          renderProgressUI();
        },
      });
    });
    filterSelect.insertAdjacentElement("afterend", button);
  }

  syncProgressExerciseButtons();
}

function initProgressModule() {
  loadProgressData();

  const btnOpen = document.getElementById("btn-progress-module");
  const btnClose = document.getElementById("btn-close-progress");
  const container = document.getElementById("progress-container");

  if (btnOpen && container && btnClose) {
    btnOpen.addEventListener("click", () => {
      // Ocultar menú principal si está abierto
      document.getElementById("main-menu-overlay").style.display = "none";

      // Mostrar contenedor
      container.style.display = "flex";

      // Setear fecha actual por defecto en el form
      const hoy = new Date();
      // Formato YYYY-MM-DD local
      const offset = hoy.getTimezoneOffset() * 60000;
      const localISOTime = new Date(hoy - offset).toISOString().split("T")[0];
      document.getElementById("progress-date").value = localISOTime;

      loadExerciseSelects();
      ensureProgressCustomSelectors();
      renderProgressUI();
    });

    btnClose.addEventListener("click", () => {
      container.style.display = "none";
    });
  }

  const btnAdd = document.getElementById("btn-add-progress");
  if (btnAdd) {
    btnAdd.addEventListener("click", handleAddProgress);
  }

  const filterSelect = document.getElementById("progress-filter-select");
  if (filterSelect) {
    filterSelect.addEventListener("change", renderProgressUI);
  }
}

/* Persistencia de Progreso */
function loadProgressData() {
  const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (data) {
    try {
      progressData = JSON.parse(data);
    } catch {
      progressData = [];
    }
  } else {
    progressData = [];
  }
}

function saveProgressData() {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressData));
}

function handleAddProgress() {
  const dateInput = document.getElementById("progress-date").value;
  const exInput = document.getElementById("progress-exercise-select").value;
  const valInput = document.getElementById("progress-value").value;

  if (!dateInput || !exInput || !valInput) {
    showAppToast("Completá todos los campos.", "warning");
    return;
  }

  const newRecord = {
    id: Date.now() + Math.random().toString(36),
    date: dateInput,
    exercise: exInput,
    weight: parseFloat(valInput),
  };

  progressData.push(newRecord);
  saveProgressData();

  // Limpiar solo peso para facilitar carga masiva
  document.getElementById("progress-value").value = "";

  // Refrescar selector de filtrado por si es un ejercicio nuevo
  const filterSelect = document.getElementById("progress-filter-select");
  const prevFilter = filterSelect.value;
  loadExerciseSelects();
  filterSelect.value = exInput; // Autofiltrar por el recien agregado (muy útil)
  syncProgressExerciseButtons();

  renderProgressUI();
  showAppToast("Registro agregado", "success");
}

window.deleteProgressRecord = async (id) => {
  const ok = await showAppConfirm({
    title: "Eliminar registro",
    message: "Se eliminará este registro de progreso.",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
    tone: "danger",
  });
  if (!ok) return;

  progressData = progressData.filter((r) => r.id !== id);
  saveProgressData();

  const filterSelect = document.getElementById("progress-filter-select");
  const prevFilter = filterSelect.value;
  loadExerciseSelects();
  filterSelect.value = prevFilter;
  syncProgressExerciseButtons();

  renderProgressUI();
};

/* Carga de ejercicios disponibles en Catálogo */
function loadExerciseSelects() {
  const catalog = getFinalCatalog();
  const selectForm = document.getElementById("progress-exercise-select");
  const selectFilter = document.getElementById("progress-filter-select");

  if (!selectForm || !selectFilter) return;

  const prevFormVal = selectForm.value;
  const prevFilterVal = selectFilter.value;

  let optionsHtml = '<option value="">Selecciona Ejercicio...</option>';

  // Usamos el mismo recorrido por catalogos que existe en createExerciseRow
  for (const [grupo, items] of Object.entries(catalog)) {
    optionsHtml += `<optgroup label="${grupo}">`;
    items.forEach((item) => {
      optionsHtml += `<option value="${item}">${item}</option>`;
    });
    optionsHtml += `</optgroup>`;
  }

  selectForm.innerHTML = optionsHtml;
  selectForm.value = prevFormVal; // Restaurar si había algo

  // Para el filtro extraemos solo los que tienen AL MENOS 1 registro
  const ejerciciosConRegistros = [
    ...new Set(progressData.map((r) => r.exercise)),
  ].sort();

  let filterHtml = '<option value="">Todos los registros</option>';
  ejerciciosConRegistros.forEach((ex) => {
    filterHtml += `<option value="${ex}">${ex}</option>`;
  });

  selectFilter.innerHTML = filterHtml;
  selectFilter.value = ejerciciosConRegistros.includes(prevFilterVal)
    ? prevFilterVal
    : "";

  ensureProgressCustomSelectors();
}

/* Render principal de UI (Tabla + Grafico) */
function renderProgressUI() {
  const tbody = document.getElementById("progress-table-body");
  const filterVal = document.getElementById("progress-filter-select").value;

  // Filtrar
  let filteredData = progressData;
  if (filterVal) {
    filteredData = progressData.filter((r) => r.exercise === filterVal);
  }

  // Ordenar descendente (más nuevo arriba) para tabla
  const sortedDesc = [...filteredData].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  tbody.innerHTML = "";
  sortedDesc.forEach((record) => {
    // Formatear Fecha DD/MM
    const partes = record.date.split("-");
    const labelFecha =
      partes.length === 3 ? `${partes[2]}/${partes[1]}` : record.date;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labelFecha}</td>
      <td style="font-size: 0.75rem; color:#444;">${record.exercise}</td>
      <td style="color: var(--primary);">${record.weight}</td>
      <td style="text-align:right;">
        <button class="btn-delete-progress" type="button" onclick="deleteProgressRecord('${record.id}')">✖</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Renderizar Gráfica solo con los datos filtrados
  renderProgressChart(filteredData, filterVal);
}

/* Renderizado Gráfica de Progreso de línea Vanilla JS */
function renderProgressChart(data, filterName) {
  const canvas = document.getElementById("progress-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!filterName) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Seleccioná un ejercicio para ver su gráfica", w / 2, h / 2);
    return;
  }

  if (data.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Faltan datos (2 o +) para graficar", w / 2, h / 2);
    return;
  }

  // Ordenar ascendente para la gráfica (más viejo a izquierda, nuevo a derecha)
  const sortedAsc = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  const pesos = sortedAsc.map((r) => r.weight);
  const minW = Math.min(...pesos);
  const maxW = Math.max(...pesos);

  const padY = 25;
  const padX = 25;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  let range = maxW - minW;
  if (range === 0) range = 10; // Si todos los pesos son iguales, forzar rango visual

  // Dibujar línea principal
  ctx.beginPath();
  ctx.strokeStyle = "var(--primary)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";

  sortedAsc.forEach((pt, i) => {
    const fracX = i / (sortedAsc.length - 1);
    const fracY = (pt.weight - minW) / range;

    const x = padX + fracX * chartW;
    const y = h - padY - fracY * chartH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dibujar puntos y etiquetas
  ctx.fillStyle = "var(--primary)";
  ctx.textAlign = "center";
  ctx.font = "10px sans-serif";

  sortedAsc.forEach((pt, i) => {
    const fracX = i / (sortedAsc.length - 1);
    const fracY = (pt.weight - minW) / range;

    const x = padX + fracX * chartW;
    const y = h - padY - fracY * chartH;

    // Punto
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Etiqueta peso
    ctx.fillStyle = "var(--text)";
    ctx.fillText(pt.weight, x, y - 10);
    ctx.fillStyle = "var(--primary)"; // Reset para el siguiente punto
  });
}

// =================================================
// LÓGICA MODO TESTER 2 DÍAS (Restricción por Frontend)
// =================================================
function verificarModoTester() {
  if (actualizarDiasHeaderDesdeUsuario()) {
    return;
  }

  const TESTER_KEY = "gym_tester_start_v1";
  const MAX_DAYS = 2; // Días de prueba
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  let testerStart = localStorage.getItem(TESTER_KEY);

  // 1. Guardamos el primer uso localmente
  if (!testerStart) {
    testerStart = Date.now().toString();
    localStorage.setItem(TESTER_KEY, testerStart);
  }

  const startTime = parseInt(testerStart, 10);
  const now = Date.now();
  const diffMs = now - startTime;
  const diffDays = diffMs / MS_PER_DAY;

  // 2. Verificamos si expiró la restricción local
  if (diffDays >= MAX_DAYS) {
    document.getElementById("app-container").style.display = "none";
    document.getElementById("tester-lock-screen").style.display = "flex";
  } else {
    document.getElementById("app-container").style.display = "block";

    // 3. Cálculo simple en días redondeados hacia arriba
    const msRestantes = MAX_DAYS * MS_PER_DAY - diffMs;
    const diasRestantes = Math.ceil(msRestantes / MS_PER_DAY);

    const textoDias =
      diasRestantes > 1
        ? `Faltan ${diasRestantes} días para bloqueo`
        : `Falta 1 día para bloqueo`;

    // 4. Actualizamos exclusivamente el span manteniendo intacto todo lo del PRO
    const spanDias = document.getElementById("dias-restantes");
    if (spanDias) {
      spanDias.innerHTML = `<span style="color:#ff3b30;">${textoDias}</span>`;
    }
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}
