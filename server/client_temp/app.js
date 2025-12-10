// Application State - UPDATED FOR RENDER DEPLOYMENT
const API_BASE_URL = window.location.origin + '/api';

const state = {
    items: [],
    taxRate: 16,
    discount: 0,
    client: {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        project: ''
    },
    teamNotes: [],
    taskLogs: [],
    payment: {
        bankName: 'Equity Bank Kenya',
        accountName: 'Interiors by Ode',
        accountNumber: '1234567890',
        paybill: '123456',
        paybillAccount: 'Use invoice number'
    },
    currentPage: 'dashboard',
    currentProject: null,
    allProjects: [],
    projectSortColumn: 'name',
    projectSortDirection: 'asc',
    allQuotations: [],
    allInvoices: [],
    clientSortColumn: 'name',
    clientSortDirection: 'asc',
    clientFilterQuery: '',
    allTasks: [],
    allClients: [],
    currentUser: null, // Holds logged-in user data
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
};

// --- UTILITY & HELPER FUNCTIONS ---

/**
 * A wrapper for the fetch API to handle credentials, headers, and errors.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (method, body, etc.).
 * @returns {Promise<object>} - The JSON response from the API.
 */
async function apiFetch(url, options = {}) {
    options.credentials = 'include'; // Send cookies with every request
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            // If unauthorized, redirect to login
            showLoginScreen();
            throw new Error('Authentication required.');
        }

        if (!response.ok) {
            // Try to get detailed error, but fallback gracefully.
            const errorText = await response.text();
            const errorData = JSON.parse(errorText || '{}');
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Handle responses with no content (e.g., DELETE requests)
        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error) {
        // Log the full error for better server-side debugging.
        console.error('API Fetch Error:', error.message);
        // The error from a non-ok response is re-thrown, so we show it.
        // The apiFetch function itself doesn't need to show a generic notification.
        showNotification(error.message, 'error');
        throw error;
    }
}

/**
 * Shows a notification message at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    notificationMessage.textContent = message;
    notification.style.backgroundColor = type === 'error' ? 'var(--accent-coral)' : 'var(--jungle-green)';
    
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Formats a number as Kenyan Shillings.
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted currency string.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - The ISO date string.
 * @returns {string} - The formatted date.
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}


// --- AUTHENTICATION ---

/**
 * Handles the user login process.
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const loginBtnText = loginBtn.querySelector('.login-btn-text');
    const loginSpinner = loginBtn.querySelector('.loader-spinner');

    loginBtn.disabled = true;
    loginMessage.style.display = 'none';
    loginBtnText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (result.success) {
            state.currentUser = result.data.user;
            hideLoginScreen();
            initializeApp(); // Re-initialize app data after login
        } else {
            loginMessage.textContent = result.message || 'Login failed.';
            loginMessage.style.display = 'block';
        }
    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline-block';
        loginSpinner.style.display = 'none';
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        state.currentUser = null;
        showLoginScreen();
    } catch (error) {
        showNotification('Logout failed. Please try again.', 'error');
    }
}

/**
 * Checks if there is an active session on page load.
 */
