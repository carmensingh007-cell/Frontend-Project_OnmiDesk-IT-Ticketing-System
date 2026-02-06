// --- Initial Data ---
const initialData = [
    { id: 101, title: "DB Latency High", requestor: "System", assignedTo: "Alex D", priority: "High", status: "Open", desc: "Queries taking > 5s" },
    { id: 102, title: "Onboard Sarah J.", requestor: "HR", assignedTo: "Mike R", priority: "Medium", status: "In Progress", desc: "Setup laptop" },
    { id: 103, title: "Wifi Down 3F", requestor: "Facilities", assignedTo: "Sarah K", priority: "High", status: "In Progress", desc: "AP-304 offline" },
    { id: 104, title: "Adobe License", requestor: "Design", assignedTo: "Procurement", priority: "Medium", status: "Open", desc: "Renewal needed" },
    { id: 105, title: "Mouse Broken", requestor: "John Doe", assignedTo: "Helpdesk", priority: "Low", status: "Resolved", desc: "Needs replacement" },
    { id: 106, title: "VPN Error", requestor: "Sales", assignedTo: "NetSec", priority: "High", status: "Open", desc: "Handshake fail" },
    { id: 107, title: "Phishing Email", requestor: "Gateway", assignedTo: "SOC", priority: "High", status: "Resolved", desc: "Malware blocked" },
    { id: 108, title: "Screen Flicker", requestor: "Finance", assignedTo: "Mike R", priority: "Low", status: "Open", desc: "Check HDMI" },
    { id: 109, title: "API 500 Error", requestor: "Dev", assignedTo: "Backend", priority: "High", status: "In Progress", desc: "Salesforce sync" },
    { id: 110, title: "Pwd Reset", requestor: "Intern", assignedTo: "Bot", priority: "Low", status: "Resolved", desc: "Locked out" },
    { id: 111, title: "Jira Sync", requestor: "PMO", assignedTo: "DevOps", priority: "Medium", status: "Open", desc: "Webhooks fail" },
    { id: 112, title: "Office 365", requestor: "CTO", assignedTo: "IT Mgr", priority: "Medium", status: "Resolved", desc: "Upgrade rollout" },
    { id: 113, title: "Server Heat", requestor: "IoT", assignedTo: "Facilities", priority: "High", status: "Open", desc: "Temp > 85F" },
    { id: 114, title: "Zoom Mic", requestor: "Marketing", assignedTo: "Helpdesk", priority: "Medium", status: "In Progress", desc: "Audio failure" },
    { id: 115, title: "Paper Jam", requestor: "Admin", assignedTo: "Mike R", priority: "Low", status: "Open", desc: "Tray 2" },
    { id: 116, title: "Tableau Fail", requestor: "Analyst", assignedTo: "DBA", priority: "Medium", status: "Resolved", desc: "Extract failed" }
];

let tickets = JSON.parse(localStorage.getItem('nexusTickets')) || initialData;
let draggedTicketId = null;

// --- DOM References ---
const views = {
    board: document.getElementById('view-board'),
    analytics: document.getElementById('view-analytics'),
    settings: document.getElementById('view-settings')
};
const navLinks = {
    board: document.getElementById('nav-board'),
    analytics: document.getElementById('nav-analytics'),
    settings: document.getElementById('nav-settings')
};
const modal = document.getElementById('ticketModal');
const ticketForm = document.getElementById('ticketForm');

// --- Initialization ---
function init() {
    renderBoard();
    updateAnalytics();
    setupEventListeners();
}

// --- Render Logic ---
function renderBoard() {
    // Clear columns
    ['Open', 'InProgress', 'Resolved'].forEach(status => {
        document.getElementById(`list-${status}`).innerHTML = '';
        const countSpan = document.getElementById(`count-${status.toLowerCase()}`);
        if(countSpan) countSpan.innerText = '0';
    });

    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const priorityVal = document.getElementById('priorityFilter').value;

    // Filter
    const filtered = tickets.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchVal) || t.desc.toLowerCase().includes(searchVal);
        const matchesPrior = priorityVal === 'all' || t.priority === priorityVal;
        return matchesSearch && matchesPrior;
    });

    // Sort Newest
    filtered.sort((a,b) => b.id - a.id);

    // Render Cards
    filtered.forEach(t => {
        const card = createCardElement(t);
        // Map status to DOM ID format (remove spaces)
        const domId = `list-${t.status.replace(' ', '')}`;
        const container = document.getElementById(domId);
        if(container) container.appendChild(card);
    });

    // Update Counts
    updateStats(filtered);
}

