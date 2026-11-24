const API_BASE = "http://127.0.0.1:8000/api";
const STAFF_ROLES = new Set(["faculty", "program_chair", "dean", "admin"]);

const state = {
  role: "faculty",
  userId: 1001,
  announcements: [],
  selectedId: null,
  notifications: [],
  unreadCount: 0,
  editingAnnouncementId: null,
  pendingDeleteId: null,
  existingAttachment: null,
  targetOptions: [],
  selectedTargetTokens: [],
  catalog: {
    departments: [],
    programs: [],
    sections: [],
    users: [],
    facultySections: [],
  },
};

// DOM Elements
const roleSelect = document.getElementById("roleSelect");
const pageSubtitle = document.getElementById("pageSubtitle");
const openCreateModalBtn = document.getElementById("openCreateModalBtn");
const announcementsFeed = document.getElementById("announcementsFeed");
const detailPane = document.getElementById("detailPane");

// Bell & Notifications
const bellBtn = document.getElementById("bellBtn");
const notifBadge = document.getElementById("notifBadge");
const notifDropdown = document.getElementById("notifDropdown");
const notifUnreadText = document.getElementById("notifUnreadText");
const notifList = document.getElementById("notifList");

// Create / Edit Modal
const formModalBackdrop = document.getElementById("formModalBackdrop");
const formModalTitle = document.getElementById("formModalTitle");
const closeFormModalBtn = document.getElementById("closeFormModalBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const announcementForm = document.getElementById("announcementForm");
const titleInput = document.getElementById("titleInput");
const editorArea = document.getElementById("editorArea");
const formatBlockSelect = document.getElementById("formatBlockSelect");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const fontColorInput = document.getElementById("fontColorInput");
const isPinnedInput = document.getElementById("isPinnedInput");
const attachmentInput = document.getElementById("attachmentInput");
const attachmentLabel = document.getElementById("attachmentLabel");

// Toggle-Chip Target Picker Elements
const targetPicker = document.getElementById("targetPicker");
const targetPickerBtn = document.getElementById("targetPickerBtn");
const targetPickerMenu = document.getElementById("targetPickerMenu");
const targetSearchInput = document.getElementById("targetSearchInput");
const targetOptionsList = document.getElementById("targetOptionsList");
const selectedTargetChips = document.getElementById("selectedTargetChips");
const scopeHintText = document.getElementById("scopeHintText");

// Delete Modal
const deleteModalBackdrop = document.getElementById("deleteModalBackdrop");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// Toast
const toastBanner = document.getElementById("toastBanner");
const toastMessage = document.getElementById("toastMessage");

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showToast(msg) {
  toastMessage.textContent = msg;
  toastBanner.classList.remove("hidden");
  refreshIcons();
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastBanner.classList.add("hidden");
  }, 3200);
}

function isStaffRole() {
  return STAFF_ROLES.has(state.role);
}

function canManageAnnouncement(item) {
  return isStaffRole() && Number(item.user_id) === Number(state.userId);
}

function formatRoleLabel(role) {
  const map = {
    faculty: "Faculty",
    program_chair: "Program Chair",
    dean: "Dean",
    admin: "Admin",
    student: "Student",
  };
  return map[role] || role;
}

function formatDateLabel(isoStr) {
  if (!isoStr) return "Just now";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  return `/${url.replace(/^\/+/, "")}`;
}