async function checkSession() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/check-session`);
        if (result.success) {
            state.currentUser = result.data;
            hideLoginScreen();
            return true;
        }
    } catch (error) {
        // If session check fails, it means user is not logged in
        showLoginScreen();
    }
    return false;
}

function showLoginScreen() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.querySelector('.app-container').style.opacity = '0';
}

function hideLoginScreen() {
    document.getElementById('loginContainer').style.display = 'none';
    document.querySelector('.app-container').style.opacity = '1';
}


// --- PAGE NAVIGATION ---

/**
 * Switches the visible page in the main content area.
 * @param {string} pageId - The ID of the page to show.
 */
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show the target page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageId;
    }

    // Update active state on nav links
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    // Close mobile menu if open
    document.getElementById('mobileNavMenu').classList.remove('open');

    // Load data for the new page
    loadPageData(pageId);
}

/**
 * Fetches and renders data based on the current page.
 * @param {string} pageId - The ID of the page being loaded.
 */function loadPageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'clients':
            loadClients();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'quotations':
            loadQuotations();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'calculator':
            loadClientsForSelect('quotationClientSelect');
            break;
    }
}

// --- DATA LOADING & RENDERING ---

async function loadDashboardStats() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/dashboard/stats`);
        // Log the entire response for debugging purposes.
        console.log('Dashboard Stats API Response:', result);

        if (result && result.success && result.data) {
            const { data } = result;

            // Check for main stats and log a warning if a field is missing.
            document.getElementById('activeProjects').textContent = data.activeProjects ?? 'N/A';
            if (data.activeProjects === undefined) console.warn('Dashboard stats missing: activeProjects');

            document.getElementById('monthlyRevenue').textContent = formatCurrency(data.monthlyRevenue ?? 0);
            if (data.monthlyRevenue === undefined) console.warn('Dashboard stats missing: monthlyRevenue');

            document.getElementById('pendingTasks').textContent = data.pendingTasks ?? 'N/A';
            if (data.pendingTasks === undefined) console.warn('Dashboard stats missing: pendingTasks');

            document.getElementById('clientSatisfaction').textContent = `${data.clientSatisfaction ?? 0}%`;
            if (data.clientSatisfaction === undefined) console.warn('Dashboard stats missing: clientSatisfaction');
            
            // Check for trends data.
            if (data.trends) {
                document.getElementById('projectsTrend').textContent = `${data.trends.projects > 0 ? '+' : ''}${data.trends.projects ?? 0}`;
                if (data.trends.projects === undefined) console.warn('Dashboard trends missing: projects');

                document.getElementById('revenueTrend').textContent = `${data.trends.revenue > 0 ? '+' : ''}${data.trends.revenue ?? 0}%`;
                if (data.trends.revenue === undefined) console.warn('Dashboard trends missing: revenue');

                document.getElementById('tasksTrend').textContent = `${data.trends.tasks > 0 ? '+' : ''}${data.trends.tasks ?? 0}`;
                if (data.trends.tasks === undefined) console.warn('Dashboard trends missing: tasks');
            } else {
                console.warn('Dashboard stats object missing: trends');
            }
        } else {
            showNotification('Could not retrieve dashboard statistics.', 'error');
        }
    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        showNotification('An error occurred while fetching dashboard stats.', 'error');
    }
}

async function loadClients() {
    // Construct URL with query parameters for backend sorting and filtering
    const url = new URL(`${API_BASE_URL}/clients`);
    url.searchParams.append('sort', state.clientSortColumn);
    url.searchParams.append('direction', state.clientSortDirection);
    if (state.clientFilterQuery) {
        url.searchParams.append('filter', state.clientFilterQuery);
    }

    try {
        const result = await apiFetch(url.toString());
        if (result.success) {
            state.allClients = result.data;
            renderClientsTable(state.allClients);
        }
    } catch (error) {
        console.error("Failed to load and render clients:", error);
    }
}

function renderClientsTable(clients) {
    const tableBody = document.getElementById('clientsTableBody');
    tableBody.innerHTML = '';

    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No clients found.</td></tr>';
        return;
    }
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.company || 'N/A'}</td>
            <td>${client.email}</td>
            <td>${client.phone}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-client-btn" data-id="${client.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-client-btn" data-id="${client.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update sort indicators in table headers
    document.querySelectorAll('#clients-page .sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.clientSortColumn) {
            th.classList.add(`sort-${state.clientSortDirection}`);
        }
    });
}

function handleClientSort(column) {
    state.clientSortDirection = state.clientSortColumn === column && state.clientSortDirection === 'asc' ? 'desc' : 'asc';
    state.clientSortColumn = column;
    loadClients(); // Reload data from backend with new sort parameters
}

