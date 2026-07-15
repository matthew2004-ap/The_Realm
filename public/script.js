const API = "/api";

const state = {
  user: null,
  token: localStorage.getItem("realm-token"),
  arrivals: [],
  lost: [],
  maintenance: [],
  gateDates: [],
  activities: [],
  stats: {},
  arrivalFilter: "all",
  lostFilter: "all",
  maintenanceFilter: "all",
  lostSearch: "",
  authMode: "login",
};

const elements = {
  authBar: document.getElementById("authBar"),
  authDialog: document.getElementById("authDialog"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authSubmit: document.getElementById("authSubmit"),
  authFeedback: document.getElementById("authFeedback"),
  loginBtn: document.getElementById("loginBtn"),
  closeAuth: document.getElementById("closeAuth"),
  arrivalList: document.getElementById("arrivalList"),
  lostList: document.getElementById("lostList"),
  maintenanceList: document.getElementById("maintenanceList"),
  gateDatesList: document.getElementById("gateDatesList"),
  activitiesList: document.getElementById("activitiesList"),
  arrivalForm: document.getElementById("arrivalForm"),
  lostForm: document.getElementById("lostForm"),
  maintenanceForm: document.getElementById("maintenanceForm"),
  gateForm: document.getElementById("gateForm"),
  arrivalFeedback: document.getElementById("arrivalFeedback"),
  lostFeedback: document.getElementById("lostFeedback"),
  maintenanceFeedback: document.getElementById("maintenanceFeedback"),
  gateFeedback: document.getElementById("gateFeedback"),
  lostSearch: document.getElementById("lostSearch"),
  hostelField: document.getElementById("hostelField"),
  welcomeMessage: document.getElementById("welcome-message"),
  welcomeText: document.getElementById("welcome-text"),
};

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value) {
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function setFeedback(element, message, kind = "neutral") {
  if (!element) return;
  element.textContent = message;
  element.style.color = kind === "good" ? "var(--success)" : kind === "bad" ? "var(--danger)" : "var(--muted)";
}

function emptyState(message) {
  return `<article class="record-card"><p class="record-meta">${escapeHtml(message)}</p></article>`;
}

function isCouncil() {
  return state.user?.role === "council";
}

function isStudentPortal() {
  return window.location.pathname.includes('student-portal');
}

function isCouncilPortal() {
  return window.location.pathname.includes('council-portal');
}

function isLandingPage() {
  return !isStudentPortal() && !isCouncilPortal();
}

function requireAuth(action) {
  if (!state.user) {
    if (elements.authDialog) openAuth("login");
    if (elements.authFeedback) setFeedback(elements.authFeedback, `Sign in to ${action}.`, "bad");
    return false;
  }
  return true;
}

function updateAuthUI() {
  if (!elements.authBar) return;

  if (state.user) {
    elements.authBar.innerHTML = `
      <div class="navbar-user">
        <span class="navbar-user-name">${escapeHtml(state.user.name)}</span>
        <span class="tag ${isCouncil() ? "tag-accent" : "tag-warning"}">${isCouncil() ? "Council" : "Student"}</span>
      </div>
      <button class="button button-secondary button-sm" id="logoutBtn" type="button">Sign out</button>
    `;
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
  } else {
    if (isStudentPortal() || isCouncilPortal()) {
      elements.authBar.innerHTML = `<button class="button button-secondary button-sm" id="loginBtn" type="button">Sign in</button>`;
      document.getElementById("loginBtn")?.addEventListener("click", () => openAuth("login"));
    }
  }

  if (elements.authDialog) {
    document.querySelectorAll(".council-only")?.forEach((el) => {
      el.classList.toggle("hidden", !isCouncil());
    });
  }

  if (state.user && elements.arrivalForm) {
    const studentNameInput = elements.arrivalForm.querySelector('[name="studentName"]');
    if (studentNameInput) studentNameInput.value = state.user.name;

    const regNoInput = elements.arrivalForm.querySelector('[name="regNo"]');
    if (regNoInput) regNoInput.value = state.user.reg_no;

    if (state.user.phone) {
      const phoneInput = elements.arrivalForm.querySelector('[name="phone"]');
      if (phoneInput) phoneInput.value = state.user.phone;
    }

    if (state.user.hostel) {
      const hostelInput = elements.arrivalForm.querySelector('[name="hostel"]');
      if (hostelInput) hostelInput.value = state.user.hostel;
    }

    if (elements.lostForm) {
      const contactInput = elements.lostForm.querySelector('[name="contact"]');
      if (contactInput) contactInput.value = state.user.phone || state.user.email;
    }
  }
}

function openAuth(mode = "login") {
  state.authMode = mode;
  if (elements.authDialog) {
    elements.authDialog.showModal();
    setAuthMode(mode);
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  if (elements.authTitle) elements.authTitle.textContent = isRegister ? "Create your account" : "Sign in";
  if (elements.authSubmit) elements.authSubmit.textContent = isRegister ? "Create account" : "Sign in";

  document.querySelectorAll("[data-auth-tab]")?.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.authTab === mode);
  });

  document.querySelectorAll(".register-only")?.forEach((el) => {
    el.classList.toggle("hidden", !isRegister);
  });

  if (elements.authFeedback) setFeedback(elements.authFeedback, "");
}