/* Built-in Academic Catalog Matching Seeded SQL Data (with optional /api/scopes.php override) */
const DEFAULT_CATALOG = {
  departments: [
    { department_id: 1, department_code: "CCS", department_name: "College of Computer Studies" },
    { department_id: 2, department_code: "CEAS", department_name: "College of Education, Arts and Sciences" },
    { department_id: 3, department_code: "CBA", department_name: "College of Business Administration" },
  ],
  programs: [
    { program_id: 10, department_id: 1, program_code: "BSCS", program_name: "BS in Computer Science", max_years: 4 },
    { program_id: 11, department_id: 1, program_code: "BSIT", program_name: "BS in Information Technology", max_years: 4 },
    { program_id: 12, department_id: 1, program_code: "BSEMC-DAT", program_name: "BSEMC - Digital Animation", max_years: 4 },
    { program_id: 13, department_id: 1, program_code: "BSEMC-GD", program_name: "BSEMC - Game Development", max_years: 4 },
    { program_id: 20, department_id: 2, program_code: "BACOMM", program_name: "BA in Communication", max_years: 4 },
    { program_id: 30, department_id: 3, program_code: "BSBA", program_name: "BS in Business Administration", max_years: 4 },
  ],
  sections: [
    { section_id: 101, section_code: "BSCS-1A", section_name: "BSCS 1A", year_level: 1, program_id: 10, department_id: 1 },
    { section_id: 102, section_code: "BSCS-1B", section_name: "BSCS 1B", year_level: 1, program_id: 10, department_id: 1 },
    { section_id: 103, section_code: "BSCS-1C", section_name: "BSCS 1C", year_level: 1, program_id: 10, department_id: 1 },
    { section_id: 104, section_code: "BSCS-1D", section_name: "BSCS 1D", year_level: 1, program_id: 10, department_id: 1 },
    { section_id: 105, section_code: "BSCS-2A", section_name: "BSCS 2A", year_level: 2, program_id: 10, department_id: 1 },
    { section_id: 106, section_code: "BSCS-2B", section_name: "BSCS 2B", year_level: 2, program_id: 10, department_id: 1 },
    { section_id: 107, section_code: "BSCS-2C", section_name: "BSCS 2C", year_level: 2, program_id: 10, department_id: 1 },
    { section_id: 108, section_code: "BSCS-2D", section_name: "BSCS 2D", year_level: 2, program_id: 10, department_id: 1 },
    { section_id: 109, section_code: "BSCS-3A", section_name: "BSCS 3A", year_level: 3, program_id: 10, department_id: 1 },
    { section_id: 110, section_code: "BSCS-3B", section_name: "BSCS 3B", year_level: 3, program_id: 10, department_id: 1 },
    { section_id: 111, section_code: "BSCS-3C", section_name: "BSCS 3C", year_level: 3, program_id: 10, department_id: 1 },
    { section_id: 112, section_code: "BSCS-3D", section_name: "BSCS 3D", year_level: 3, program_id: 10, department_id: 1 },
    { section_id: 113, section_code: "BSCS-4A", section_name: "BSCS 4A", year_level: 4, program_id: 10, department_id: 1 },
    { section_id: 114, section_code: "BSCS-4B", section_name: "BSCS 4B", year_level: 4, program_id: 10, department_id: 1 },
    { section_id: 115, section_code: "BSCS-4C", section_name: "BSCS 4C", year_level: 4, program_id: 10, department_id: 1 },
    { section_id: 116, section_code: "BSIT-1A", section_name: "BSIT 1A", year_level: 1, program_id: 11, department_id: 1 },
    { section_id: 117, section_code: "BSIT-2A", section_name: "BSIT 2A", year_level: 2, program_id: 11, department_id: 1 },
    { section_id: 118, section_code: "BSIT-3A", section_name: "BSIT 3A", year_level: 3, program_id: 11, department_id: 1 },
    { section_id: 119, section_code: "BSIT-4A", section_name: "BSIT 4A", year_level: 4, program_id: 11, department_id: 1 },
    { section_id: 120, section_code: "BSEMC-DAT-1A", section_name: "BSEMC-DAT 1A", year_level: 1, program_id: 12, department_id: 1 },
    { section_id: 121, section_code: "BSEMC-GD-1A", section_name: "BSEMC-GD 1A", year_level: 1, program_id: 13, department_id: 1 },
    { section_id: 201, section_code: "BACOMM-1A", section_name: "BACOMM 1A", year_level: 1, program_id: 20, department_id: 2 },
    { section_id: 301, section_code: "BSBA-1A", section_name: "BSBA 1A", year_level: 1, program_id: 30, department_id: 3 },
  ],
  users: [
    { user_id: 1001, full_name: "Elena Santos", role: "faculty", section_id: null, year_level: null, program_id: 10, department_id: 1 },
    { user_id: 1002, full_name: "Marco Reyes", role: "program_chair", section_id: null, year_level: null, program_id: 10, department_id: 1 },
    { user_id: 1003, full_name: "Clarissa Mendoza", role: "dean", section_id: null, year_level: null, program_id: null, department_id: 1 },
    { user_id: 1004, full_name: "Raya Manalo", role: "admin", section_id: null, year_level: null, program_id: null, department_id: null },
    { user_id: 2001, full_name: "Angela Cruz", role: "student", section_id: 101, year_level: 1, program_id: 10, department_id: 1 },
    { user_id: 2002, full_name: "Rafael Lim", role: "student", section_id: 101, year_level: 1, program_id: 10, department_id: 1 },
    { user_id: 2003, full_name: "Bianca Navarro", role: "student", section_id: 102, year_level: 1, program_id: 10, department_id: 1 },
    { user_id: 2004, full_name: "Sofia Mendoza", role: "student", section_id: 103, year_level: 4, program_id: 10, department_id: 1 },
    { user_id: 2005, full_name: "Liam Reyes", role: "student", section_id: 103, year_level: 1, program_id: 10, department_id: 1 },
    { user_id: 2006, full_name: "Chloe Villanueva", role: "student", section_id: 104, year_level: 4, program_id: 10, department_id: 1 },
    { user_id: 2007, full_name: "Noah Garcia", role: "student", section_id: 116, year_level: 1, program_id: 11, department_id: 1 },
    { user_id: 2008, full_name: "Zoe Torres", role: "student", section_id: 120, year_level: 1, program_id: 12, department_id: 1 },
    { user_id: 2009, full_name: "Olivia Rodriguez", role: "student", section_id: 121, year_level: 1, program_id: 13, department_id: 1 },
    { user_id: 2010, full_name: "Lucas Ramos", role: "student", section_id: 201, year_level: 1, program_id: 20, department_id: 2 },
    { user_id: 2011, full_name: "Hannah Flores", role: "student", section_id: 301, year_level: 1, program_id: 30, department_id: 3 },
  ],
  facultySections: [
    { user_id: 1001, section_id: 101 },
    { user_id: 1001, section_id: 102 },
    { user_id: 1001, section_id: 103 },
    { user_id: 1001, section_id: 104 },
  ],
};