async function loadProjects() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/projects`);
        if (result.success) {
            state.allProjects = result.data;
            renderProjectsTable(state.allProjects);
        }
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
}

function renderProjectsTable(projects) {
    const tableBody = document.getElementById('projectsTableBody');
    tableBody.innerHTML = '';
    if (projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No projects found.</td></tr>';
        return;
    }
    projects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.name}</td>
            <td>${project.client_name || 'N/A'}</td>
            <td><span class="status-badge status-${project.status}">${project.status.replace('_', ' ')}</span></td>
            <td>${formatCurrency(project.budget)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-project-btn" data-id="${project.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-project-btn" data-id="${project.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadQuotations() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations`);
        if (result.success) {
            state.allQuotations = result.data;
            renderQuotationsTable(state.allQuotations);
        }
    } catch (error) {
        console.error("Failed to load quotations:", error);
    }
}

function renderQuotationsTable(quotations) {
    const tableBody = document.getElementById('quotationsTableBody');
    tableBody.innerHTML = '';
    if (quotations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No quotations found.</td></tr>';
        return;
    }
    quotations.forEach(quote => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${quote.quotation_number}</td>
            <td>${quote.client_name || 'N/A'}</td>
            <td>${formatDate(quote.created_at)}</td>
            <td>${formatCurrency(quote.total)}</td>
            <td><span class="status-badge status-${quote.status}">${quote.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary view-quotation-btn" data-id="${quote.id}"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-danger delete-quotation-btn" data-id="${quote.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadInvoices() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/invoices`);
        if (result.success) {
            state.allInvoices = result.data;
            renderInvoicesTable(state.allInvoices);
        }
    } catch (error) {
        console.error("Failed to load invoices:", error);
    }
}

function renderInvoicesTable(invoices) {
    const tableBody = document.getElementById('invoicesTableBody');
    tableBody.innerHTML = '';
    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No invoices found.</td></tr>';
        return;
    }
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoice_number}</td>
            <td>${invoice.client_name || 'N/A'}</td>
            <td>${formatDate(invoice.issue_date)}</td>
            <td>${formatDate(invoice.due_date)}</td>
            <td>${formatCurrency(invoice.total)}</td>
            <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary view-invoice-btn" data-id="${invoice.id}"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-danger delete-invoice-btn" data-id="${invoice.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadTasks() {
    try {
        // For now, we load all tasks. This could be filtered by project later.
        const result = await apiFetch(`${API_BASE_URL}/tasks/project/all`); // Assuming an endpoint to get all tasks
        if (result.success) {
            state.allTasks = result.data;
            renderTasksTable(state.allTasks);
        }
    } catch (error) {
        console.error("Failed to load tasks:", error);
    }
}

function renderTasksTable(tasks) {
    const tableBody = document.getElementById('tasksTableBody');
    tableBody.innerHTML = '';
    if (tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No tasks found.</td></tr>';
        return;
    }
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.project_name || 'N/A'}</td>
            <td><span class="status-badge status-${task.status.replace(' ', '_')}">${task.status}</span></td>
            <td><span class="priority-badge priority-${task.priority}">${task.priority}</span></td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-task-btn" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadSettings() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`);
        if (result.success) {
            const settings = result.data;
            for (const key in settings) {
                const input = document.getElementById(`setting${key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`);
                if (input) {
                    input.value = settings[key];
                }
            }
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
}

async function saveSettings() {
    const settings = {};
    const inputs = document.querySelectorAll('#settings-page .form-control');
    inputs.forEach(input => {
        // Convert camelCase ID to snake_case key
        const key = input.id.replace('setting', '').replace(/([A-Z])/g, "_$1").toLowerCase().substring(1);
        settings[key] = input.value;
    });

    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        if (result.success) {
            showNotification('Settings saved successfully!');
        }
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
}

async function loadClientsForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const result = await apiFetch(`${API_BASE_URL}/clients`);
        if (result.success) {
            select.innerHTML = '<option value="">-- Select a Client --</option>';
            result.data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} (${client.email})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error(`Failed to load clients for select ${selectId}:`, error);
    }
}