function showWelcomeMessage(message) {
  if (elements.welcomeMessage && elements.welcomeText) {
    elements.welcomeText.textContent = message;
    elements.welcomeMessage.style.display = "block";
  }
}

async function login(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("realm-token", data.token);

  // Redirect to appropriate portal
  if (data.user.role === "council" && !isCouncilPortal()) {
    window.location.href = "/council-portal.html";
    return;
  } else if (data.user.role === "student" && !isStudentPortal()) {
    window.location.href = "/student-portal.html";
    return;
  }

  elements.authDialog?.close();
  await loadAll();
  updateAuthUI();
  renderApp();
  showWelcomeMessage(`Hello ${data.user.name}! Welcome back! 👋`);
}

async function register(payload) {
  const data = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...payload, role: "student" }),
  });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("realm-token", data.token);
  elements.authDialog?.close();

  if (!isStudentPortal()) {
    window.location.href = "/student-portal.html";
    return;
  }

  await loadAll();
  updateAuthUI();
  renderApp();
  if (data.welcomeMessage) {
    showWelcomeMessage(data.welcomeMessage);
  } else {
    showWelcomeMessage(`Hello ${data.user.name}! Welcome! 👋`);
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("realm-token");
  state.arrivals = [];
  state.lost = [];
  state.maintenance = [];
  window.location.href = "/";
}

async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await api("/auth/me");
    state.user = data.user;

    // Auto-redirect to correct portal
    if (isLandingPage()) {
      if (data.user.role === "council") {
        window.location.href = "/council-portal.html";
      } else {
        window.location.href = "/student-portal.html";
      }
    } else if (data.user.role === "council" && isStudentPortal()) {
      window.location.href = "/council-portal.html";
    } else if (data.user.role === "student" && isCouncilPortal()) {
      window.location.href = "/student-portal.html";
    }
  } catch {
    state.token = null;
    localStorage.removeItem("realm-token");
  }
}

async function loadAll() {
  if (isLandingPage()) {
    const gate = await api("/gate-dates");
    state.gateDates = gate.gateDates;
    return;
  }

  if (!state.user) {
    await loadPublicData();
    return;
  }

  if (state.user?.role === "council") {
    const [stats, arrivals, lost, maintenance, gate, activities] = await Promise.all([
      api("/stats"),
      api(`/arrivals?filter=${state.arrivalFilter}`),
      api(`/lost?filter=${state.lostFilter}&search=${encodeURIComponent(state.lostSearch)}`),
      api(`/maintenance?filter=${state.maintenanceFilter}`),
      api("/gate-dates"),
      api("/activities"),
    ]);

    state.stats = stats;
    state.arrivals = arrivals.arrivals;
    state.lost = lost.items;
    state.maintenance = maintenance.issues;
    state.gateDates = gate.gateDates;
    state.activities = activities.activities || [];
  } else {
    const [stats, arrivals, lost, maintenance, gate] = await Promise.all([
      api("/stats"),
      api(`/arrivals?filter=${state.arrivalFilter}`),
      api(`/lost?filter=${state.lostFilter}&search=${encodeURIComponent(state.lostSearch)}`),
      api(`/maintenance?filter=${state.maintenanceFilter}`),
      api("/gate-dates"),
    ]);

    state.stats = stats;
    state.arrivals = arrivals.arrivals;
    state.lost = lost.items;
    state.maintenance = maintenance.issues;
    state.gateDates = gate.gateDates;
  }
}

