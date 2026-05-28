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
    body: JSON.stringify(payload)
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

function showAuthPanel(panel) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) loginForm.style.display = panel === "login" ? "block" : "none";
  if (registerForm) registerForm.style.display = panel === "register" ? "block" : "none";
  showAuthMessage("");
}

function getAuthSuccess(data) {
  return data?.ok === true || data?.success === true || data?.login === true || data?.registered === true;
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
    SIN_FECHA_VENCIMIENTO: "Tu cuenta todavÃ­a no tiene una fecha de acceso asignada.",
    PAGO_PENDIENTE: "Tu pago estÃ¡ pendiente. ConsultÃ¡ con el administrador.",
    CUENTA_PENDIENTE: "Tu cuenta estÃ¡ pendiente de aprobaciÃ³n por el administrador.",
    PENDIENTE: "Tu cuenta estÃ¡ pendiente de aprobaciÃ³n por el administrador.",
    BLOQUEADO: "Tu cuenta estÃ¡ bloqueada. ConsultÃ¡ con el administrador.",
    VENCIDO: "Tu acceso estÃ¡ vencido. ConsultÃ¡ con el administrador."
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
    if (usuario && usuario[key] !== undefined && usuario[key] !== null && usuario[key] !== "") {
      return usuario[key];
    }
  }

  return "";
}

function parseFechaUsuario(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  const raw = value.toString().trim();
  const parts = raw.split("/");

  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  return new Date(raw);
}

function calcularDiasRestantes(fecha) {
  if (!fecha || isNaN(fecha.getTime())) return null;

  const DAY_MS = 1000 * 60 * 60 * 24;
  const diffMs = fecha - new Date();

  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / DAY_MS);
}