async function showDocumentViewer(docId, docType) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/${docType}s/${docId}`);
        if (!result.success) {
            return showNotification(`Failed to load ${docType}.`, 'error');
        }

        const doc = result.data;
        const modal = document.getElementById('viewDocumentModal');
        const title = modal.querySelector('h3');
        const content = modal.querySelector('.document-content');

        let itemsHtml = doc.items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        if (docType === 'quotation') {
            title.textContent = `Quotation #${doc.quotation_number}`;
            content.innerHTML = `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Date:</strong> ${formatDate(doc.created_at)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
                <hr>
                <h4>Items</h4>
                <table class="table">
                    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="summary">
                    <p>Subtotal: <span>${formatCurrency(doc.subtotal)}</span></p>
                    <p>Tax (${doc.tax_rate}%): <span>${formatCurrency(doc.tax_amount)}</span></p>
                    <p>Discount: <span>- ${formatCurrency(doc.discount_amount)}</span></p>
                    <h4>Total: <span>${formatCurrency(doc.total)}</span></h4>
                </div>
            `;
        } else if (docType === 'invoice') {
            title.textContent = `Invoice #${doc.invoice_number}`;
            content.innerHTML = `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Issue Date:</strong> ${formatDate(doc.issue_date)}</p>
                <p><strong>Due Date:</strong> ${formatDate(doc.due_date)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
                <hr>
                <h4>Items</h4>
                <table class="table">
                    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="summary">
                    <p>Subtotal: <span>${formatCurrency(doc.subtotal)}</span></p>
                    <p>Tax: <span>${formatCurrency(doc.tax_amount)}</span></p>
                    <h4>Total: <span>${formatCurrency(doc.total)}</span></h4>
                </div>
            `;
        }
        openModal('viewDocumentModal');
    } catch (error) {
        console.error(`Failed to show ${docType}:`, error);
    }
}

// --- MODAL HANDLING ---

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupModal(modalId, openBtnId, cancelBtnId) {
    if (openBtnId) {
        document.getElementById(openBtnId).addEventListener('click', () => openModal(modalId));
    }
    if (cancelBtnId) {
        document.getElementById(cancelBtnId).addEventListener('click', () => closeModal(modalId));
    }
}

// --- CLIENTS CRUD ---

async function handleAddNewClient() {
    // This reuses the editClientModal but for creation
    document.getElementById('editClientModal').querySelector('h3').textContent = 'Add New Client';
    document.getElementById('editClientId').value = '';
    document.getElementById('editClientForm').reset();
    openModal('editClientModal');
}

async function handleEditClient(clientId) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients/${clientId}`);
        if (result.success) {
            const client = result.data;
            document.getElementById('editClientModal').querySelector('h3').textContent = 'Edit Client';
            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.name;
            document.getElementById('editClientCompany').value = client.company || '';
            document.getElementById('editClientEmail').value = client.email;
            document.getElementById('editClientPhone').value = client.phone;
            document.getElementById('editClientAddress').value = client.address;
            openModal('editClientModal');
        }
    } catch (error) {
        console.error(`Failed to fetch client ${clientId} for editing:`, error);
    }
}

async function handleSaveClient() {
    const clientId = document.getElementById('editClientId').value;
    const isNew = !clientId;

    const clientData = {
        name: document.getElementById('editClientName').value,
        company: document.getElementById('editClientCompany').value,
        email: document.getElementById('editClientEmail').value,
        phone: document.getElementById('editClientPhone').value,
        address: document.getElementById('editClientAddress').value,
    };

    const url = isNew ? `${API_BASE_URL}/clients` : `${API_BASE_URL}/clients/${clientId}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
        const result = await apiFetch(url, { method, body: JSON.stringify(clientData) });
        if (result.success) {
            showNotification(`Client ${isNew ? 'created' : 'updated'} successfully!`);
            closeModal('editClientModal');
            loadClients(); // Refresh the table
        }
    } catch (error) {
        console.error('Failed to save client:', error);
    }
}