async function loadPublicData() {
  const gate = await api("/gate-dates");
  state.gateDates = gate.gateDates;
  state.stats = { incomingGoods: 0, readyForPickup: 0, urgentHostel: 0, scheduledArrivals: 0, deliveryRequests: 0, openReports: 0 };
}

function renderApp() {
  if (isLandingPage()) {
    renderGateDates();
    return;
  }

  renderSummary();
  renderGateDates();
  renderArrivals();
  renderLostItems();
  renderMaintenance();
  renderActivities();
}

function renderSummary() {
  const s = state.stats;
  const heroIncoming = document.getElementById("heroIncoming");
  const heroReady = document.getElementById("heroReady");
  const heroUrgent = document.getElementById("heroUrgent");
  const statArrivals = document.getElementById("statArrivals");
  const statPickup = document.getElementById("statPickup");
  const statDelivery = document.getElementById("statDelivery");
  const statReports = document.getElementById("statReports");

  if (heroIncoming) heroIncoming.textContent = s.incomingGoods ?? 0;
  if (heroReady) heroReady.textContent = s.readyForPickup ?? 0;
  if (heroUrgent) heroUrgent.textContent = s.urgentHostel ?? 0;
  if (statArrivals) statArrivals.textContent = s.scheduledArrivals ?? 0;
  if (statPickup) statPickup.textContent = s.readyForPickup ?? 0;
  if (statDelivery) statDelivery.textContent = s.deliveryRequests ?? 0;
  if (statReports) statReports.textContent = s.openReports ?? 0;

  const firstGate = state.gateDates[0];
  const gateWindowTitle = document.getElementById("gateWindowTitle");
  const gateWindowTime = document.getElementById("gateWindowTime");
  if (gateWindowTitle) {
    gateWindowTitle.textContent = firstGate
      ? `${firstGate.day_name}, ${state.gateDates.length > 1 ? "+" + (state.gateDates.length - 1) + " more" : "weekly"}`
      : "No gate dates yet";
  }
  if (gateWindowTime) {
    gateWindowTime.textContent = firstGate
      ? `${formatTime(firstGate.start_time)} - ${formatTime(firstGate.end_time)}`
      : "Council can add official windows";
  }
}