function actualizarDiasHeaderDesdeUsuario() {
  const usuario = getStoredUsuario();
  if (!usuario || Object.keys(usuario).length === 0) return false;

  const el = document.getElementById("dias-restantes");
  if (!el) return true;

  const estado = normalizeAuthValue(getUsuarioField(usuario, ["Estado", "estado"]));
  const pago = normalizeAuthValue(getUsuarioField(usuario, ["Pago", "pago"]));
  const fechaVencimientoRaw = getUsuarioField(usuario, [
    "FechaVencimiento",
    "fechaVencimiento",
    "fecha_vencimiento",
    "expira"
  ]);

  if (estado === "BLOQUEADO") {
    el.innerText = "Acceso bloqueado";
    el.style.color = "#d11";
    return true;
  }

  if (estado === "VENCIDO") {
    el.innerText = "Acceso vencido";
    el.style.color = "#d11";
    return true;
  }

  if (estado === "PENDIENTE") {
    el.innerText = "Pendiente de aprobaciÃ³n";
    el.style.color = "#d11";
    return true;
  }

  const fechaVencimiento = parseFechaUsuario(fechaVencimientoRaw);
  const diasRestantes = calcularDiasRestantes(fechaVencimiento);

  if (estado === "PRUEBA") {
    if (diasRestantes === null) {
      el.innerText = "Prueba sin fecha asignada";
      el.style.color = "#d11";
      return true;
    }

    el.innerText = diasRestantes === 1 ? "Falta 1 dÃ­a de prueba" : `Faltan ${diasRestantes} dÃ­as de prueba`;
    el.style.color = diasRestantes <= 0 ? "#d11" : "#444";
    return true;
  }

  if (estado === "ACTIVO" && pago === "SI") {
    if (diasRestantes === null) {
      el.innerText = "";
      el.style.color = "#444";
      return true;
    }

    el.innerText = diasRestantes === 1 ? "1 dÃ­a restante" : `${diasRestantes} dÃ­as restantes`;
    el.style.color = diasRestantes <= 0 ? "#d11" : "#0a8f4b";
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

function getLoginBlockMessage(user, data) {
  const apiMessage = data?.motivo || data?.message || data?.error;
  const estado = normalizeAuthValue(user?.estado || data?.estado);
  const rol = normalizeAuthValue(user?.rol || data?.rol);
  const pago = normalizeAuthValue(user?.pago || data?.pago);
  const acceso = data?.acceso === true || data?.acceso === "true" || user?.acceso === true || user?.acceso === "true";

  if (estado === "BLOQUEADO") {
    return getFriendlyAuthMessage(apiMessage, "Tu cuenta estÃ¡ bloqueada. ConsultÃ¡ con el administrador.");
  }

  if (estado === "VENCIDO") {
    return getFriendlyAuthMessage(apiMessage, "Tu acceso estÃ¡ vencido. ConsultÃ¡ con el administrador.");
  }

  if (rol === "ADMIN") return "";

  if (estado === "PENDIENTE") {
    return "Tu cuenta estÃ¡ pendiente de aprobaciÃ³n por el administrador.";
  }

  if (data?.acceso === false || data?.acceso === "false") {
    return getFriendlyAuthMessage(apiMessage, "Tu acceso no estÃ¡ habilitado. ConsultÃ¡ con tu entrenador.");
  }

  if (user?.acceso === false || user?.acceso === "false") {
    return getFriendlyAuthMessage(apiMessage, "Tu acceso no estÃ¡ habilitado. ConsultÃ¡ con tu entrenador.");
  }

  if (estado === "PRUEBA") {
    return acceso ? "" : getFriendlyAuthMessage(apiMessage, "Tu prueba no estÃ¡ habilitada o estÃ¡ vencida.");
  }

  if (estado === "ACTIVO") {
    return pago === "SI" ? "" : getFriendlyAuthMessage(apiMessage, "Tu pago estÃ¡ pendiente. ConsultÃ¡ con el administrador.");
  }

  if (estado !== "ACTIVO") {
    return getFriendlyAuthMessage(apiMessage, "Tu cuenta estÃ¡ pendiente de aprobaciÃ³n por el administrador.");
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
  if (user?.session_token) localStorage.setItem("session_token", user.session_token);
  if (user?.token) localStorage.setItem("session_token", user.token);

  const loginScreen = document.getElementById("login-screen");
  const appContainer = document.getElementById("app-container");

  if (loginScreen) loginScreen.style.display = "none";
  if (appContainer) appContainer.style.display = "block";

  actualizarDiasHeaderDesdeUsuario();
  init();
}

async function handleAppsScriptLogin() {
  const telefono = document.getElementById("login-phone")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!telefono || !password) {
    showAuthMessage("IngresÃ¡ telÃ©fono y password.", true);
    return;
  }

  try {
    showAuthMessage("Ingresando...");
    const data = await appsScriptRequest("login", { telefono, password });
    const user = getAuthUser(data);
    if (user && !user.telefono) user.telefono = telefono;

    if (!getAuthSuccess(data)) {
      showAuthMessage(data?.error || data?.message || "No se pudo iniciar sesiÃ³n.", true);
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
    showAuthMessage(err.message || "Error de conexiÃ³n.", true);
  }
}

async function handleAppsScriptRegister() {
  const nombre = document.getElementById("register-name")?.value.trim();
  const apellido = document.getElementById("register-lastname")?.value.trim();
  const mail = document.getElementById("register-mail")?.value.trim();
  const telefono = document.getElementById("register-phone")?.value.trim();
  const password = document.getElementById("register-password")?.value;
  const confirmarPassword = document.getElementById("register-password-confirm")?.value;

  if (!nombre || !apellido || !mail || !telefono || !password || !confirmarPassword) {
    showAuthMessage("CompletÃ¡ todos los campos.", true);
    return;
  }

  if (password !== confirmarPassword) {
    showAuthMessage("Las contraseÃ±as no coinciden.", true);
    return;
  }

  try {
    showAuthMessage("Registrando...");
    const data = await appsScriptRequest("register", {
      nombre,
      apellido,
      mail,
      telefono,
      password
    });

    if (!getAuthSuccess(data)) {
      showAuthMessage(data?.error || data?.message || "No se pudo registrar.", true);
      return;
    }

    const registerPassword = document.getElementById("register-password");
    const registerPasswordConfirm = document.getElementById("register-password-confirm");

    if (registerPassword) registerPassword.value = "";
    if (registerPasswordConfirm) registerPasswordConfirm.value = "";

    showAuthPanel("login");
    const loginPhone = document.getElementById("login-phone");
    if (loginPhone) loginPhone.value = telefono;
    showAuthMessage("Registro recibido. Tu cuenta queda pendiente de aprobaciÃ³n por el administrador.");
  } catch (err) {
    console.error("[APPS SCRIPT] register error", err);
    showAuthMessage(err.message || "Error de conexiÃ³n.", true);
  }
}

function setupAppsScriptAuth() {
  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnShowRegister = document.getElementById("btn-show-register");
  const btnShowLogin = document.getElementById("btn-show-login");

  if (btnLogin) btnLogin.onclick = handleAppsScriptLogin;
  if (btnRegister) btnRegister.onclick = handleAppsScriptRegister;
  if (btnShowRegister) btnShowRegister.onclick = () => showAuthPanel("register");
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
  "PECHO": ["Press banca plano", "Aperturas con mancuernas", "Fondos en paralelas", "Pullover"],
  "ESPALDA": ["Dominadas", "Remo con barra", "JalÃ³n al pecho", "Remo con mancuerna"],
  "HOMBROS": ["Press militar", "Elevaciones laterales", "PÃ¡jaros (posterior)", "Frontal mancuerna"],
  "PIERNAS": ["Sentadilla", "Prensa", "Peso muerto rumano", "ExtensiÃ³n cuÃ¡driceps"],
  "BÃCEPS": ["Curl con barra", "Curl alternado", "Curl martillo", "Curl concentrado"],
  "TRÃCEPS": ["Press francÃ©s", "ExtensiÃ³n polea", "Fondos banco", "Patada trÃ­ceps"],
  "GLÃšTEOS": ["Hip thrust", "Patada polea", "Sentadilla sumo", "Puente glÃºteo"],
  "ABDOMEN": ["Crunch", "Plancha", "ElevaciÃ³n piernas", "Rueda abdominal"]
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

  Object.keys(userCatalog).forEach(section => {

    if (!finalCatalog[section]) {

      finalCatalog[section] = [];

    }

    userCatalog[section].forEach(ex => {

      if (!finalCatalog[section].includes(ex)) {

        finalCatalog[section].push(ex);

      }

    });

  });

  return finalCatalog;

}


// Sistema de licencias antiguo eliminado

// --- STATE ---
let state = {
  currentWeek: 1,
  openDay: 1,
  rutina: {
    meta: { version: APP_VERSION, updatedAt: null },
    semanas: {}
  }
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

  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === "BUTTON" && typeof hapticTap === 'function') {
      hapticTap();
    }
  });





  // updateDiasRestantes(); // COMENTADO PARA NO ROMPER TEXTO DEL HEADER

  // ---> INICIO DE LÃNEA A AGREGAR <---
  initWeightModule();
  initProgressModule();
  initMainMenu();
  // ---> FIN DE LÃNEA A AGREGAR <---
  verificarModoTester(); // LLAMADA AL MODO TESTER
}