async function handleEditProject(projectId) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/projects/${projectId}`);
        if (!result.success) return;

        const project = result.data;
        await loadClientsForSelect('editProjectClient');

        document.getElementById('editProjectId').value = project.id;
        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editProjectDescription').value = project.description || '';
        document.getElementById('editProjectClient').value = project.client_id || '';
        document.getElementById('editProjectBudget').value = project.budget || 0;
        document.getElementById('editProjectStatus').value = project.status || 'planning';
        document.getElementById('editProjectProgress').value = project.progress || 0;
        document.getElementById('editProjectProgressValue').textContent = `${project.progress || 0}%`;
        document.getElementById('editProjectStartDate').value = project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '';
        document.getElementById('editProjectDeadline').value = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '';
        document.getElementById('editProjectNotes').value = project.notes || '';

        openModal('editProjectModal');
    } catch (error) {
        console.error(`Failed to open edit modal for project ${projectId}:`, error);
    }
}

async function handleSaveProject() {
    const projectId = document.getElementById('editProjectId').value;
    const projectData = {
        name: document.getElementById('editProjectName').value,
        description: document.getElementById('editProjectDescription').value,
        client_id: document.getElementById('editProjectClient').value,
        budget: parseFloat(document.getElementById('editProjectBudget').value) || 0,
        status: document.getElementById('editProjectStatus').value,
        progress: parseInt(document.getElementById('editProjectProgress').value) || 0,
        start_date: document.getElementById('editProjectStartDate').value || null,
        deadline: document.getElementById('editProjectDeadline').value || null,
        notes: document.getElementById('editProjectNotes').value,
    };

    await apiFetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(projectData) });
    showNotification('Project updated successfully!');
    closeModal('editProjectModal');
    loadProjects();
}

async function handleEditTask(taskId) {
    try {
        const task = state.allTasks.find(t => t.id === parseInt(taskId));
        if (!task) {
            return showNotification('Task not found.', 'error');
        }

        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskStatus').value = task.status;
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskAssignedTo').value = task.assigned_to || '';
        document.getElementById('editTaskDueDate').value = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';

        openModal('editTaskModal');
    } catch (error) {
        console.error(`Failed to open edit modal for task ${taskId}:`, error);
    }
}

async function handleSaveTask() {
    const taskId = document.getElementById('editTaskId').value;
    const taskData = {
        title: document.getElementById('editTaskTitle').value,
        description: document.getElementById('editTaskDescription').value,
        status: document.getElementById('editTaskStatus').value,
        priority: document.getElementById('editTaskPriority').value,
        assigned_to: document.getElementById('editTaskAssignedTo').value,
        due_date: document.getElementById('editTaskDueDate').value || null,
    };

    if (!taskData.title) {
        return showNotification('Task title is required.', 'error');
    }

    try {
        await apiFetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(taskData) });
        showNotification('Task updated successfully!');
        closeModal('editTaskModal');
        loadTasks(); // Refresh the tasks list
    } catch (error) {
        console.error(`Failed to save task ${taskId}:`, error);
    }
}

async function handleDeleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
        return;
    }

    try {
        // A successful DELETE request often returns a 204 No Content status.
        // Our apiFetch utility handles this by returning null and not throwing an error.
        await apiFetch(`${API_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        showNotification('Client deleted successfully!');
        loadClients(); // Refresh the client list
    } catch (error) {
        // The apiFetch utility will show an error notification.
        console.error(`Failed to delete client ${clientId}:`, error);
    }
}

// --- CALCULATOR & QUOTATION LOGIC ---

function addCalculatorItem() {
    const item = {
        id: `item-${Date.now()}`,
        description: '',
        unit: 'pcs',
        quantity: 1,
        unit_price: 0,
    };
    state.items.push(item);
    renderCalculatorItems();
}