function renderGateDates() {
  if (!elements.gateDatesList) return;

  if (!state.gateDates.length) {
    elements.gateDatesList.innerHTML = emptyState("No official gate dates have been set yet.");
    return;
  }

  elements.gateDatesList.innerHTML = state.gateDates
    .map(
      (gate) => `
        <article class="timeline-card">
          <span>${escapeHtml(gate.day_name)}</span>
          <strong>${escapeHtml(gate.title)}</strong>
          <p>${escapeHtml(gate.description)}</p>
          <div class="tag-row">
            <span class="tag">${formatTime(gate.start_time)} - ${formatTime(gate.end_time)}</span>
          </div>
          ${isCouncil()
          ? `<div class="record-actions">
                  <button class="text-button" type="button" data-delete-gate="${escapeHtml(gate.id)}">Remove</button>
                </div>`
          : ""
        }
        </article>
      `
    )
    .join("");
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderActivities() {
  if (!elements.activitiesList) return;

  if (!state.user || !isCouncil()) return;

  if (!state.activities.length) {
    elements.activitiesList.innerHTML = emptyState("No recent activity yet.");
    return;
  }

  elements.activitiesList.innerHTML = state.activities
    .map((activity) => `
      <article class="record-card">
        <div class="record-top">
          <div>
            <h3>${escapeHtml(activity.user_name)}</h3>
            <p class="record-meta">${escapeHtml(activity.description)}</p>
          </div>
          <span class="tag tag-accent">${formatDateTime(activity.created_at)}</span>
        </div>
      </article>
    `)
    .join("");
}

function statusLabel(status) {
  const labels = {
    scheduled: "Scheduled",
    arrived: "Arrived at gate",
    ready: "Ready for pickup",
    collected: "Collected",
    delivered: "Delivered",
  };
  return labels[status] || status;
}

function renderArrivals() {
  if (!elements.arrivalList) return;

  if (!state.user) {
    elements.arrivalList.innerHTML = emptyState("Sign in to view and register arrivals.");
    return;
  }

  if (!state.arrivals.length) {
    elements.arrivalList.innerHTML = emptyState("No arrivals match the current filter.");
    return;
  }

  elements.arrivalList.innerHTML = state.arrivals
    .map((item) => {
      const fee =
        item.fulfillment === "delivery" ? `NGN ${item.delivery_fee}` : "Free pickup";
      const days = daysUntil(item.eta);

      return `
        <article class="record-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.student_name)} - ${escapeHtml(item.item_name)}</h3>
              <p class="record-meta">
                ${escapeHtml(item.reg_no)} - ${formatDate(item.eta)} - Qty ${escapeHtml(item.quantity)}
              </p>
            </div>
            <span class="tag ${item.fulfillment === "delivery" ? "tag-accent" : "tag-warning"}">
              ${item.fulfillment === "delivery" ? "Delivery" : "Pickup"}
            </span>
          </div>
          <div class="tag-row">
            <span class="tag">Status: ${statusLabel(item.status)}</span>
            <span class="tag">Contact: ${escapeHtml(item.phone)}</span>
            <span class="tag">Fee: ${fee}</span>
            ${item.hostel
          ? `<span class="tag">Hostel: ${escapeHtml(item.hostel)}</span>`
          : ""
        }
            <span class="tag ${days <= 2 ? "tag-danger" : "tag-accent"}">
              ${days <= 0 ? "Arrives today" : `${days} day(s) away`}
            </span>
          </div>
          <p class="record-meta">${escapeHtml(item.note)}</p>
          ${isCouncil()
          ? `<div class="record-actions">
                  ${item.status === "scheduled" ? `<button class="text-button" type="button" data-arrival-status="${item.id}" data-status="arrived">Mark arrived</button>` : ""}
                  ${["scheduled", "arrived"].includes(item.status) ? `<button class="text-button" type="button" data-arrival-status="${item.id}" data-status="ready">Mark ready</button>` : ""}
                  ${item.status === "ready" && item.fulfillment === "pickup" ? `<button class="text-button" type="button" data-arrival-status="${item.id}" data-status="collected">Mark collected</button>` : ""}
                  ${item.status === "ready" && item.fulfillment === "delivery" ? `<button class="text-button" type="button" data-arrival-status="${item.id}" data-status="delivered">Mark delivered</button>` : ""}
                  <button class="text-button" type="button" data-delete-arrival="${item.id}">Remove</button>
                </div>`
          : ""
        }
        </article>
      `;
    })
    .join("");
}

function renderLostItems() {
  if (!elements.lostList) return;

  if (!state.user) {
    elements.lostList.innerHTML = emptyState("Sign in to browse and report lost items.");
    return;
  }

  if (!state.lost.length) {
    elements.lostList.innerHTML = emptyState("No lost or found items match this search.");
    return;
  }

  elements.lostList.innerHTML = state.lost
    .map((item) => {
      const statusClass =
        item.status === "found" ? "tag-accent" : item.status === "claimed" ? "tag-warning" : "tag-danger";
      const statusText =
        item.status === "found" ? "Found" : item.status === "claimed" ? "Claimed" : "Missing";

      return `
        <article class="record-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.item_name)}</h3>
              <p class="record-meta">${escapeHtml(item.last_seen)} - ${escapeHtml(item.description)}</p>
            </div>
            <span class="tag ${statusClass}">${statusText}</span>
          </div>
          <div class="tag-row">
            <span class="tag">Contact: ${escapeHtml(item.contact)}</span>
            <span class="tag">Proof: ${escapeHtml(item.proof)}</span>
          </div>
          <div class="record-actions">
            ${item.status === "found"
          ? `<button class="text-button" type="button" data-claim-lost="${item.id}">Verify & claim</button>`
          : ""
        }
            ${isCouncil() && item.status === "missing"
          ? `<button class="text-button" type="button" data-mark-found="${item.id}">Mark as found</button>`
          : ""
        }
            ${isCouncil()
          ? `<button class="text-button" type="button" data-delete-lost="${item.id}">Remove</button>`
          : ""
        }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMaintenance() {
  if (!elements.maintenanceList) return;

  if (!state.user) {
    elements.maintenanceList.innerHTML = emptyState("Sign in to view and log hostel issues.");
    return;
  }

  if (!state.maintenance.length) {
    elements.maintenanceList.innerHTML = emptyState("No hostel issues match the current filter.");
    return;
  }

  elements.maintenanceList.innerHTML = state.maintenance
    .map((item) => {
      const priorityClass =
        item.priority === "High" ? "tag-danger" : item.priority === "Medium" ? "tag-warning" : "tag-accent";

      return `
        <article class="record-card">
          <div class="record-top">
            <div>
              <h3>${escapeHtml(item.location)} - ${escapeHtml(item.issue_type)}</h3>
              <p class="record-meta">${escapeHtml(item.area)} - ${escapeHtml(item.details)}</p>
            </div>
            <span class="tag ${priorityClass}">${escapeHtml(item.priority)}</span>
          </div>
          <div class="tag-row">
            <span class="tag">Status: ${escapeHtml(item.status.replace("_", " "))}</span>
            <span class="tag">${escapeHtml(item.issue_type)}</span>
            <span class="tag">${escapeHtml(item.location)}</span>
          </div>
          ${isCouncil()
          ? `<div class="record-actions">
                  ${item.status === "open" ? `<button class="text-button" type="button" data-maint-status="${item.id}" data-status="in_progress">Start work</button>` : ""}
                  ${item.status !== "resolved" ? `<button class="text-button" type="button" data-maint-status="${item.id}" data-status="resolved">Mark resolved</button>` : ""}
                  <button class="text-button" type="button" data-delete-maint="${item.id}">Remove</button>
                </div>`
          : ""
        }
        </article>
      `;
    })
    .join("");
}

async function handleArrivalSubmit(form) {
  if (!requireAuth("register arrivals")) return;

  const data = new FormData(form);
  const fulfillment = data.get("fulfillment");

  try {
    const result = await api("/arrivals", {
      method: "POST",
      body: JSON.stringify({
        studentName: data.get("studentName"),
        regNo: data.get("regNo"),
        itemName: data.get("itemName"),
        quantity: Number(data.get("quantity")),
        eta: data.get("eta"),
        phone: data.get("phone"),
        note: data.get("note"),
        fulfillment,
        hostel: fulfillment === "delivery" ? data.get("hostel") : null,
      }),
    });

    await loadAll();
    renderApp();
    form.reset();
    const pickupRadio = form.querySelector('[name="fulfillment"][value="pickup"]');
    if (pickupRadio) pickupRadio.checked = true;
    if (elements.hostelField) elements.hostelField.classList.add("hidden");
    updateAuthUI();

    if (elements.arrivalFeedback) {
      setFeedback(
        elements.arrivalFeedback,
        `${result.arrival.student_name} has been added. ${fulfillment === "delivery" ? "Delivery charge is ready for review." : "Pickup is queued for the office."
        }`,
        "good"
      );
    }
  } catch (error) {
    if (elements.arrivalFeedback) setFeedback(elements.arrivalFeedback, error.message, "bad");
  }
}

async function handleLostSubmit(form) {
  if (!requireAuth("report lost items")) return;

  const data = new FormData(form);
  try {
    await api("/lost", {
      method: "POST",
      body: JSON.stringify({
        itemName: data.get("itemName"),
        lastSeen: data.get("lastSeen"),
        contact: data.get("contact"),
        proof: data.get("proof"),
        description: data.get("description"),
      }),
    });
    await loadAll();
    renderApp();
    form.reset();
    updateAuthUI();
    if (elements.lostFeedback) setFeedback(elements.lostFeedback, "Missing item published on the board.", "good");
  } catch (error) {
    if (elements.lostFeedback) setFeedback(elements.lostFeedback, error.message, "bad");
  }
}

async function handleMaintenanceSubmit(form) {
  if (!requireAuth("log hostel issues")) return;

  const data = new FormData(form);
  try {
    await api("/maintenance", {
      method: "POST",
      body: JSON.stringify({
        location: data.get("location"),
        issueType: data.get("issueType"),
        area: data.get("area"),
        priority: data.get("priority"),
        details: data.get("details"),
      }),
    });
    await loadAll();
    renderApp();
    form.reset();
    if (elements.maintenanceFeedback) setFeedback(elements.maintenanceFeedback, "Hostel issue logged in the maintenance queue.", "good");
  } catch (error) {
    if (elements.maintenanceFeedback) setFeedback(elements.maintenanceFeedback, error.message, "bad");
  }
}

async function handleGateSubmit(form) {
  if (!requireAuth("manage gate dates")) return;

  const data = new FormData(form);
  try {
    await api("/gate-dates", {
      method: "POST",
      body: JSON.stringify({
        dayName: data.get("dayName"),
        title: data.get("title"),
        description: data.get("description"),
        startTime: data.get("startTime"),
        endTime: data.get("endTime"),
      }),
    });
    await loadAll();
    renderApp();
    form.reset();
    if (elements.gateFeedback) setFeedback(elements.gateFeedback, "Gate date added to the official schedule.", "good");
  } catch (error) {
    if (elements.gateFeedback) setFeedback(elements.gateFeedback, error.message, "bad");
  }
}

function bindEvents() {
  elements.loginBtn?.addEventListener("click", () => openAuth("login"));
  elements.closeAuth?.addEventListener("click", () => elements.authDialog?.close());

  document.querySelectorAll("[data-auth-tab]")?.forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authTab));
  });

  elements.authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(elements.authForm);

    try {
      if (state.authMode === "login") {
        await login(data.get("email"), data.get("password"));
        if (elements.authFeedback) setFeedback(elements.authFeedback, "Welcome back.", "good");
      } else {
        await register({
          name: data.get("name"),
          regNo: data.get("regNo"),
          email: data.get("email"),
          password: data.get("password"),
          hostel: data.get("hostel"),
          phone: data.get("phone"),
        });
        if (elements.authFeedback) setFeedback(elements.authFeedback, "Account created.", "good");
      }
    } catch (error) {
      if (elements.authFeedback) setFeedback(elements.authFeedback, error.message, "bad");
    }
  });

  elements.arrivalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleArrivalSubmit(event.currentTarget);
  });

  elements.lostForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleLostSubmit(event.currentTarget);
  });

  elements.maintenanceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleMaintenanceSubmit(event.currentTarget);
  });

  elements.gateForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleGateSubmit(event.currentTarget);
  });

  elements.arrivalForm?.addEventListener("change", (event) => {
    if (event.target.name === "fulfillment" && elements.hostelField) {
      elements.hostelField.classList.toggle("hidden", event.target.value !== "delivery");
    }
  });

  document.querySelectorAll("[data-filter]")?.forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("[data-filter]")?.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.arrivalFilter = button.dataset.filter;
      if (state.user) {
        const data = await api(`/arrivals?filter=${state.arrivalFilter}`);
        state.arrivals = data.arrivals;
        renderArrivals();
      }
    });
  });

  document.querySelectorAll("[data-lost-filter]")?.forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("[data-lost-filter]")?.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.lostFilter = button.dataset.lostFilter;
      if (state.user) {
        const data = await api(`/lost?filter=${state.lostFilter}&search=${encodeURIComponent(state.lostSearch)}`);
        state.lost = data.items;
        renderLostItems();
      }
    });
  });

  document.querySelectorAll("[data-maint-filter]")?.forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("[data-maint-filter]")?.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.maintenanceFilter = button.dataset.maintFilter;
      if (state.user) {
        const data = await api(`/maintenance?filter=${state.maintenanceFilter}`);
        state.maintenance = data.issues;
        renderMaintenance();
      }
    });
  });

  elements.lostSearch?.addEventListener("input", async (event) => {
    state.lostSearch = event.target.value;
    if (!state.user) return;
    const data = await api(`/lost?filter=${state.lostFilter}&search=${encodeURIComponent(state.lostSearch)}`);
    state.lost = data.items;
    renderLostItems();
  });

  document.body.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    try {
      if (button.dataset.arrivalStatus) {
        await api(`/arrivals/${button.dataset.arrivalStatus}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status }),
        });
        await loadAll();
        renderApp();
        if (elements.arrivalFeedback) setFeedback(elements.arrivalFeedback, "Arrival status updated.", "good");
      }

      if (button.dataset.deleteArrival) {
        await api(`/arrivals/${button.dataset.deleteArrival}`, { method: "DELETE" });
        await loadAll();
        renderApp();
        if (elements.arrivalFeedback) setFeedback(elements.arrivalFeedback, "Arrival removed.", "good");
      }

      if (button.dataset.markFound) {
        await api(`/lost/${button.dataset.markFound}/found`, { method: "PATCH" });
        await loadAll();
        renderApp();
        if (elements.lostFeedback) setFeedback(elements.lostFeedback, "Item marked as found.", "good");
      }

      if (button.dataset.claimLost) {
        const claimProof = prompt("Describe proof of ownership to verify your claim:");
        if (!claimProof?.trim()) return;
        await api(`/lost/${button.dataset.claimLost}/claim`, {
          method: "PATCH",
          body: JSON.stringify({ claimProof }),
        });
        await loadAll();
        renderApp();
        if (elements.lostFeedback) setFeedback(elements.lostFeedback, "Ownership verified. Council will arrange handover.", "good");
      }

      if (button.dataset.deleteLost) {
        await api(`/lost/${button.dataset.deleteLost}`, { method: "DELETE" });
        await loadAll();
        renderApp();
        if (elements.lostFeedback) setFeedback(elements.lostFeedback, "Entry removed.", "good");
      }

      if (button.dataset.maintStatus) {
        await api(`/maintenance/${button.dataset.maintStatus}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status }),
        });
        await loadAll();
        renderApp();
        if (elements.maintenanceFeedback) setFeedback(elements.maintenanceFeedback, "Maintenance status updated.", "good");
      }

      if (button.dataset.deleteMaint) {
        await api(`/maintenance/${button.dataset.deleteMaint}`, { method: "DELETE" });
        await loadAll();
        renderApp();
        if (elements.maintenanceFeedback) setFeedback(elements.maintenanceFeedback, "Issue removed.", "good");
      }

      if (button.dataset.deleteGate) {
        await api(`/gate-dates/${button.dataset.deleteGate}`, { method: "DELETE" });
        await loadAll();
        renderApp();
        if (elements.gateFeedback) setFeedback(elements.gateFeedback, "Gate date removed.", "good");
      }
    } catch (error) {
      if (elements.arrivalFeedback) setFeedback(elements.arrivalFeedback, error.message, "bad");
    }
  });
}

async function init() {
  bindEvents();
  await restoreSession();
  updateAuthUI();
  await loadAll();
  renderApp();
}

init();