function buildTargetOptionsForUser(activeUser, cat) {
  const yearLabels = {
    1: "Year 1 (1st Year)",
    2: "Year 2 (2nd Year)",
    3: "Year 3 (3rd Year)",
    4: "Year 4 (Graduating)",
  };

  const options = [];
  const add = (group, value, label) => {
    options.push({ group, value, label });
  };

  if (!activeUser) return options;

  if (state.role === "faculty") {
    const assignedIds = new Set(
      cat.facultySections
        .filter((fs) => Number(fs.user_id) === Number(activeUser.user_id))
        .map((fs) => Number(fs.section_id))
    );
    cat.sections
      .filter((s) => assignedIds.has(Number(s.section_id)))
      .forEach((s) => {
        add("Assigned Sections", `SEC:${s.section_id}`, `${s.section_name} (Year ${s.year_level})`);
      });
  } else if (state.role === "program_chair") {
    const progId = Number(activeUser.program_id || 10);
    const prog = cat.programs.find((p) => Number(p.program_id) === progId);
    if (prog) {
      add("Whole Program", `PROG:${prog.program_id}`, `All ${prog.program_code} Students`);
      const maxYr = Math.min(4, Number(prog.max_years || 4));
      for (let y = 1; y <= maxYr; y++) {
        add(
          `Year Levels in ${prog.program_code}`,
          `PROG_YR:${prog.program_id}:${y}`,
          `${prog.program_code} — ${yearLabels[y]}`
        );
      }
    }
    cat.sections
      .filter((s) => Number(s.program_id) === progId)
      .forEach((s) => {
        add("Sections in Program", `SEC:${s.section_id}`, s.section_name);
      });
  } else if (state.role === "dean") {
    const deptId = Number(activeUser.department_id || 1);
    const dept = cat.departments.find((d) => Number(d.department_id) === deptId);
    if (dept) {
      add(
        "Whole Department",
        `DEPT:${dept.department_id}`,
        `All ${dept.department_code} Students (${dept.department_name})`
      );
      for (let y = 1; y <= 4; y++) {
        add(
          `Year Levels in ${dept.department_code}`,
          `DEPT_YR:${dept.department_id}:${y}`,
          `${dept.department_code} — ${yearLabels[y]}`
        );
      }
    }

    const deptProgs = cat.programs.filter((p) => Number(p.department_id) === deptId);
    const deptProgIds = new Set(deptProgs.map((p) => Number(p.program_id)));

    deptProgs.forEach((prog) => {
      add(
        "Programs in Department",
        `PROG:${prog.program_id}`,
        `All ${prog.program_code} (${prog.program_name})`
      );
      const maxYr = Math.min(4, Number(prog.max_years || 4));
      for (let y = 1; y <= maxYr; y++) {
        add(
          "Program + Year Level",
          `PROG_YR:${prog.program_id}:${y}`,
          `${prog.program_code} — ${yearLabels[y]}`
        );
      }
    });

    cat.sections
      .filter(
        (s) =>
          Number(s.department_id) === deptId || deptProgIds.has(Number(s.program_id))
      )
      .forEach((s) => {
        add("Sections in Department", `SEC:${s.section_id}`, s.section_name);
      });
  } else if (state.role === "admin") {
    add("All Students", "ALL_STUDENTS", "All Students (Entire College)");

    for (let y = 1; y <= 4; y++) {
      add("Whole Year Level (All Programs)", `YR:${y}`, yearLabels[y]);
    }

    cat.departments.forEach((dept) => {
      add(
        "Whole Department / Multiple Departments",
        `DEPT:${dept.department_id}`,
        `${dept.department_code} — ${dept.department_name}`
      );
    });

    cat.programs.forEach((prog) => {
      add(
        "Whole Program / Multiple Programs",
        `PROG:${prog.program_id}`,
        `${prog.program_code} — ${prog.program_name}`
      );
      const maxYr = Math.min(4, Number(prog.max_years || 4));
      for (let y = 1; y <= maxYr; y++) {
        add(
          "Year Level in a Program",
          `PROG_YR:${prog.program_id}:${y}`,
          `${prog.program_code} — ${yearLabels[y]}`
        );
      }
    });

    cat.sections.forEach((sec) => {
      add("Sections", `SEC:${sec.section_id}`, sec.section_name);
    });
  }

  return options;
}