function createCardElement(t) {
    const el = document.createElement('div');
    el.className = `ticket-card ${t.priority}`;
    el.draggable = true;
    
    // Avatar Initials
    const initials = t.assignedTo ? t.assignedTo.substring(0,2).toUpperCase() : 'NA';

    el.innerHTML = `
        <div class="card-top">
            <span>#${t.id}</span>
        </div>
        <div class="card-title">${t.title}</div>
        <div class="card-meta">
            <div style="display:flex; align-items:center; gap:5px;">
                <div class="avatar">${initials}</div>
                <small>${t.assignedTo}</small>
            </div>
            <div>
                <i class="fas fa-pen action-btn edit-btn"></i>
                <i class="fas fa-trash action-btn delete-btn"></i>
            </div>
        </div>
    `;

    // Add Event Listeners via JS (avoid inline onclick issues)
    el.addEventListener('dragstart', () => {
        draggedTicketId = t.id;
        el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        draggedTicketId = null;
    });

    // Edit Button
    el.querySelector('.edit-btn').addEventListener('click', () => openEditModal(t.id));
    
    // Delete Button
    el.querySelector('.delete-btn').addEventListener('click', () => {
        if(confirm('Delete ticket?')) {
            tickets = tickets.filter(x => x.id !== t.id);
            saveAndRender();
        }
    });

    return el;
}

// --- Drag and Drop Logic ---
function setupEventListeners() {
    // Navigation
    Object.keys(navLinks).forEach(key => {
        navLinks[key].addEventListener('click', (e) => {
            e.preventDefault();
            switchView(key);
        });
    });

    // Column Drop Zones
    document.querySelectorAll('.column').forEach(col => {
        col.addEventListener('dragover', e => e.preventDefault()); // Allow drop
        col.addEventListener('drop', e => {
            e.preventDefault();
            const newStatus = col.getAttribute('data-status');
            if (draggedTicketId && newStatus) {
                const idx = tickets.findIndex(t => t.id === draggedTicketId);
                if (idx > -1) {
                    tickets[idx].status = newStatus;
                    saveAndRender();
                }
            }
        });
    });

    // Controls
    document.getElementById('searchInput').addEventListener('input', renderBoard);
    document.getElementById('priorityFilter').addEventListener('change', renderBoard);
    
    // Modal
    document.getElementById('addTicketBtn').addEventListener('click', () => openEditModal(null));
    document.getElementById('closeModal').addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if(e.target === modal) modal.style.display = 'none'; });

    // Form Submit
    ticketForm.addEventListener('submit', handleFormSubmit);
}

// --- Helper Functions ---

function switchView(viewName) {
    // Update Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    navLinks[viewName].classList.add('active');

    // Update View
    Object.values(views).forEach(el => {
        el.classList.remove('active-view');
        el.classList.add('hidden-view');
    });
    views[viewName].classList.remove('hidden-view');
    views[viewName].classList.add('active-view');

    if(viewName === 'analytics') updateAnalytics();
}

function updateAnalytics() {
    document.getElementById('ana-total').innerText = tickets.length;
    document.getElementById('ana-high').innerText = tickets.filter(t => t.priority === 'High').length;
    document.getElementById('ana-resolved').innerText = tickets.filter(t => t.status === 'Resolved').length;
}

function updateStats(filtered) {
    const total = filtered.length;
    const high = filtered.filter(t => t.priority === 'High').length;
    document.getElementById('statsDisplay').innerHTML = `Total: <b>${total}</b> &bull; <span style="color:#ef4444">Critical: ${high}</span>`;
    
    ['Open', 'In Progress', 'Resolved'].forEach(status => {
        const count = tickets.filter(t => t.status === status).length;
        // Handle ID mismatch (DOM uses no spaces)
        const domId = status.replace(' ','').toLowerCase();
        const el = document.getElementById(`count-${domId}`);
        if(el) el.innerText = count;
    });
}

function saveAndRender() {
    localStorage.setItem('nexusTickets', JSON.stringify(tickets));
    renderBoard();
    updateAnalytics();
}

// --- CRUD ---
function openEditModal(id) {
    ticketForm.reset();
    if(id) {
        const t = tickets.find(x => x.id === id);
        document.getElementById('ticketId').value = t.id;
        document.getElementById('tSubject').value = t.title;
        document.getElementById('tRequestor').value = t.requestor;
        document.getElementById('tAssigned').value = t.assignedTo;
        document.getElementById('tPriority').value = t.priority;
        document.getElementById('tStatus').value = t.status;
        document.getElementById('tDescription').value = t.desc;
        document.getElementById('modalTitle').innerText = `Edit #${t.id}`;
    } else {
        document.getElementById('ticketId').value = '';
        document.getElementById('modalTitle').innerText = 'New Ticket';
    }
    modal.style.display = 'flex';
}

function handleFormSubmit(e) {
    e.preventDefault();
    const idVal = document.getElementById('ticketId').value;
    
    const newTicket = {
        id: idVal ? parseInt(idVal) : Date.now(),
        title: document.getElementById('tSubject').value,
        requestor: document.getElementById('tRequestor').value,
        assignedTo: document.getElementById('tAssigned').value,
        priority: document.getElementById('tPriority').value,
        status: document.getElementById('tStatus').value,
        desc: document.getElementById('tDescription').value
    };

    if(idVal) {
        const idx = tickets.findIndex(t => t.id == idVal);
        if(idx > -1) tickets[idx] = newTicket;
    } else {
        tickets.unshift(newTicket);
    }

    saveAndRender();
    modal.style.display = 'none';
}

// Start App
init();