function renderCalculatorItems() {
    const tableBody = document.getElementById('itemsTableBody');
    tableBody.innerHTML = '';
    state.items.forEach(item => {
        const row = document.createElement('tr');
        row.id = item.id;
        row.innerHTML = `
            <td><input type="text" class="form-control" data-field="description" value="${item.description}" placeholder="Item description"></td>
            <td><input type="text" class="form-control" data-field="unit" value="${item.unit}"></td>
            <td><input type="number" class="form-control" data-field="quantity" value="${item.quantity}" min="0"></td>
            <td><input type="number" class="form-control" data-field="unit_price" value="${item.unit_price}" min="0"></td>
            <td class="item-total">${formatCurrency(item.quantity * item.unit_price)}</td>
            <td><button class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-trash"></i></button></td>
        `;
        tableBody.appendChild(row);
    });
    updateCalculatorSummary();
}

function updateCalculatorItem(itemId, field, value) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    if (field === 'quantity' || field === 'unit_price') {
        item[field] = parseFloat(value) || 0;
    } else {
        item[field] = value;
    }

    const row = document.getElementById(itemId);
    if (row) {
        const totalCell = row.querySelector('.item-total');
        totalCell.textContent = formatCurrency(item.quantity * item.unit_price);
    }
    updateCalculatorSummary();
}

function removeCalculatorItem(itemId) {
    state.items = state.items.filter(i => i.id !== itemId);
    renderCalculatorItems();
}

function updateCalculatorSummary() {
    const subtotal = state.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const discountPercent = parseFloat(document.getElementById('discount').value) || 0;

    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal + taxAmount - discountAmount;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('taxRateDisplay').textContent = taxRate;
    document.getElementById('taxAmount').textContent = formatCurrency(taxAmount);
    document.getElementById('discountDisplay').textContent = discountPercent;
    document.getElementById('discountAmount').textContent = `- ${formatCurrency(discountAmount)}`;
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

async function generateQuotation() {
    const quotationData = {
        client_id: document.getElementById('quotationClientSelect').value,
        items: state.items.map(item => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
        })),
        tax_rate: parseFloat(document.getElementById('taxRate').value) || 0,
        discount_amount: parseFloat(document.getElementById('discountAmount').textContent.replace(/[^0-9.]/g, '')) || 0,
        subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, '')) || 0,
        total: parseFloat(document.getElementById('totalAmount').textContent.replace(/[^0-9.]/g, '')) || 0,
    };

    if (!quotationData.client_id) {
        return showNotification('Please select a client.', 'error');
    }

    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations`, { method: 'POST', body: JSON.stringify(quotationData) });
        if (result.success) {
            showNotification('Quotation created successfully!');
            navigateToPage('quotations');
        }
    } catch (error) {
        console.error('Failed to generate quotation:', error);
    }
}

/**
 * Clears all items and resets the calculator form.
 */
function clearCalculator() {
    if (confirm('Are you sure you want to clear all items from the calculator?')) {
        // Reset the items array in the state
        state.items = [];

        // Reset the form inputs to their default values
        document.getElementById('quotationClientSelect').value = '';
        document.getElementById('taxRate').value = state.taxRate; // Default tax rate
        document.getElementById('discount').value = state.discount; // Default discount

        // Re-render the calculator to reflect the cleared state
        renderCalculatorItems();

        showNotification('Calculator has been cleared.');
    }
}
// --- PROJECTS, QUOTATIONS, INVOICES CRUD (DELETE) ---

async function handleDeleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This will also delete related quotations and invoices and cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'DELETE' });
        showNotification('Project deleted successfully!');
        loadProjects(); // Refresh the projects list
    } catch (error) {
        console.error(`Failed to delete project ${projectId}:`, error);
    }
}

async function handleDeleteQuotation(quotationId) {
    if (!confirm('Are you sure you want to delete this quotation? This cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/quotations/${quotationId}`, { method: 'DELETE' });
        showNotification('Quotation deleted successfully!');
        loadQuotations(); // Refresh the quotations list
    } catch (error) {
        console.error(`Failed to delete quotation ${quotationId}:`, error);
    }
}