// SincronizaciÃ³n manejada por startUserAccessSync()




function seedInitialData() {
  for (let w = 1; w <= 3; w++) {
    state.rutina.semanas[w] = { dias: {} };
    for (let d = 1; d <= DEFAULT_DAYS; d++) {
      state.rutina.semanas[w].dias[d] = { ejercicios: [] };
      for (let e = 0; e < DEFAULT_EX_PER_DAY; e++) {
        // Seed some examples for W1 D1
        if (w === 1 && d === 1 && e === 0) {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject("Press banca plano", "PECHO", 4, "5.5.6.6"));
        } else if (w === 1 && d === 1 && e === 1) {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject("Remo con barra", "ESPALDA", 3, "8"));
        } else {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject());
        }
      }
    }
  }
  saveToStorage(true);
}

function createExerciseObject(nombre = "", grupo = "", series = "", reps = "", peso = "") {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
    nombre,
    grupo,
    series,
    reps,
    peso
  };
}


function generateRoutineText() {

  let text = "ðŸ‹ï¸ Rutina Gym\n\n";

  const semanas = state.rutina.semanas;

  Object.keys(semanas).forEach(w => {

    text += "SEMANA " + w + "\n";

    const dias = semanas[w].dias;

    Object.keys(dias).forEach(d => {

      text += "\nDÃ­a " + d + "\n";

      dias[d].ejercicios.forEach(ex => {

        if (!ex.nombre) return;

        text += "â€¢ " + ex.nombre;

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

  const tabsContainer = document.getElementById('week-tabs');

  tabsContainer.innerHTML = '';

  const semanas = Object.keys(state.rutina.semanas);

  semanas.forEach(w => {

    const btn = document.createElement('button');

    // 1. Asignamos la clase y el estado activo original (fundamental para CSS)
    btn.className = `tab-btn ${state.currentWeek == w ? 'active' : ''}`;

    // 2. Insertamos el HTML con el nombre y la cruz roja
    btn.innerHTML = `SEMANA ${w} <span class="delete-week" onclick="deleteWeek(${w}, event)" title="Eliminar semana">âœ–</span>`;

    // 3. Abrimos correctamente el evento click para cambiar de pestaÃ±a
    btn.onclick = () => {

      state.currentWeek = parseInt(w);

      renderTabs();

      renderApp();

      scrollActiveWeekIntoView();

    }; // AquÃ­ cierra el onclick correctamente

    tabsContainer.appendChild(btn);


  });

  scrollActiveWeekIntoView();

}

function scrollActiveWeekIntoView() {

  const container = document.getElementById('week-tabs');

  const active = container.querySelector('.tab-btn.active');

  if (!active) return;

  active.scrollIntoView({
    behavior: 'smooth',
    inline: 'center',
    block: 'nearest'
  });

}


function renderApp() {

  const container = document.getElementById('days-accordion');

  const weekLabel = document.getElementById('current-week-label');

  const weekData = state.rutina.semanas[state.currentWeek];

  weekLabel.textContent = `Semana ${state.currentWeek}`;

  container.innerHTML = '';

  Object.keys(weekData.dias).forEach(dayId => {

    const dia = weekData.dias[dayId];

    const dayCard = document.createElement('div');

    dayCard.className = 'day-card';

    // guardar quÃ© dÃ­a es en el DOM
    dayCard.dataset.day = dayId;

    // no abrir siempre el dÃ­a 1
    if (state.openDay == dayId) {
      dayCard.classList.add('open');
    }

    dayCard.innerHTML = `
            <div class="day-header">
                <h3>DÃ­a ${dayId}</h3>
                <div style="display:flex; align-items:center; gap:16px;">
                    <button class="delete-day" type="button" onclick="deleteDay(${dayId}, event)">âœ–</button>
                    <span class="arrow">â–¼</span>
                </div>
            </div>


            <div class="day-content" id="day-content-${dayId}">
            </div>

            <button class="btn-add-ex" onclick="addExerciseField(${dayId})">+ Agregar Ejercicio</button>
        `;

    const contentContainer = dayCard.querySelector('.day-content');

    dia.ejercicios.forEach((ex, idx) => {
      contentContainer.appendChild(createExerciseRow(dayId, idx, ex));
    });

    dayCard.querySelector('.day-header').onclick = () => {

      document.querySelectorAll('.day-card').forEach(c => {
        if (c !== dayCard) c.classList.remove('open');
      });

      dayCard.classList.toggle('open');
      state.openDay = dayId;

      if (dayCard.classList.contains('open')) {
        dayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

    };

    container.appendChild(dayCard);

  });

}




function createExerciseRow(dayId, index, exercise) {

  const row = document.createElement('div');

  row.className = 'exercise-row';
  row.dataset.day = dayId;      // identifica el dÃ­a
  row.dataset.index = index;    // identifica el ejercicio dentro del dÃ­a

  const finalCatalog = getFinalCatalog();

  let optionsHtml = `
    <option value="">Seleccionar ejercicio...</option>
    <option value="__ADD_SECTION__">+ Crear secciÃ³n...</option>
    <option value="__ADD_EXERCISE__">+ Crear ejercicio...</option>
`;

  for (const [grupo, items] of Object.entries(finalCatalog)) {

    optionsHtml += `<optgroup label="${grupo}">`;

    items.forEach(item => {

      const selected = (exercise.nombre === item) ? 'selected' : '';

      optionsHtml += `<option value="${item}" ${selected}>${item}</option>`;

    });

    optionsHtml += `</optgroup>`;

  }

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
            âœ–
        </button>


        <!-- ===================================================== -->
        <!-- SELECTOR DE EJERCICIO                                 -->
        <!-- ===================================================== -->

        <div class="ex-title-container">
            <select class="ex-select" onchange="handleExerciseSelect(${dayId}, ${index}, this)">
                ${optionsHtml}
            </select>
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




window.handleExerciseSelect = (dayId, index, selectEl) => {

  const val = selectEl.value;

  if (val === "__ADD_SECTION__") {

    const ok = addNewSectionFlow();
    selectEl.value = ""; // vuelve a â€œSeleccionarâ€¦â€
    if (ok) renderApp();
    return;

  }

  if (val === "__ADD_EXERCISE__") {

    const created = addNewExerciseFlow();

    selectEl.value = ""; // vuelve a â€œSeleccionarâ€¦â€

    if (created) {
      renderApp();
    }

    return;

  }

  // SelecciÃ³n normal
  updateEx(dayId, index, "nombre", selectEl);

};








function addNewSectionFlow() {

  let section = prompt("Nombre de la secciÃ³n nueva (ej: PANTORRILLAS):");

  if (!section) return false;

  section = section.trim();

  if (!section) return false;

  section = section.toUpperCase();

  const userCatalog = loadUserCatalog();

  if (userCatalog[section]) {
    alert("Esa secciÃ³n ya existe.");
    return false;
  }

  userCatalog[section] = [];

  saveUserCatalog(userCatalog);

  alert("SecciÃ³n creada: " + section);

  return true;

}

function addNewExerciseFlow() {

  let exName = prompt("Nombre del ejercicio (ej: Buen dÃ­a con barra):");

  if (!exName) return false;

  exName = exName.trim();

  if (!exName) return false;

  // Elegir secciÃ³n
  const finalCatalog = getFinalCatalog();
  const sections = Object.keys(finalCatalog);

  let section = prompt(
    "Â¿En quÃ© secciÃ³n va?\n\n" +
    "Ejemplos: " + sections.slice(0, 6).join(", ") + "\n\n" +
    "EscribÃ­ el nombre exacto o uno nuevo (ej: PANTORRILLAS):"
  );

  if (!section) return false;

  section = section.trim();

  if (!section) return false;

  section = section.toUpperCase();

  // Guardar en catÃ¡logo de usuario
  const userCatalog = loadUserCatalog();

  if (!userCatalog[section]) {
    userCatalog[section] = [];
  }

  // Evitar duplicados
  const alreadyExistsInFinal = (finalCatalog[section] || []).includes(exName);
  const alreadyExistsInUser = userCatalog[section].includes(exName);

  if (alreadyExistsInFinal || alreadyExistsInUser) {
    alert("Ese ejercicio ya existe en esa secciÃ³n.");
    return false;
  }

  userCatalog[section].push(exName);

  saveUserCatalog(userCatalog);

  alert("Ejercicio agregado en " + section + ":\n" + exName);

  return true;

}








// --- ACTIONS ---
window.updateEx = (dayId, idx, field, el) => {

  const value = el.value;
  const exercise = state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios[idx];

  if (field === 'nombre') {

    exercise.nombre = value;
    const opt = el.options[el.selectedIndex];
    exercise.grupo = opt.parentElement.label || "";

  } else {

    if (field === 'peso') {

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

  state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios.push(createExerciseObject());

  renderApp();

  debouncedSave();

  setTimeout(() => {

    const content = document.getElementById(`day-content-${dayId}`);

    if (!content) return;

    const rows = content.querySelectorAll('.exercise-row');

    if (rows.length === 0) return;

    rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });

  }, 50);

};



// --- DATA PERSISTENCE ---
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToStorage(true), SAVE_DEBOUNCE_MS);
}

function saveToStorage(showTime = false) {
  state.rutina.meta.updatedAt = new Date().toISOString();
  localStorage.setItem('gym_rutina_v1', JSON.stringify(state.rutina));

  if (showTime) {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    document.getElementById('last-saved').textContent = `Guardado: ${timeStr}`;
  }
}

function loadFromStorage() {
  const data = localStorage.getItem('gym_rutina_v1');
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


  document.getElementById('btn-share-wa').onclick = () => {
    generarPDFRutina();
  };

  document.getElementById('btn-reset-week').onclick = () => {
    if (!confirm("Â¿Seguro que querÃ©s reiniciar los ejercicios de esta semana?")) return;
    const dias = state.rutina.semanas[state.currentWeek].dias;
    Object.keys(dias).forEach(dia => {
      dias[dia].ejercicios.forEach(ex => {
        ex.series = "";
        ex.reps = "";
        ex.peso = "";
      });
    });
    renderApp();
    saveToStorage(true);
  };

  document.getElementById('btn-duplicate-week').onclick = () => {

    const semanaActual = state.currentWeek;
    const siguienteSemana = semanaActual + 1;

    if (!state.rutina.semanas[siguienteSemana]) {
      state.rutina.semanas[siguienteSemana] = { dias: {} };
    }

    const diasActuales = state.rutina.semanas[semanaActual].dias;

    const nuevosDias = {};

    Object.keys(diasActuales).forEach(dia => {

      nuevosDias[dia] = {
        ejercicios: diasActuales[dia].ejercicios.map(ex => {

          return {
            id: crypto.randomUUID(),
            nombre: ex.nombre,
            grupo: ex.grupo,
            series: ex.series,
            reps: ex.reps,
            peso: ""
          };

        })
      };

    });

    state.rutina.semanas[siguienteSemana].dias = nuevosDias;

    alert("Rutina duplicada a Semana " + siguienteSemana);

    renderTabs();
    saveToStorage(true);

  };

  document.getElementById('btn-add-day').onclick = () => {

    const dias = state.rutina.semanas[state.currentWeek].dias;

    const nuevoDia = Object.keys(dias).length + 1;

    dias[nuevoDia] = {
      ejercicios: Array(DEFAULT_EX_PER_DAY).fill(0).map(() => createExerciseObject())
    };

    renderApp();
    saveToStorage(true);

  };

  /* ----------- NUEVO BLOQUE: AGREGAR SEMANA ----------- */

  document.getElementById('btn-add-week').onclick = () => {

    const semanas = state.rutina.semanas;

    const nuevaSemana = Object.keys(semanas).length + 1;

    const diasBase = state.rutina.semanas[state.currentWeek].dias;

    const nuevosDias = {};

    Object.keys(diasBase).forEach(dia => {

      nuevosDias[dia] = {
        ejercicios: diasBase[dia].ejercicios.map(() => createExerciseObject())
      };

    });

    semanas[nuevaSemana] = { dias: nuevosDias };

    state.currentWeek = nuevaSemana;

    renderTabs();
    renderApp();
    saveToStorage(true);

  };

  /* ---------------------------------------------------- */


}

function calculateMaxWeight(pesoTexto) {

  if (!pesoTexto) return "";

  const numeros = pesoTexto
    .replace(/,/g, " ")
    .replace(/\//g, " ")
    .split(" ")
    .map(n => parseFloat(n))
    .filter(n => !isNaN(n));

  if (numeros.length === 0) return "";

  const max = Math.max(...numeros);

  return "mÃ¡x: " + max + " kg";
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

    // cerrar modal SOLO si fue abierto por bloqueo automÃ¡tico
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
      btnPlan.innerText = "ðŸ’Ž Activar PRO";
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
      btnPlan.innerText = "ðŸ’Ž Activar PRO";
      btnPlan.style.display = "inline-block";
    }

    bloquearApp();
    return;
  }

  if (plan === "pro") {
    el.innerText = diff + " dÃ­as restantes";
    el.style.color = "#0a8f4b";

    if (btnPlan) {
      btnPlan.innerText = "ðŸ’Ž Plan PRO activo";
      btnPlan.style.display = "inline-block";
    }

    desbloquearApp();
    return;
  }

  desbloquearApp();

  if (diff <= 3) {
    el.innerText = "âš  " + diff + " dÃ­as restantes";
    el.style.color = "#d11";
  } else {
    el.innerText = diff + " dÃ­as restantes";
    el.style.color = "#444";
  }

  if (btnPlan) {
    btnPlan.innerText = "ðŸ’Ž Activar PRO";
    btnPlan.style.display = "inline-block";
  }

}




// ---- BOTON PLAN PRO ----
document.addEventListener("DOMContentLoaded", function () {

  const btnPlan = document.getElementById("btn-plan");
  const btnCerrar = document.getElementById("btn-cerrar-plan");

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
   BOTÃ“N: "YA TRANSFERÃ"
   ---------------------------------------------------------
   Esta funciÃ³n se ejecuta cuando el usuario confirma que
   realizÃ³ la transferencia para activar el plan PRO.

   Flujo completo:
   1) Obtiene telÃ©fono del usuario guardado en localStorage
   2) Obtiene el alias desde donde el usuario transfiriÃ³
   3) EnvÃ­a la solicitud a Apps Script (action=solicitarPago)
   4) Cierra el modal de pago
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-transferido").onclick = async () => {

    /* -------------------------------------------------------
       1) OBTENER DATOS DEL USUARIO
       ------------------------------------------------------- */

    // usuario actual guardado al iniciar sesiÃ³n
    const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "{}");
    const telefono = usuarioActual.telefono || localStorage.getItem("telefono");

    // alias que el usuario escribiÃ³ en el campo del modal
    const aliasInput = document.getElementById("alias-cliente");
    const aliasCliente = aliasInput ? aliasInput.value.trim() : "";
    showPlanMessage("");


    /* -------------------------------------------------------
       2) VALIDACIONES BÃSICAS
       ------------------------------------------------------- */

    // si por algÃºn motivo no existe el telÃ©fono
    if (!telefono) {
      showPlanMessage("Error: usuario no identificado", "error");
      return;
    }

    // si el usuario no escribiÃ³ el alias desde donde pagÃ³
    if (!aliasCliente) {
      showPlanMessage("Por favor escribÃ­ el alias desde donde hiciste la transferencia", "error");
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
        fechaSolicitudPago: new Date().toISOString()
      });

      if (data?.ok === true) {
        showPlanMessage("Solicitud enviada correctamente. Revisaremos el pago y activaremos tu cuenta.");
        if (aliasInput) aliasInput.value = "";

        setTimeout(() => {
          const modal = document.getElementById("plan-modal");
          if (modal) modal.style.display = "none";
          showPlanMessage("");
        }, 2000);

        return;
      }

      showPlanMessage(data?.message || data?.error || "No se pudo registrar la solicitud", "error");

    }


    /* -------------------------------------------------------
        4) ERROR DE CONEXIÃ“N O EXCEPCIÃ“N
       ------------------------------------------------------- */

    catch (err) {

      console.error(err);

      showPlanMessage(err?.message || "Error de conexiÃ³n", "error");

    }

  };
});