function syncRoleSelectOptions(users) {
  const secMap = new Map(state.catalog.sections.map((s) => [Number(s.section_id), s.section_name]));
  roleSelect.innerHTML = users
    .map((u) => {
      const secName = u.section_id ? secMap.get(Number(u.section_id)) : "";
      const extra = u.role === "student" && secName ? ` - ${secName}` : "";
      const label = `${u.full_name} (${formatRoleLabel(u.role)}${extra})`;
      const selected = Number(u.user_id) === Number(state.userId) ? "selected" : "";
      return `<option value="${escapeHtml(u.role)}" data-user-id="${u.user_id}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

async function refreshScopeAndPicker() {
  state.catalog = {
    departments: [...DEFAULT_CATALOG.departments],
    programs: [...DEFAULT_CATALOG.programs],
    sections: [...DEFAULT_CATALOG.sections],
    users: [...DEFAULT_CATALOG.users],
    facultySections: [...DEFAULT_CATALOG.facultySections],
  };

  try {
    const res = await fetch(`${API_BASE}/scopes.php?user_id=${encodeURIComponent(state.userId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.response && json.body) {
        if (Array.isArray(json.body.departments)) state.catalog.departments = json.body.departments;
        if (Array.isArray(json.body.programs)) state.catalog.programs = json.body.programs;
        if (Array.isArray(json.body.sections)) state.catalog.sections = json.body.sections;
        if (Array.isArray(json.body.users)) state.catalog.users = json.body.users;
        if (Array.isArray(json.body.faculty_sections)) state.catalog.facultySections = json.body.faculty_sections;
      }
    }
  } catch (_) {
    // Fallback catalog already loaded cleanly
  }

  syncRoleSelectOptions(state.catalog.users);
  const activeUser =
    state.catalog.users.find((u) => Number(u.user_id) === Number(state.userId)) ||
    state.catalog.users[0];

  state.targetOptions = buildTargetOptionsForUser(activeUser, state.catalog);

  const validTokens = new Set(state.targetOptions.map((o) => String(o.value)));
  state.selectedTargetTokens = state.selectedTargetTokens.filter((t) => validTokens.has(String(t)));

  const hints = {
    faculty: "Faculty scope: select one or more assigned sections. Students in those sections are notified automatically.",
    program_chair: "Program Chair scope: target your program, year level(s), program + year level, or sections.",
    dean: "Dean scope: target your whole department, year level(s), programs, program + year level, or sections.",
    admin: "Admin scope: target All Students, year level(s), department(s), program(s), program + year level, or sections.",
  };
  scopeHintText.textContent =
    hints[state.role] || "Select target audience options; matching students are notified automatically.";

  renderSelectedTargetChips();
  renderTargetOptionsList();
}

/* Toggle-Chip Multi-Select Picker */
function getOptionLabel(token) {
  const found = state.targetOptions.find((o) => String(o.value) === String(token));
  return found ? found.label : String(token);
}

function renderSelectedTargetChips() {
  if (state.selectedTargetTokens.length === 0) {
    selectedTargetChips.innerHTML = `<span class="picker-placeholder">Select target audience...</span>`;
    return;
  }

  selectedTargetChips.innerHTML = state.selectedTargetTokens
    .map(
      (token) => `
      <span class="selected-chip" data-token="${escapeHtml(token)}">
        <span>${escapeHtml(getOptionLabel(token))}</span>
        <span class="selected-chip-x" data-remove-token="${escapeHtml(token)}" title="Remove">&times;</span>
      </span>
    `
    )
    .join("");
}

function renderTargetOptionsList() {
  const query = (targetSearchInput?.value || "").trim().toLowerCase();
  const matches = state.targetOptions.filter((opt) => {
    if (!query) return true;
    return (
      String(opt.label).toLowerCase().includes(query) ||
      String(opt.group).toLowerCase().includes(query)
    );
  });

  if (matches.length === 0) {
    targetOptionsList.innerHTML = `<div class="picker-group-label">No matching audience options</div>`;
    return;
  }

  const grouped = new Map();
  matches.forEach((opt) => {
    const grp = opt.group || "Target Audience";
    if (!grouped.has(grp)) grouped.set(grp, []);
    grouped.get(grp).push(opt);
  });

  const selectedSet = new Set(state.selectedTargetTokens.map(String));
  const html = [];

  grouped.forEach((items, groupName) => {
    html.push(`<div class="picker-group-label">${escapeHtml(groupName)}</div>`);
    items.forEach((item) => {
      const active = selectedSet.has(String(item.value));
      html.push(`
        <button
          type="button"
          class="picker-option-btn ${active ? "is-selected" : ""}"
          data-token="${escapeHtml(item.value)}"
          role="option"
          aria-selected="${active ? "true" : "false"}"
        >
          <span>${escapeHtml(item.label)}</span>
          <span class="picker-check-box">${active ? "&#10003;" : ""}</span>
        </button>
      `);
    });
  });

  targetOptionsList.innerHTML = html.join("");
}

function toggleTargetToken(token) {
  const strToken = String(token);
  const idx = state.selectedTargetTokens.map(String).indexOf(strToken);
  if (idx >= 0) {
    state.selectedTargetTokens.splice(idx, 1);
  } else {
    state.selectedTargetTokens.push(strToken);
  }
  renderSelectedTargetChips();
  renderTargetOptionsList();
}

function setTargetPickerOpen(open) {
  targetPickerMenu.classList.toggle("hidden", !open);
  targetPickerBtn.setAttribute("aria-expanded", String(open));
  if (open && targetSearchInput) {
    targetSearchInput.value = "";
    renderTargetOptionsList();
    targetSearchInput.focus();
  }
}

function targetsToStructuredPayload(tokens) {
  const structured = [];
  for (const raw of tokens) {
    const token = String(raw).toUpperCase().trim();
    if (token === "ALL_STUDENTS" || token === "SCHOOL") {
      structured.push({ scope_type: "school" });
    } else if (/^YR:([1-4])$/.test(token)) {
      const yr = Number(token.split(":")[1]);
      structured.push({ scope_type: "year_level", year_level: yr });
    } else if (/^DEPT:(\d+)$/.test(token)) {
      const deptId = Number(token.split(":")[1]);
      structured.push({ scope_type: "department", department_id: deptId });
    } else if (/^DEPT_YR:(\d+):([1-4])$/.test(token)) {
      const [, deptId, yr] = token.split(":");
      structured.push({
        scope_type: "department",
        department_id: Number(deptId),
        year_level: Number(yr),
      });
    } else if (/^PROG:(\d+)$/.test(token)) {
      const progId = Number(token.split(":")[1]);
      structured.push({ scope_type: "program", program_id: progId });
    } else if (/^PROG_YR:(\d+):([1-4])$/.test(token)) {
      const [, progId, yr] = token.split(":");
      structured.push({
        scope_type: "program_year",
        program_id: Number(progId),
        year_level: Number(yr),
      });
    } else if (/^SEC:(\d+)$/.test(token)) {
      const secId = Number(token.split(":")[1]);
      structured.push({ scope_type: "section", section_id: secId });
    }
  }
  return structured;
}

function structuredTargetsToTokens(targets) {
  if (!Array.isArray(targets)) return [];
  const tokens = [];
  for (const t of targets) {
    const type = String(t.scope_type || "").toLowerCase();
    if (type === "school") tokens.push("ALL_STUDENTS");
    else if (type === "year_level" && t.year_level) tokens.push(`YR:${t.year_level}`);
    else if (type === "department" && t.department_id && t.year_level) {
      tokens.push(`DEPT_YR:${t.department_id}:${t.year_level}`);
    } else if (type === "department" && t.department_id) {
      tokens.push(`DEPT:${t.department_id}`);
    } else if (type === "program" && t.program_id) {
      tokens.push(`PROG:${t.program_id}`);
    } else if (type === "program_year" && t.program_id && t.year_level) {
      tokens.push(`PROG_YR:${t.program_id}:${t.year_level}`);
    } else if (type === "section" && t.section_id) {
      tokens.push(`SEC:${t.section_id}`);
    }
  }
  return [...new Set(tokens)];
}

function formatTargetLabel(item) {
  if (item && typeof item.target_label === "string" && item.target_label.trim() !== "") {
    return `Target: ${item.target_label}`;
  }
  const targets = Array.isArray(item?.targets) ? item.targets : [];
  if (targets.length === 0) return "Target: All Students";
  const sectionIds = targets
    .filter((t) => t.section_id !== null && t.section_id !== undefined)
    .map((t) => `Section ${t.section_id}`);
  if (sectionIds.length > 0) return `Target: ${sectionIds.join(", ")}`;
  return `Target: ${targets[0].scope_type || "All Students"}`;
}

function applyRoleView() {
  const staff = isStaffRole();
  pageSubtitle.classList.toggle("hidden", !staff);
  openCreateModalBtn.classList.toggle("hidden", !staff);
  renderFeed();
  renderDetail();
}

// API Calls
async function loadAnnouncements() {
  try {
    const params = new URLSearchParams({
      user_id: String(state.userId),
      role: String(state.role),
    });
    const res = await fetch(`${API_BASE}/announcements.php?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.response) {
      throw new Error(json.message || "Unable to fetch announcements.");
    }
    const list = json.body?.announcements || [];
    state.announcements = [...list].sort(
      (a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned))
    );
    if (!state.selectedId && state.announcements.length > 0) {
      state.selectedId = state.announcements[0].announcement_id;
    } else if (
      state.selectedId &&
      !state.announcements.some((a) => Number(a.announcement_id) === Number(state.selectedId))
    ) {
      state.selectedId = state.announcements[0]?.announcement_id ?? null;
    }
    renderFeed();
    renderDetail();
  } catch (err) {
    announcementsFeed.innerHTML = `<div class="status-card">${escapeHtml(err.message)}</div>`;
  }
}

async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE}/notifications.php?user_id=${encodeURIComponent(state.userId)}`);
    const json = await res.json();
    if (!res.ok || !json.response) {
      throw new Error(json.message || "Unable to fetch notifications.");
    }
    state.notifications = json.body?.notifications || [];
    state.unreadCount = Number(json.body?.unread_count ?? 0);
    renderNotifications();
  } catch (err) {
    notifList.innerHTML = `<p class="empty-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function uploadSelectedFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload.php`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.response) {
    throw new Error(json.message || "File upload failed.");
  }
  return json.body;
}

async function handleNotificationClick(item) {
  if (!item.is_read) {
    try {
      const res = await fetch(`${API_BASE}/notifications.php`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: Number(item.notification_id),
          user_id: Number(state.userId),
          is_read: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.response) {
        item.is_read = true;
        state.unreadCount = Number(json.body?.unread_count ?? Math.max(0, state.unreadCount - 1));
        renderNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (item.announcement_id) {
    state.selectedId = item.announcement_id;
    renderFeed();
    renderDetail();
  }
  notifDropdown.classList.add("hidden");
  bellBtn.setAttribute("aria-expanded", "false");
}

// Rendering
function renderNotifications() {
  if (state.unreadCount > 0) {
    notifBadge.textContent = String(state.unreadCount);
    notifBadge.classList.remove("hidden");
  } else {
    notifBadge.classList.add("hidden");
  }
  notifUnreadText.textContent = `${state.unreadCount} unread`;

  if (state.notifications.length === 0) {
    notifList.innerHTML = `<p class="empty-hint">No notifications yet.</p>`;
    refreshIcons();
    return;
  }

  notifList.innerHTML = "";
  state.notifications.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `notif-entry ${n.is_read ? "" : "unread"}`;
    btn.innerHTML = `
      <div class="notif-entry-title">${escapeHtml(n.title || `Announcement #${n.announcement_id}`)}</div>
      <div class="notif-entry-time">${escapeHtml(formatDateLabel(n.created_at))} • ${n.is_read ? "Read" : "Unread"}</div>
    `;
    btn.addEventListener("click", () => handleNotificationClick(n));
    notifList.appendChild(btn);
  });
  refreshIcons();
}

function renderFeed() {
  const staff = isStaffRole();

  if (state.announcements.length === 0) {
    announcementsFeed.innerHTML = `<div class="status-card">No announcements posted yet.</div>`;
    refreshIcons();
    return;
  }

  announcementsFeed.innerHTML = "";
  state.announcements.forEach((item) => {
    const isActive = item.announcement_id === state.selectedId;
    const canManage = canManageAnnouncement(item);
    const card = document.createElement("div");
    card.className = `announcement-card ${isActive ? "active" : ""}`;

    const topBarHtml = staff
      ? `
        <div class="card-top-row">
          <span class="target-pill">
            <i data-lucide="users"></i>
            <span>${escapeHtml(formatTargetLabel(item))}</span>
          </span>
          ${
            canManage
              ? `
                <div class="card-actions">
                  <button type="button" class="card-icon-btn edit" title="Edit announcement" data-edit-id="${item.announcement_id}">
                    <i data-lucide="square-pen"></i>
                  </button>
                  <button type="button" class="card-icon-btn delete" title="Delete announcement" data-delete-id="${item.announcement_id}">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
              `
              : ""
          }
        </div>
      `
      : "";

    const authorLine = item.author_name
      ? `<div class="card-author-line">Posted by ${escapeHtml(item.author_name)}</div>`
      : "";

    card.innerHTML = `
      ${topBarHtml}
      <h3 class="card-title" data-select-id="${item.announcement_id}">${escapeHtml(item.title)}</h3>
      ${authorLine}
      <div class="card-footer-row">
        <span class="card-meta-left">
          <i data-lucide="calendar"></i>
          <span>Posted: ${escapeHtml(formatDateLabel(item.published_at || item.created_at))}</span>
        </span>
        <button type="button" class="read-link" data-select-id="${item.announcement_id}">Read &gt;</button>
      </div>
    `;

    card.querySelectorAll("[data-select-id]").forEach((el) => {
      el.addEventListener("click", () => {
        state.selectedId = item.announcement_id;
        renderFeed();
        renderDetail();
      });
    });

    const editBtn = card.querySelector("[data-edit-id]");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(item);
      });
    }

    const delBtn = card.querySelector("[data-delete-id]");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteModal(item.announcement_id);
      });
    }

    announcementsFeed.appendChild(card);
  });

  refreshIcons();
}

function renderAttachmentBlock(item) {
  const rawUrl = item.attachment_url || item.file_url || "";
  const fileName = item.attachment_name || item.file_name || (rawUrl ? rawUrl.split("/").pop() : "");
  if (!rawUrl && !fileName) return "";

  const safeUrl = normalizeUrl(rawUrl);
  const isImage =
    /\.(png|jpe?g|gif|webp)$/i.test(fileName) || /\.(png|jpe?g|gif|webp)$/i.test(safeUrl);
  const isViewable =
    isImage || /\.(pdf|txt)$/i.test(fileName) || /\.(pdf|txt)$/i.test(safeUrl);

  return `
    <div class="attachment-chip-bar">
      <span class="attachment-chip-label">
        <i data-lucide="paperclip"></i>
        <span>${escapeHtml(fileName || "Attachment")}</span>
      </span>
      ${
        safeUrl
          ? `
            <div class="attachment-actions">
              ${
                isViewable
                  ? `<a class="view-pill-btn" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
                       <i data-lucide="eye"></i>
                       <span>View</span>
                     </a>`
                  : ""
              }
              <a class="download-pill-btn" href="${escapeHtml(safeUrl)}" download="${escapeHtml(fileName || "attachment")}">
                <i data-lucide="download"></i>
                <span>Download</span>
              </a>
            </div>
          `
          : ""
      }
    </div>
    ${
      isImage && safeUrl
        ? `<div class="attachment-preview"><img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(fileName)}" /></div>`
        : ""
    }
  `;
}

function renderDetail() {
  const staff = isStaffRole();
  const current = state.announcements.find((a) => a.announcement_id === state.selectedId);

  if (!current) {
    detailPane.innerHTML = `
      <div class="detail-empty">
        <i data-lucide="inbox"></i>
        <p>Select an announcement to view its details.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const targetBadgeHtml = staff
    ? `<span class="target-pill"><i data-lucide="users"></i><span>${escapeHtml(formatTargetLabel(current))}</span></span>`
    : `<span></span>`;

  const authorText = current.author_name
    ? `<div class="detail-author">Posted by ${escapeHtml(current.author_name)} (${escapeHtml(formatRoleLabel(current.role || ""))})</div>`
    : "";

  detailPane.innerHTML = `
    <div class="detail-top-bar">
      ${targetBadgeHtml}
      <span class="detail-timestamp">
        <i data-lucide="calendar"></i>
        <span>Posted: ${escapeHtml(formatDateLabel(current.published_at || current.created_at))}</span>
      </span>
    </div>
    <h2 class="detail-title">${escapeHtml(current.title)}</h2>
    ${authorText}
    <div class="detail-body">${current.body || ""}</div>
    ${renderAttachmentBlock(current)}
  `;

  refreshIcons();
}

// Modal & Form Handlers
function openCreateModal() {
  state.editingAnnouncementId = null;
  state.existingAttachment = null;
  state.selectedTargetTokens = [];
  formModalTitle.textContent = "Create Announcement";
  document.getElementById("submitFormBtn").textContent = "Post";
  titleInput.value = "";
  editorArea.innerHTML = "";
  if (formatBlockSelect) formatBlockSelect.value = "P";
  if (fontSizeSelect) fontSizeSelect.value = "3";
  isPinnedInput.checked = false;
  attachmentInput.value = "";
  attachmentLabel.textContent = "Add file";
  setTargetPickerOpen(false);
  renderSelectedTargetChips();
  renderTargetOptionsList();
  formModalBackdrop.classList.remove("hidden");
  refreshIcons();
}

function openEditModal(item) {
  if (!canManageAnnouncement(item)) {
    showToast("Only the creator can edit this announcement.");
    return;
  }
  state.editingAnnouncementId = item.announcement_id;
  state.existingAttachment =
    item.attachment_url || item.attachment_name
      ? {
          attachment_name: item.attachment_name || "",
          attachment_url: item.attachment_url || "",
        }
      : null;

  state.selectedTargetTokens = Array.isArray(item.target_keys) && item.target_keys.length > 0
    ? [...item.target_keys]
    : structuredTargetsToTokens(item.targets);

  formModalTitle.textContent = "Edit Announcement";
  document.getElementById("submitFormBtn").textContent = "Save";
  titleInput.value = item.title || "";
  editorArea.innerHTML = item.body || "";
  isPinnedInput.checked = Boolean(item.is_pinned);
  attachmentInput.value = "";
  attachmentLabel.textContent = state.existingAttachment?.attachment_name || "Add file";
  setTargetPickerOpen(false);
  renderSelectedTargetChips();
  renderTargetOptionsList();
  formModalBackdrop.classList.remove("hidden");
  refreshIcons();
}

function closeFormModal() {
  setTargetPickerOpen(false);
  formModalBackdrop.classList.add("hidden");
}

function openDeleteModal(announcementId) {
  const target = state.announcements.find((a) => a.announcement_id === announcementId);
  if (!target || !canManageAnnouncement(target)) {
    showToast("Only the creator can delete this announcement.");
    return;
  }
  state.pendingDeleteId = announcementId;
  deleteModalBackdrop.classList.remove("hidden");
  refreshIcons();
}

function closeDeleteModal() {
  state.pendingDeleteId = null;
  deleteModalBackdrop.classList.add("hidden");
}

// Editor Toolbar Commands
document.querySelectorAll(".editor-toolbar button[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.execCommand(btn.dataset.cmd, false, null);
    editorArea.focus();
  });
});

if (formatBlockSelect) {
  formatBlockSelect.addEventListener("change", () => {
    editorArea.focus();
    document.execCommand("formatBlock", false, `<${formatBlockSelect.value}>`);
  });
}

if (fontSizeSelect) {
  fontSizeSelect.addEventListener("change", () => {
    editorArea.focus();
    document.execCommand("fontSize", false, fontSizeSelect.value);
  });
}

if (fontColorInput) {
  fontColorInput.addEventListener("input", () => {
    editorArea.focus();
    document.execCommand("foreColor", false, fontColorInput.value);
  });
}

document.getElementById("insertLinkBtn").addEventListener("click", () => {
  const url = prompt("Enter URL:");
  if (url) {
    document.execCommand("createLink", false, url);
    editorArea.focus();
  }
});

// Toggle-Chip Picker Events
targetPickerBtn.addEventListener("click", (e) => {
  if (e.target.closest(".selected-chip-x")) return;
  const isOpen = !targetPickerMenu.classList.contains("hidden");
  setTargetPickerOpen(!isOpen);
});

selectedTargetChips.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-token]");
  if (!removeBtn) return;
  e.stopPropagation();
  toggleTargetToken(removeBtn.dataset.removeToken);
});