async function handleDeleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}`, { method: 'DELETE' });
        showNotification('Invoice deleted successfully!');
        loadInvoices(); // Refresh the invoices list
    } catch (error) {
        console.error(`Failed to delete invoice ${invoiceId}:`, error);
    }
}

async function handleDeleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
        showNotification('Task deleted successfully!');
        loadTasks(); // Refresh the tasks list
    } catch (error) {
        console.error(`Failed to delete task ${taskId}:`, error);
    }
}


// --- MOBILE & IOS SPECIFIC FIXES ---

function applyMobileFixes() {
    if (state.isIOS) {
        document.body.classList.add('is-ios');
    }

    // Hide the floating mobile menu button as it's not being used.
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        // More definitive than hiding: remove the element from the DOM completely.
        mobileMenuBtn.remove();
    }

    // Set custom viewport height variable
    const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);

    // Prevent double-tap to zoom
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastTap < 300) {
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

// --- INITIALIZATION & EVENT LISTENERS ---

/**
 * Initializes the application, sets up event listeners.
 */
async function initializeApp() {
    const isLoggedIn = await checkSession();
    applyMobileFixes();

    if (isLoggedIn) {
        // Load initial page data if the user is logged in
        navigateToPage(state.currentPage);
        document.querySelector('.app-container').style.opacity = '1';
    } else {
        showLoginScreen();
        if (state.isIOS) {
            setTimeout(() => document.getElementById('email')?.focus(), 500);
        }
    }
}

/**
 * Adds click listeners to dashboard cards to navigate to relevant pages.
 */
function setupDashboardNavigation() {
    document.getElementById('activeProjectsCard')?.addEventListener('click', () => navigateToPage('projects'));
    document.getElementById('monthlyRevenueCard')?.addEventListener('click', () => navigateToPage('invoices'));
    document.getElementById('pendingTasksCard')?.addEventListener('click', () => navigateToPage('tasks'));
    document.getElementById('clientSatisfactionCard')?.addEventListener('click', () => navigateToPage('clients'));
}



document.addEventListener('DOMContentLoaded', () => {
    // --- General Setup ---
    const loader = document.querySelector('.loader');
    if (loader) {
        // Ensure loader is hidden if something goes wrong with the animation
        setTimeout(() => {
            loader.style.display = 'none';
        }, 4500);
    }

    // --- Authentication ---
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    setupDashboardNavigation();
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.querySelectorAll('input.form-control').forEach(input => {
        if (state.isIOS) { // Apply keyboard fixes primarily for iOS where it's most problematic
            input.addEventListener('focus', () => {
                // Briefly scroll the input into the middle of the view
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    });
    document.getElementById('password')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // --- Navigation ---
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(link.dataset.page);
        });
    });

    // --- Mobile Menu Toggle ---
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    mobileNavToggle?.addEventListener('click', () => {
        mobileNavMenu.classList.toggle('open');
    });
    
    // const sidebarToggle = document.getElementById('mobileMenuBtn');
    // const sidebar = document.getElementById('sidebar');
    // sidebarToggle?.addEventListener('click', () => {
    //     sidebar.classList.toggle('active');
    // });

    // --- Responsive Fixes ---
    // Make the calculator table horizontally scrollable on mobile
    const itemsTable = document.getElementById('itemsTableBody')?.parentElement;
    if (itemsTable) {
        const wrapper = document.createElement('div');
        wrapper.style.overflowX = 'auto';
        itemsTable.parentNode.insertBefore(wrapper, itemsTable);
        wrapper.appendChild(itemsTable);
    }

    // Make the clients table horizontally scrollable on mobile
    const clientsTable = document.getElementById('clientsTableBody')?.parentElement;
    if (clientsTable) {
        const wrapper = document.createElement('div');
        wrapper.style.overflowX = 'auto';
        clientsTable.parentNode.insertBefore(wrapper, clientsTable);
        wrapper.appendChild(clientsTable);
    }


    // --- Global Listeners ---
    window.addEventListener('orientationchange', () => {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    // --- Modals ---
    setupModal('newProjectModal', 'newProjectBtn', 'cancelNewProjectBtn');
    setupModal('editClientModal', null, 'cancelEditClientBtn'); // Opened programmatically
    setupModal('editProjectModal', null, 'cancelEditProjectBtn'); // Opened programmatically
    setupModal('editTaskModal', null, 'cancelEditTaskBtn'); // Opened programmatically
    setupModal('viewDocumentModal', null, 'closeDocumentViewerBtn');

    // --- Page-specific Event Listeners ---
    document.body.addEventListener('click', (e) => {
        // Client actions
        if (e.target.closest('.edit-client-btn')) {
            handleEditClient(e.target.closest('.edit-client-btn').dataset.id);
        }
        if (e.target.closest('.delete-client-btn')) {
            handleDeleteClient(e.target.closest('.delete-client-btn').dataset.id);
        }

        // Client table sorting
        if (e.target.closest('#clients-page .sortable')) {
            handleClientSort(e.target.closest('.sortable').dataset.sort);
        }

        // Project actions
        if (e.target.closest('.edit-project-btn')) {
            handleEditProject(e.target.closest('.edit-project-btn').dataset.id);
        }
        if (e.target.closest('.delete-project-btn')) {
            handleDeleteProject(e.target.closest('.delete-project-btn').dataset.id);
        }

        // Quotation actions
        if (e.target.closest('.view-quotation-btn')) {
            showDocumentViewer(e.target.closest('.view-quotation-btn').dataset.id, 'quotation');
        }
        if (e.target.closest('.delete-quotation-btn')) {
            handleDeleteQuotation(e.target.closest('.delete-quotation-btn').dataset.id);
        }

        // Invoice actions
        if (e.target.closest('.view-invoice-btn')) {
            showDocumentViewer(e.target.closest('.view-invoice-btn').dataset.id, 'invoice');
        }
        if (e.target.closest('.delete-invoice-btn')) {
            handleDeleteInvoice(e.target.closest('.delete-invoice-btn').dataset.id);
        }

        // Task actions
        if (e.target.closest('.edit-task-btn')) {
            handleEditTask(e.target.closest('.edit-task-btn').dataset.id);
        }
        if (e.target.closest('.delete-task-btn')) {
            handleDeleteTask(e.target.closest('.delete-task-btn').dataset.id);
        }

        // Calculator actions
        if (e.target.closest('.remove-item-btn')) {
            removeCalculatorItem(e.target.closest('tr').id);
        }
    });

    document.getElementById('itemsTableBody')?.addEventListener('input', (e) => {
        const target = e.target;
        updateCalculatorItem(target.closest('tr').id, target.dataset.field, target.value);
    });

    // --- Form Submissions ---
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
    document.getElementById('saveClientChangesBtn')?.addEventListener('click', handleSaveClient);
    document.getElementById('saveProjectChangesBtn')?.addEventListener('click', handleSaveProject);
    document.getElementById('saveTaskChangesBtn')?.addEventListener('click', handleSaveTask);
    document.getElementById('addNewClientBtn')?.addEventListener('click', handleAddNewClient);
    
    // --- Calculator Page ---
    document.getElementById('addItemBtn')?.addEventListener('click', () => {
        addCalculatorItem();
    });
    document.getElementById('generateQuoteBtn')?.addEventListener('click', () => generateQuotation());
    document.getElementById('clearCalculatorBtn')?.addEventListener('click', clearCalculator);

    // --- Filtering and Sliders ---
    document.getElementById('clientSearchInput')?.addEventListener('input', (e) => {
        state.clientFilterQuery = e.target.value;
        loadClients(); // Reload data from backend with new filter
    });
    document.getElementById('editProjectProgress')?.addEventListener('input', (e) => {
        document.getElementById('editProjectProgressValue').textContent = `${e.target.value}%`;
    });


    // --- Start the App ---
    initializeApp();
});