// despuÃ©s del login exitoso



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

  } catch (err) {

    console.error("Error sync usuario:", err);

    // si falla el servidor seguimos con el usuario guardado localmente
    actualizarDiasHeaderDesdeUsuario();

  }

}























function generarPDFRutina() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const semanas = state.rutina.semanas;
  const semKeys = Object.keys(semanas).sort((a, b) => a - b);

  const chunks = [];
  for (let i = 0; i < semKeys.length; i += 4) {
    chunks.push(semKeys.slice(i, i + 4));
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  //espacio entre â€œDÃ­aâ€ y la primera tabla estÃ¡ determinado por una sola variable: startX.
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
      //etiqueta del dÃ­a
      // doc.text("DÃ­a " + dia, 10, startY + 7); el texto estÃ¡ en 10 mm, dejando 15 mm de espacio.      
      // probar doc.text("DÃ­a " + dia, 12, startY + 7); mas chico mueve "dia" mas a la izquierda
      doc.text("DÃ­a " + dia, 8, startY + 7);

      let maxEjercicios = 1;
      chunk.forEach(semana => {
        const ejercicios = semanas[semana].dias[dia].ejercicios;
        if (ejercicios && ejercicios.length > maxEjercicios) {
          maxEjercicios = ejercicios.length;
        }
      });

      chunk.forEach((semana, index) => {
        const ejercicios = semanas[semana].dias[dia].ejercicios;

        let tabla = ejercicios.map(e => [
          e.nombre || "",
          e.series || "",
          e.reps || "",
          e.peso || ""
        ]);

        while (tabla.length < maxEjercicios) {
          tabla.push(["", "", "", ""]);
        }

        const tableX = startX + index * weekWidth;

        doc.autoTable({
          startY: startY,
          margin: { left: tableX },
          head: [['Ejercicio', 'S', 'R', 'Kg']],
          body: tabla,
          theme: 'grid',
          tableWidth: weekWidth,
          styles: {
            fontSize: 7,
            cellPadding: 0.5,
            valign: 'middle',
            overflow: 'visible'
          },
          columnStyles: {
            0: { cellWidth: colEjercicio },
            1: { cellWidth: colS, halign: 'center' },
            2: { cellWidth: colR, halign: 'center' },
            3: { cellWidth: colKg, halign: 'center' }
          }
        });

        if (doc.lastAutoTable.finalY > maxFinalY) {
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

  doc.save("rutina_gym.pdf");
}











/* ================================================= */
/* ELIMINAR EJERCICIO                                */
/* ================================================= */

function deleteExercise(dayId, index, btn) {

  if (!confirm("Eliminar ejercicio?")) return;

  const semana = state.rutina.semanas[state.currentWeek];
  const dia = semana.dias[dayId];

  // eliminar del estado
  dia.ejercicios.splice(index, 1);

  // guardar cambios
  saveToStorage(true);

  // eliminar solo la fila del DOM
  const row = btn.closest('.exercise-row');
  if (row) row.remove();

}


/* ================================================= */
/* ELIMINAR DIA                                */
/* ================================================= */

window.deleteDay = (dayId, event) => {
  // Evitamos que al hacer clic en la X se expanda/contraiga el acordeÃ³n
  if (event) event.stopPropagation();
  if (!confirm("Â¿Eliminar el DÃ­a " + dayId + " por completo?")) return;

  const dias = state.rutina.semanas[state.currentWeek].dias;

  // 1. Elimina el dÃ­a del objeto usando la key (dayId) real
  delete dias[dayId];

  // 2. Si el dÃ­a eliminado era el que estaba abierto, limpiamos el estado
  // y tratamos de abrir otro dÃ­a vÃ¡lido para que no quede la pantalla vacÃ­a
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
    alert("No podÃ©s eliminar la Ãºnica semana disponible.");
    return;
  }

  if (!confirm("Â¿Eliminar la SEMANA " + weekId + " por completo?")) return;

  // 1. Eliminar la semana del objeto global
  delete semanas[weekId];

  // 2. Si borramos la semana que estÃ¡bamos mirando, saltamos a la primera que haya quedado
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
};













/* ========================================================= */
/* MÃ“DULO CONTROL DE PESO CORPORAL                           */
/* ========================================================= */

const WEIGHT_STORAGE_KEY = 'gym_weight_log_v1';
let weightLog = [];
let isWeightModuleInitialized = false; // <-- GUARD PARA EVITAR DUPLICACIÃ“N

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








/* ========================================================= */
/* MENÃš PRINCIPAL NAVEGACIÃ“N                                 */
/* ========================================================= */
function initMainMenu() {
  const btnMenu = document.getElementById('btn-main-menu');
  const overlay = document.getElementById('main-menu-overlay');
  const btnClose = document.getElementById('btn-close-menu');
  const btnProgress = document.getElementById('btn-progress-module');
  const btnWeight = document.getElementById('btn-weight-module');
  if (btnMenu && overlay && btnClose) {
    // Abrir menÃº principal
    btnMenu.addEventListener('click', () => {
      overlay.style.display = 'flex';
    });
    // Cerrar menÃº con la cruz
    btnClose.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    // Cerrar si tocan fuera del menÃº
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
    // Cerrar menÃº si pulsan en "Peso Corporal" (para dejar que actÃºe su propio evento)
    if (btnWeight) {
      btnWeight.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }
  }
}











function initWeightModule() {
  // Si ya se agregaron los listeners previamente, abortamos silenciosamente
  if (isWeightModuleInitialized) return;

  loadWeightLog();

  // Asignar fecha de hoy al input por defecto
  const dateInput = document.getElementById('weight-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const btnOpen = document.getElementById('btn-weight-module');
  const btnClose = document.getElementById('btn-close-weight');
  const appContainer = document.getElementById('app-container');
  const weightContainer = document.getElementById('weight-container');

  // Transiciones de vistas (se registran UNA SOLA VEZ)
  if (btnOpen && btnClose && appContainer && weightContainer) {
    btnOpen.addEventListener('click', () => {
      appContainer.style.display = 'none';
      weightContainer.style.display = 'flex';
      renderWeightModule();
    });

    btnClose.addEventListener('click', () => {
      appContainer.style.display = 'block';
      weightContainer.style.display = 'none';
    });
  }

  const btnAdd = document.getElementById('btn-add-weight');
  if (btnAdd) {
    btnAdd.addEventListener('click', addWeightRecord);
  }

  // Sellamos la inicializaciÃ³n para futuras llamadas de init()
  isWeightModuleInitialized = true;
}


function addWeightRecord() {
  const dateInput = document.getElementById('weight-date');
  const valueInput = document.getElementById('weight-value');

  const date = dateInput.value;
  const valueStr = valueInput.value.replace(',', '.'); // Tolerancia a comas
  const value = parseFloat(valueStr);

  if (!date) {
    alert("Por favor, seleccionÃ¡ una fecha.");
    return;
  }
  if (isNaN(value) || value <= 0) {
    alert("Por favor, ingresÃ¡ un peso corporal vÃ¡lido.");
    return;
  }

  // Sobrescribir si hay registro mismo dÃ­a, de lo contrario agregar
  const existingIndex = weightLog.findIndex(w => w.date === date);
  if (existingIndex >= 0) {
    weightLog[existingIndex].weight = value;
  } else {
    weightLog.push({ date: date, weight: value });
  }

  saveWeightLog();
  renderWeightModule();

  valueInput.value = ""; // Limpiar input post-guardado
}

window.deleteWeightRecord = function (date) {
  if (!confirm("Â¿Borrar este registro?")) return;
  weightLog = weightLog.filter(w => w.date !== date);
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
  const tbody = document.getElementById('weight-table-body');
  if (!tbody) return;

  tbody.innerHTML = "";

  // Invertimos clonando el log para mostrar del mÃ¡s nuevo al mÃ¡s antiguo
  const reversedLog = [...weightLog].reverse();

  if (reversedLog.length === 0) {
    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding: 24px 0; color: #8e8e93;'>AÃºn no hay registros cargados</td></tr>";
    return;
  }

  reversedLog.forEach(record => {
    const parts = record.date.split("-");
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>${formattedDate}</td>
            <td style="color: var(--primary);">${record.weight.toFixed(1)}</td>
            <td>
                <button class="btn-delete-weight" title="Borrar registro" onclick="deleteWeightRecord('${record.date}')">âœ–</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

/* ========================================================= */
/* GRÃFICO DE EVOLUCIÃ“N (Native HTML5 Canvas)                */
/* ========================================================= */
function renderWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Requiere mÃ­nimo 2 puntos para unir una lÃ­nea
  if (weightLog.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AgregÃ¡ al menos 2 registros para ver el grÃ¡fico", width / 2, height / 2);
    return;
  }

  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const weights = weightLog.map(w => w.weight);
  const minW = Math.min(...weights) - 1.5; // Margen dinÃ¡mico inferior
  const maxW = Math.max(...weights) + 1.5; // Margen dinÃ¡mico superior
  const range = maxW - minW;

  // Dibujo de lÃ­neas horizontales base
  ctx.strokeStyle = "#e5e5ea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(width - padding, padding);
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Dibujo de la lÃ­nea de evoluciÃ³n (Azul)
  ctx.strokeStyle = "#007aff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  weightLog.forEach((record, idx) => {
    const x = padding + (idx / (weightLog.length - 1)) * chartW;
    const normalizedY = (record.weight - minW) / range;
    const y = height - padding - (normalizedY * chartH);

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
    const y = height - padding - (normalizedY * chartH);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}



/* ===================================================== */
/* MÃ“DULO: PROGRESO DE EJERCICIOS                        */
/* ===================================================== */

const PROGRESS_STORAGE_KEY = "gym_progress_v1";
let progressData = [];

function initProgressModule() {
  loadProgressData();

  const btnOpen = document.getElementById("btn-progress-module");
  const btnClose = document.getElementById("btn-close-progress");
  const container = document.getElementById("progress-container");

  if (btnOpen && container && btnClose) {
    btnOpen.addEventListener("click", () => {
      // Ocultar menÃº principal si estÃ¡ abierto
      document.getElementById("main-menu-overlay").style.display = "none";

      // Mostrar contenedor
      container.style.display = "flex";

      // Setear fecha actual por defecto en el form
      const hoy = new Date();
      // Formato YYYY-MM-DD local
      const offset = hoy.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(hoy - offset)).toISOString().split('T')[0];
      document.getElementById('progress-date').value = localISOTime;

      loadExerciseSelects();
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
    alert("CompletÃ¡ todos los campos.");
    return;
  }

  const newRecord = {
    id: Date.now() + Math.random().toString(36),
    date: dateInput,
    exercise: exInput,
    weight: parseFloat(valInput)
  };

  progressData.push(newRecord);
  saveProgressData();

  // Limpiar solo peso para facilitar carga masiva
  document.getElementById("progress-value").value = "";

  // Refrescar selector de filtrado por si es un ejercicio nuevo
  const filterSelect = document.getElementById("progress-filter-select");
  const prevFilter = filterSelect.value;
  loadExerciseSelects();
  filterSelect.value = exInput; // Autofiltrar por el recien agregado (muy Ãºtil)

  renderProgressUI();
}

window.deleteProgressRecord = (id) => {
  if (confirm("Â¿Eliminar este registro?")) {
    progressData = progressData.filter(r => r.id !== id);
    saveProgressData();

    const filterSelect = document.getElementById("progress-filter-select");
    const prevFilter = filterSelect.value;
    loadExerciseSelects();
    filterSelect.value = prevFilter;

    renderProgressUI();
  }
};



/* Carga de ejercicios disponibles en CatÃ¡logo */
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
    items.forEach(item => {
      optionsHtml += `<option value="${item}">${item}</option>`;
    });
    optionsHtml += `</optgroup>`;
  }

  selectForm.innerHTML = optionsHtml;
  selectForm.value = prevFormVal; // Restaurar si habÃ­a algo

  // Para el filtro extraemos solo los que tienen AL MENOS 1 registro
  const ejerciciosConRegistros = [...new Set(progressData.map(r => r.exercise))].sort();

  let filterHtml = '<option value="">Todos los registros</option>';
  ejerciciosConRegistros.forEach(ex => {
    filterHtml += `<option value="${ex}">${ex}</option>`;
  });

  selectFilter.innerHTML = filterHtml;
  selectFilter.value = ejerciciosConRegistros.includes(prevFilterVal) ? prevFilterVal : "";
}


/* Render principal de UI (Tabla + Grafico) */
function renderProgressUI() {
  const tbody = document.getElementById("progress-table-body");
  const filterVal = document.getElementById("progress-filter-select").value;

  // Filtrar
  let filteredData = progressData;
  if (filterVal) {
    filteredData = progressData.filter(r => r.exercise === filterVal);
  }

  // Ordenar descendente (mÃ¡s nuevo arriba) para tabla
  const sortedDesc = [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = "";
  sortedDesc.forEach(record => {
    // Formatear Fecha DD/MM
    const partes = record.date.split("-");
    const labelFecha = partes.length === 3 ? `${partes[2]}/${partes[1]}` : record.date;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labelFecha}</td>
      <td style="font-size: 0.75rem; color:#444;">${record.exercise}</td>
      <td style="color: var(--primary);">${record.weight}</td>
      <td style="text-align:right;">
        <button class="btn-delete-progress" type="button" onclick="deleteProgressRecord('${record.id}')">âœ–</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Renderizar GrÃ¡fica solo con los datos filtrados
  renderProgressChart(filteredData, filterVal);
}



/* Renderizado GrÃ¡fica de Progreso de lÃ­nea Vanilla JS */
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
    ctx.fillText("SeleccionÃ¡ un ejercicio para ver su grÃ¡fica", w / 2, h / 2);
    return;
  }

  if (data.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Faltan datos (2 o +) para graficar", w / 2, h / 2);
    return;
  }

  // Ordenar ascendente para la grÃ¡fica (mÃ¡s viejo a izquierda, nuevo a derecha)
  const sortedAsc = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const pesos = sortedAsc.map(r => r.weight);
  const minW = Math.min(...pesos);
  const maxW = Math.max(...pesos);

  const padY = 25;
  const padX = 25;
  const chartW = w - (padX * 2);
  const chartH = h - (padY * 2);
  let range = maxW - minW;
  if (range === 0) range = 10; // Si todos los pesos son iguales, forzar rango visual

  // Dibujar lÃ­nea principal
  ctx.beginPath();
  ctx.strokeStyle = "var(--primary)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";

  sortedAsc.forEach((pt, i) => {
    const fracX = i / (sortedAsc.length - 1);
    const fracY = (pt.weight - minW) / range;

    const x = padX + (fracX * chartW);
    const y = h - padY - (fracY * chartH);

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

    const x = padX + (fracX * chartW);
    const y = h - padY - (fracY * chartH);

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
// LÃ“GICA MODO TESTER 2 DÃAS (RestricciÃ³n por Frontend)
// =================================================
function verificarModoTester() {
  if (actualizarDiasHeaderDesdeUsuario()) {
    return;
  }

  const TESTER_KEY = 'gym_tester_start_v1';
  const MAX_DAYS = 2; // DÃ­as de prueba
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

  // 2. Verificamos si expirÃ³ la restricciÃ³n local
  if (diffDays >= MAX_DAYS) {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('tester-lock-screen').style.display = 'flex';
  } else {
    document.getElementById('app-container').style.display = 'block';

    // 3. CÃ¡lculo simple en dÃ­as redondeados hacia arriba
    const msRestantes = (MAX_DAYS * MS_PER_DAY) - diffMs;
    const diasRestantes = Math.ceil(msRestantes / MS_PER_DAY);

    const textoDias = diasRestantes > 1
      ? `Faltan ${diasRestantes} dÃ­as para bloqueo`
      : `Falta 1 dÃ­a para bloqueo`;

    // 4. Actualizamos exclusivamente el span manteniendo intacto todo lo del PRO
    const spanDias = document.getElementById('dias-restantes');
    if (spanDias) {
      spanDias.innerHTML = `<span style="color:#ff3b30;">${textoDias}</span>`;
    }
  }
}