if (targetSearchInput) {
  targetSearchInput.addEventListener("input", renderTargetOptionsList);
}

targetOptionsList.addEventListener("click", (e) => {
  const optBtn = e.target.closest("[data-token]");
  if (!optBtn) return;
  toggleTargetToken(optBtn.dataset.token);
});

attachmentInput.addEventListener("change", () => {
  const file = attachmentInput.files?.[0];
  attachmentLabel.textContent = file
    ? file.name
    : state.existingAttachment?.attachment_name || "Add file";
});

announcementForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const targets = targetsToStructuredPayload(state.selectedTargetTokens);
  const title = titleInput.value.trim();
  const body = editorArea.innerHTML.trim();

  if (targets.length === 0) {
    showToast("Please select at least one target audience option.");
    return;
  }

  if (!title || !body) {
    showToast("Please enter both a title and content.");
    return;
  }

  let attachmentMeta = state.existingAttachment;
  const selectedFile = attachmentInput.files?.[0];

  try {
    if (selectedFile) {
      attachmentMeta = await uploadSelectedFile(selectedFile);
    }

    const payload = {
      user_id: Number(state.userId),
      role: state.role,
      title,
      body,
      is_pinned: isPinnedInput.checked,
      status: "published",
      attachment_name: attachmentMeta?.attachment_name || null,
      attachment_url: attachmentMeta?.attachment_url || null,
      targets,
    };

    if (state.editingAnnouncementId) {
      const res = await fetch(
        `${API_BASE}/announcements.php?id=${encodeURIComponent(state.editingAnnouncementId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.response) {
        throw new Error(json.message || "Update endpoint not enabled yet in PHP.");
      }
      closeFormModal();
      showToast("Successfully updated the announcement.");
    } else {
      const res = await fetch(`${API_BASE}/announcements.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.response) {
        throw new Error(json.message || "Failed to create announcement.");
      }
      state.selectedId = json.body?.announcement?.announcement_id || state.selectedId;
      closeFormModal();
      showToast("Successfully posted the announcement.");
    }

    await loadAnnouncements();
    await loadNotifications();
  } catch (err) {
    showToast(err.message);
  }
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!state.pendingDeleteId) return;
  try {
    const res = await fetch(
      `${API_BASE}/announcements.php?id=${encodeURIComponent(state.pendingDeleteId)}`,
      {
        method: "DELETE",
      }
    );
    const json = await res.json();
    if (!res.ok || !json.response) {
      throw new Error(json.message || "Delete endpoint not enabled yet in PHP.");
    }
    if (state.selectedId === state.pendingDeleteId) {
      state.selectedId = null;
    }
    closeDeleteModal();
    showToast("Announcement deleted.");
    await loadAnnouncements();
  } catch (err) {
    closeDeleteModal();
    showToast(err.message);
  }
});

// Bell Toggle
bellBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = !notifDropdown.classList.contains("hidden");
  notifDropdown.classList.toggle("hidden", isOpen);
  bellBtn.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) {
    loadNotifications();
  }
});

document.addEventListener("click", (e) => {
  if (!notifDropdown.contains(e.target) && !bellBtn.contains(e.target)) {
    notifDropdown.classList.add("hidden");
    bellBtn.setAttribute("aria-expanded", "false");
  }
  if (targetPicker && !targetPicker.contains(e.target)) {
    setTargetPickerOpen(false);
  }
});

// Role Switcher
roleSelect.addEventListener("change", async () => {
  const opt = roleSelect.selectedOptions[0];
  state.role = roleSelect.value;
  state.userId = Number(opt?.dataset.userId || 1001);
  applyRoleView();
  await refreshScopeAndPicker();
  await loadAnnouncements();
  await loadNotifications();
});

openCreateModalBtn.addEventListener("click", openCreateModal);
closeFormModalBtn.addEventListener("click", closeFormModal);
cancelFormBtn.addEventListener("click", closeFormModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);

// Initial Boot
(async function init() {
  applyRoleView();
  await refreshScopeAndPicker();
  await loadAnnouncements();
  await loadNotifications();
  refreshIcons();
})();