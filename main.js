// ==================== CLIENT RECORD & INVOICE MANAGER ====================
// Pure Vanilla JavaScript with Supabase persistence

const App = (() => {
    // ==================== SUPABASE SETUP ====================
    const SUPABASE_URL = 'https://jjuzcklbkpppptzsbyxi.supabase.co';  // Replace with your Supabase URL
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdXpja2xia3BwcHB0enNieXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTE0MDksImV4cCI6MjA4NzE2NzQwOX0.5eWaYcH5YWYacEk4QSI7e8zdGo669xRB6q3DgP2GP9o';  // Replace with your Supabase anon key
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentUser = null;

    // ==================== DATA LAYER ====================
    const DEFAULT_SERVICES = [
        { id: crypto.randomUUID(), name: 'Web Design', rate: 1500, unit: 'project', description: 'Complete website design and development' },
        { id: crypto.randomUUID(), name: 'Logo Design', rate: 500, unit: 'project', description: 'Professional logo and brand identity' },
        { id: crypto.randomUUID(), name: 'SEO Optimization', rate: 300, unit: 'month', description: 'Search engine optimization services' },
        { id: crypto.randomUUID(), name: 'Consulting', rate: 150, unit: 'hour', description: 'Business and technical consulting' },
        { id: crypto.randomUUID(), name: 'Social Media Management', rate: 800, unit: 'month', description: 'Social media strategy and management' },
        { id: crypto.randomUUID(), name: 'Content Writing', rate: 100, unit: 'page', description: 'Blog posts, articles, and copywriting' },
        { id: crypto.randomUUID(), name: 'UI/UX Design', rate: 1200, unit: 'project', description: 'User interface and experience design' },
        { id: crypto.randomUUID(), name: 'Mobile App Development', rate: 5000, unit: 'project', description: 'iOS and Android app development' }
    ];

    // State
    let selectedInvoiceServices = [];
    let customLineItems = [];

    // ==================== AUTH ====================
    async function getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user ?? null;
        updateUserUI();
        if (!currentUser) {
            showLoginModal();
        } else {
            switchView('dashboard');
        }
    }

    function updateUserUI() {
        const userSection = document.getElementById('userSection');
        if (currentUser) {
            userSection.style.display = 'flex';
            const displayName = currentUser.email.split('@')[0];
            document.getElementById('userDisplayName').textContent = displayName;
            const initials = displayName.slice(0, 2).toUpperCase();
            document.getElementById('userAvatar').textContent = initials;
        } else {
            userSection.style.display = 'none';
        }
    }

    function showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
    }

    function closeLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
    }

    function openSignupModal() {
        closeLoginModal();
        document.getElementById('signupModal').classList.add('active');
    }

    function closeSignupModal() {
        document.getElementById('signupModal').classList.remove('active');
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showToast(error.message, 'error');
        } else {
            currentUser = data.user;
            updateUserUI();
            closeLoginModal();
            showToast('Logged in successfully');
            switchView('dashboard');
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Signed up! Check your email to confirm.');
            closeSignupModal();
            showLoginModal();
        }
    }

    async function logout() {
        await supabase.auth.signOut();
        currentUser = null;
        updateUserUI();
        showToast('Logged out');
        showLoginModal();
    }

    // ==================== STORAGE HELPERS ====================
    async function getClients() {
        if (!currentUser) return [];
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });
        if (error) {
            console.error(error);
            showToast('Error loading clients', 'error');
        }
        return data || [];
    }

    async function saveClientData(clientData) {
        clientData.user_id = currentUser.id;
        const { error } = await supabase.from('clients').upsert(clientData, { onConflict: 'id' });
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteClient(id) {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function getInvoices() {
        if (!currentUser) return [];
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error(error);
            showToast('Error loading invoices', 'error');
        }
        // Parse items from JSON
        return data ? data.map(inv => ({ ...inv, items: JSON.parse(inv.items) })) : [];
    }

    async function saveInvoiceData(invoiceData) {
        invoiceData.user_id = currentUser.id;
        invoiceData.items = JSON.stringify(invoiceData.items);
        const { error } = await supabase.from('invoices').insert(invoiceData);
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function updateInvoiceData(invoiceData) {
        invoiceData.items = JSON.stringify(invoiceData.items);
        const { error } = await supabase.from('invoices').upsert(invoiceData, { onConflict: 'id' });
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteInvoice(id) {
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function getServices() {
        if (!currentUser) return DEFAULT_SERVICES;
        let { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', currentUser.id);
        if (error) {
            console.error(error);
            showToast('Error loading services', 'error');
        }
        if (!data || data.length === 0) {
            const defaults = DEFAULT_SERVICES.map(s => ({ ...s, user_id: currentUser.id }));
            await supabase.from('services').insert(defaults);
            data = defaults;
        }
        return data;
    }

    async function saveServiceData(serviceData) {
        serviceData.user_id = currentUser.id;
        const { error } = await supabase.from('services').upsert(serviceData, { onConflict: 'id' });
        if (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteService(id) {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        if (error) {
            showToast(error.message, 'error');
        }
    }

    function getNextInvoiceNumber() {
        // Client-side unique number, e.g., INV-YYYYMMDD-Random3Digits
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${date}-${random}`;
    }

    function generateId() {
        return crypto.randomUUID();
    }

    // ==================== THEME ====================
    function initTheme() {
        const savedTheme = localStorage.getItem('cf_theme') || 'light';  // Keep theme in localStorage
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeLabel(savedTheme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('cf_theme', next);
        updateThemeLabel(next);
    }

    function updateThemeLabel(theme) {
        const label = document.querySelector('.theme-label');
        if (label) {
            label.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
        }
    }

    // ==================== NAVIGATION ====================
    function switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const view = document.getElementById(`view-${viewName}`);
        const btn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (view) view.classList.add('active');
        if (btn) btn.classList.add('active');

        // Close mobile sidebar
        closeMobileSidebar();

        // Refresh view data
        if (viewName === 'dashboard') renderDashboard();
        else if (viewName === 'clients') renderClients();
        else if (viewName === 'invoices') renderInvoices();
        else if (viewName === 'services') renderServices();
    }

    function closeMobileSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    }

    // ==================== TOAST ====================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==================== DASHBOARD ====================
    async function renderDashboard() {
        const clients = await getClients();
        const invoices = await getInvoices();

        document.getElementById('statTotalClients').textContent = clients.length;
        document.getElementById('statTotalInvoices').textContent = invoices.length;

        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + inv.grand_total, 0);
        document.getElementById('statTotalRevenue').textContent = formatCurrency(totalRevenue);

        const pendingCount = invoices.filter(inv => inv.status === 'pending').length;
        document.getElementById('statPendingInvoices').textContent = pendingCount;

        // Recent invoices
        const recentList = document.getElementById('recentInvoicesList');
        const recent = invoices.slice(0, 5);

        if (recent.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state-small">
                    <p>No invoices yet. Create your first client and generate an invoice!</p>
                </div>`;
            return;
        }

        recentList.innerHTML = recent.map(inv => {
            const client = clients.find(c => c.id === inv.client_id);
            return `
                <div class="recent-item">
                    <div class="recent-item-info">
                        <span class="recent-item-badge">${inv.invoice_number}</span>
                        <span class="recent-item-name">${client ? client.name : 'Unknown Client'}</span>
                    </div>
                    <span class="invoice-status status-${inv.status}">${capitalize(inv.status)}</span>
                    <span class="recent-item-amount">${formatCurrency(inv.grand_total)}</span>
                </div>`;
        }).join('');
    }

    // ==================== CLIENTS ====================
    async function renderClients(filter = '') {
        const clients = await getClients();
        const invoices = await getInvoices();
        const container = document.getElementById('clientList');

        const filtered = filter
            ? clients.filter(c =>
                c.name.toLowerCase().includes(filter) ||
                c.email.toLowerCase().includes(filter) ||
                (c.phone && c.phone.toLowerCase().includes(filter)) ||
                (c.company && c.company.toLowerCase().includes(filter))
            )
            : clients;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyClients">
                    <img src="https://mgx-backend-cdn.metadl.com/generate/images/262993/2026-02-18/14e23298-da15-4a0f-9320-550150777af8.png" alt="No clients" class="empty-img">
                    <h3>${filter ? 'No matching clients' : 'No clients yet'}</h3>
                    <p>${filter ? 'Try a different search term' : 'Add your first client to get started'}</p>
                    ${!filter ? '<button class="btn btn-primary" onclick="App.openClientModal()">Add Your First Client</button>' : ''}
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(client => {
            const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
            const initials = client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return `
                <div class="client-card">
                    <div class="client-card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="client-avatar">${initials}</div>
                            <div>
                                <div class="client-name">${escapeHtml(client.name)}</div>
                                ${client.company ? `<div class="client-company">${escapeHtml(client.company)}</div>` : ''}
                            </div>
                        </div>
                        <div class="client-card-actions">
                            <button class="btn-icon" title="Edit" onclick="App.editClient('${client.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn-icon danger" title="Delete" onclick="App.confirmDeleteClient('${client.id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="client-details">
                        <div class="client-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            <span>${escapeHtml(client.email)}</span>
                        </div>
                        ${client.phone ? `
                        <div class="client-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span>${escapeHtml(client.phone)}</span>
                        </div>` : ''}
                        ${client.address ? `
                        <div class="client-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>${escapeHtml(client.address)}</span>
                        </div>` : ''}
                    </div>
                    <div class="client-card-footer">
                        <span class="client-invoices-count">${clientInvoices.length} invoice${clientInvoices.length !== 1 ? 's' : ''}</span>
                        <button class="btn btn-sm btn-primary" onclick="App.createInvoiceForClient('${client.id}')">Create Invoice</button>
                    </div>
                </div>`;
        }).join('');
    }

    function openClientModal(clientId = null) {
        const modal = document.getElementById('clientModal');
        const form = document.getElementById('clientForm');
        const title = document.getElementById('clientModalTitle');

        form.reset();
        document.getElementById('clientId').value = '';

        if (clientId) {
            getClients().then(clients => {
                const client = clients.find(c => c.id === clientId);
                if (client) {
                    title.textContent = 'Edit Client';
                    document.getElementById('clientId').value = client.id;
                    document.getElementById('clientName').value = client.name;
                    document.getElementById('clientEmail').value = client.email;
                    document.getElementById('clientPhone').value = client.phone || '';
                    document.getElementById('clientCompany').value = client.company || '';
                    document.getElementById('clientAddress').value = client.address || '';
                    document.getElementById('clientNotes').value = client.notes || '';
                }
            });
        } else {
            title.textContent = 'Add New Client';
        }

        modal.classList.add('active');
    }

    function closeClientModal() {
        document.getElementById('clientModal').classList.remove('active');
    }

    async function saveClient(e) {
        e.preventDefault();

        const id = document.getElementById('clientId').value;
        const clientData = {
            id: id || generateId(),
            name: document.getElementById('clientName').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            company: document.getElementById('clientCompany').value.trim(),
            address: document.getElementById('clientAddress').value.trim(),
            notes: document.getElementById('clientNotes').value.trim(),
            created_at: id ? undefined : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await saveClientData(clientData);
        showToast(id ? 'Client updated successfully' : 'Client added successfully');
        closeClientModal();
        renderClients();
    }

    function editClient(id) {
        openClientModal(id);
    }

    function confirmDeleteClient(id) {
        getClients().then(clients => {
            const client = clients.find(c => c.id === id);
            if (!client) return;

            openConfirmModal(
                `Are you sure you want to delete <strong>${escapeHtml(client.name)}</strong>? This will also delete all associated invoices.`,
                async () => {
                    await deleteClient(id);
                    // Delete associated invoices
                    const invoices = await getInvoices();
                    for (const inv of invoices.filter(inv => inv.client_id === id)) {
                        await deleteInvoice(inv.id);
                    }
                    renderClients();
                    showToast('Client deleted successfully');
                }
            );
        });
    }

    // ==================== SERVICES ====================
    async function renderServices() {
        const services = await getServices();
        const container = document.getElementById('serviceList');

        const unitLabels = {
            project: '/ project',
            hour: '/ hour',
            page: '/ page',
            item: '/ item',
            month: '/ month'
        };

        container.innerHTML = services.map(service => `
            <div class="service-card">
                <div class="service-card-header">
                    <div class="service-name">${escapeHtml(service.name)}</div>
                </div>
                <div class="service-rate">
                    ${formatCurrency(service.rate)}
                    <span class="service-unit">${unitLabels[service.unit] || ''}</span>
                </div>
                ${service.description ? `<div class="service-description">${escapeHtml(service.description)}</div>` : ''}
                <div class="service-card-actions">
                    <button class="btn-icon" title="Edit" onclick="App.editService('${service.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon danger" title="Delete" onclick="App.confirmDeleteService('${service.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function openServiceModal(serviceId = null) {
        const modal = document.getElementById('serviceModal');
        const form = document.getElementById('serviceForm');
        const title = document.getElementById('serviceModalTitle');

        form.reset();
        document.getElementById('serviceId').value = '';

        if (serviceId) {
            getServices().then(services => {
                const service = services.find(s => s.id === serviceId);
                if (service) {
                    title.textContent = 'Edit Service';
                    document.getElementById('serviceId').value = service.id;
                    document.getElementById('serviceName').value = service.name;
                    document.getElementById('serviceRate').value = service.rate;
                    document.getElementById('serviceUnit').value = service.unit;
                    document.getElementById('serviceDescription').value = service.description || '';
                }
            });
        } else {
            title.textContent = 'Add Service';
        }

        modal.classList.add('active');
    }

    function closeServiceModal() {
        document.getElementById('serviceModal').classList.remove('active');
    }

    async function saveService(e) {
        e.preventDefault();

        const id = document.getElementById('serviceId').value;
        const serviceData = {
            id: id || generateId(),
            name: document.getElementById('serviceName').value.trim(),
            rate: parseFloat(document.getElementById('serviceRate').value),
            unit: document.getElementById('serviceUnit').value,
            description: document.getElementById('serviceDescription').value.trim()
        };

        await saveServiceData(serviceData);
        showToast(id ? 'Service updated successfully' : 'Service added successfully');
        closeServiceModal();
        renderServices();
    }

    function editService(id) {
        openServiceModal(id);
    }

    function confirmDeleteService(id) {
        getServices().then(services => {
            const service = services.find(s => s.id === id);
            if (!service) return;

            openConfirmModal(
                `Are you sure you want to delete the service <strong>${escapeHtml(service.name)}</strong>?`,
                async () => {
                    await deleteService(id);
                    renderServices();
                    showToast('Service deleted successfully');
                }
            );
        });
    }

    // ==================== INVOICES ====================
    async function renderInvoices(filter = '') {
        const invoices = await getInvoices();
        const clients = await getClients();
        const container = document.getElementById('invoiceList');

        const filtered = filter
            ? invoices.filter(inv => {
                const client = clients.find(c => c.id === inv.client_id);
                const clientName = client ? client.name.toLowerCase() : '';
                return inv.invoice_number.toLowerCase().includes(filter) ||
                    clientName.includes(filter) ||
                    inv.status.toLowerCase().includes(filter);
            })
            : invoices;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyInvoices">
                    <img src="https://mgx-backend-cdn.metadl.com/generate/images/262993/2026-02-18/14e23298-da15-4a0f-9320-550150777af8.png" alt="No invoices" class="empty-img">
                    <h3>${filter ? 'No matching invoices' : 'No invoices yet'}</h3>
                    <p>${filter ? 'Try a different search term' : 'Create a client first, then generate an invoice'}</p>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(inv => {
            const client = clients.find(c => c.id === inv.client_id);
            return `
                <div class="invoice-card">
                    <div class="invoice-info">
                        <span class="invoice-number-badge">${inv.invoice_number}</span>
                        <div class="invoice-meta">
                            <div class="invoice-client-name">${client ? escapeHtml(client.name) : 'Unknown Client'}</div>
                            <div class="invoice-dates">Issued: ${formatDate(inv.date)} · Due: ${formatDate(inv.due_date)}</div>
                        </div>
                    </div>
                    <span class="invoice-status status-${inv.status}">${capitalize(inv.status)}</span>
                    <span class="invoice-amount">${formatCurrency(inv.grand_total)}</span>
                    <div class="invoice-actions">
                        <button class="btn-icon" title="View Invoice" onclick="App.previewInvoice('${inv.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn-icon" title="Toggle Status" onclick="App.toggleInvoiceStatus('${inv.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button class="btn-icon danger" title="Delete" onclick="App.confirmDeleteInvoice('${inv.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>`;
        }).join('');
    }

    async function openInvoiceModal(preselectedClientId = null) {
        const clients = await getClients();
        if (clients.length === 0) {
            showToast('Please add a client first', 'error');
            return;
        }

        const modal = document.getElementById('invoiceModal');
        selectedInvoiceServices = [];
        customLineItems = [];

        // Populate client dropdown
        const clientSelect = document.getElementById('invoiceClient');
        clientSelect.innerHTML = '<option value="">-- Choose a client --</option>' +
            clients.map(c => `<option value="${c.id}" ${c.id === preselectedClientId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

        // Set dates
        const today = new Date();
        document.getElementById('invoiceDate').value = formatDateInput(today);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30);
        document.getElementById('invoiceDueDate').value = formatDateInput(dueDate);
        document.getElementById('invoiceTaxRate').value = 15;
        document.getElementById('invoiceNotes').value = 'Thank you for your business! Payment is due within 30 days.';

        // Populate service selection
        await renderInvoiceServiceSelection();
        renderSelectedServices();
        recalculateTotals();

        modal.classList.add('active');
    }

    function closeInvoiceModal() {
        document.getElementById('invoiceModal').classList.remove('active');
    }

    async function renderInvoiceServiceSelection() {
        const services = await getServices();
        const container = document.getElementById('invoiceServiceList');

        container.innerHTML = services.map(service => {
            const isSelected = selectedInvoiceServices.some(s => s.serviceId === service.id);
            return `
                <label class="service-select-item ${isSelected ? 'selected' : ''}">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="App.toggleServiceSelection('${service.id}')">
                    <span class="service-select-name">${escapeHtml(service.name)}</span>
                    <span class="service-select-rate">${formatCurrency(service.rate)}</span>
                </label>`;
        }).join('');
    }

    function toggleServiceSelection(serviceId) {
        const index = selectedInvoiceServices.findIndex(s => s.serviceId === serviceId);
        if (index !== -1) {
            selectedInvoiceServices.splice(index, 1);
        } else {
            getServices().then(services => {
                const service = services.find(s => s.id === serviceId);
                if (service) {
                    selectedInvoiceServices.push({
                        serviceId: service.id,
                        name: service.name,
                        rate: service.rate,
                        quantity: 1,
                        unit: service.unit
                    });
                }
                renderInvoiceServiceSelection();
                renderSelectedServices();
                recalculateTotals();
            });
        }
        renderInvoiceServiceSelection();
        renderSelectedServices();
        recalculateTotals();
    }

    function renderSelectedServices() {
        const section = document.getElementById('selectedServicesSection');
        const tbody = document.getElementById('selectedServicesBody');
        const allItems = [...selectedInvoiceServices, ...customLineItems];

        if (allItems.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        tbody.innerHTML = allItems.map((item, idx) => {
            const isCustom = !item.serviceId;
            const calculatedAmount = item.rate * item.quantity;
            const amount = item.amount ?? calculatedAmount;
            return `
                <tr>
                    <td>
                        ${isCustom
                    ? `<input type="text" value="${escapeHtml(item.name)}" onchange="App.updateCustomItemName(${idx - selectedInvoiceServices.length}, this.value)">`
                    : escapeHtml(item.name)
                }
                    </td>
                    <td>
                        <input type="number" value="${item.rate}" min="0" step="0.01" style="width:90px" onchange="App.updateItemRate(${idx}, this.value, ${isCustom})">
                    </td>
                    <td>
                        <input type="number" value="${item.quantity}" min="1" onchange="App.updateItemQuantity(${idx}, this.value, ${isCustom})">
                    </td>
                    <td>
                        <input type="number" value="${amount}" min="0" step="0.01" style="width:90px" onchange="App.updateItemAmount(${idx}, this.value, ${isCustom})">
                    </td>
                    <td>
                        <button class="remove-btn" onclick="App.removeLineItem(${idx}, ${isCustom})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    function updateItemQuantity(index, value, isCustom) {
        const qty = Math.max(1, parseInt(value) || 1);
        let item;
        if (isCustom) {
            const customIdx = index - selectedInvoiceServices.length;
            item = customLineItems[customIdx];
        } else {
            item = selectedInvoiceServices[index];
        }
        if (item) {
            item.quantity = qty;
            delete item.amount;
        }
        renderSelectedServices();
        recalculateTotals();
    }

    function updateItemRate(index, value, isCustom) {
        const rate = Math.max(0, parseFloat(value) || 0);
        let item;
        if (isCustom) {
            const customIdx = index - selectedInvoiceServices.length;
            item = customLineItems[customIdx];
        } else {
            item = selectedInvoiceServices[index];
        }
        if (item) {
            item.rate = rate;
            delete item.amount;
        }
        renderSelectedServices();
        recalculateTotals();
    }

    function updateItemAmount(index, value, isCustom) {
        const amt = Math.max(0, parseFloat(value) || 0);
        let item;
        if (isCustom) {
            const customIdx = index - selectedInvoiceServices.length;
            item = customLineItems[customIdx];
        } else {
            item = selectedInvoiceServices[index];
        }
        if (item) {
            item.amount = amt;
        }
        renderSelectedServices();
        recalculateTotals();
    }

    function updateCustomItemName(customIdx, value) {
        if (customLineItems[customIdx]) {
            customLineItems[customIdx].name = value;
        }
    }

    function removeLineItem(index, isCustom) {
        if (isCustom) {
            const customIdx = index - selectedInvoiceServices.length;
            customLineItems.splice(customIdx, 1);
        } else {
            selectedInvoiceServices.splice(index, 1);
        }
        renderInvoiceServiceSelection();
        renderSelectedServices();
        recalculateTotals();
    }

    function addCustomLineItem() {
        customLineItems.push({
            name: 'Custom Item',
            rate: 0,
            quantity: 1
        });
        renderSelectedServices();
        recalculateTotals();
    }

    function recalculateTotals() {
        const allItems = [...selectedInvoiceServices, ...customLineItems];
        const subtotal = allItems.reduce((sum, item) => sum + (item.amount ?? (item.rate * item.quantity)), 0);
        const taxRate = parseFloat(document.getElementById('invoiceTaxRate').value) || 0;
        const tax = subtotal * (taxRate / 100);
        const grandTotal = subtotal + tax;

        document.getElementById('invoiceSubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('invoiceTax').textContent = formatCurrency(tax);
        document.getElementById('taxRateDisplay').textContent = taxRate;
        document.getElementById('invoiceGrandTotal').textContent = formatCurrency(grandTotal);
    }

    async function saveInvoice() {
        const clientId = document.getElementById('invoiceClient').value;
        const date = document.getElementById('invoiceDate').value;
        const dueDate = document.getElementById('invoiceDueDate').value;
        const taxRate = parseFloat(document.getElementById('invoiceTaxRate').value) || 0;
        const notes = document.getElementById('invoiceNotes').value.trim();

        if (!clientId) {
            showToast('Please select a client', 'error');
            return;
        }

        if (!date || !dueDate) {
            showToast('Please set invoice and due dates', 'error');
            return;
        }

        const allItems = [...selectedInvoiceServices, ...customLineItems];
        if (allItems.length === 0) {
            showToast('Please add at least one service or line item', 'error');
            return;
        }

        const subtotal = allItems.reduce((sum, item) => sum + (item.amount ?? (item.rate * item.quantity)), 0);
        const tax = subtotal * (taxRate / 100);
        const grandTotal = subtotal + tax;

        const invoice = {
            id: generateId(),
            invoice_number: getNextInvoiceNumber(),
            client_id: clientId,
            date,
            due_date: dueDate,
            tax_rate: taxRate,
            items: allItems.map(item => ({
                name: item.name,
                rate: item.rate,
                quantity: item.quantity,
                unit: item.unit || 'item',
                amount: item.amount ?? (item.rate * item.quantity)
            })),
            subtotal,
            tax,
            grand_total: grandTotal,
            notes,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        await saveInvoiceData(invoice);
        closeInvoiceModal();
        showToast(`Invoice ${invoice.invoice_number} created successfully`);
        renderInvoices();
    }

    function createInvoiceForClient(clientId) {
        switchView('invoices');
        setTimeout(() => openInvoiceModal(clientId), 100);
    }

    async function toggleInvoiceStatus(id) {
        const invoices = await getInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) return;

        const statusCycle = ['pending', 'paid', 'overdue'];
        const currentIdx = statusCycle.indexOf(invoice.status);
        invoice.status = statusCycle[(currentIdx + 1) % statusCycle.length];

        await updateInvoiceData(invoice);
        renderInvoices();
        showToast(`Invoice marked as ${invoice.status}`);
    }

    function confirmDeleteInvoice(id) {
        getInvoices().then(invoices => {
            const invoice = invoices.find(inv => inv.id === id);
            if (!invoice) return;

            openConfirmModal(
                `Are you sure you want to delete invoice <strong>${invoice.invoice_number}</strong>?`,
                async () => {
                    await deleteInvoice(id);
                    renderInvoices();
                    showToast('Invoice deleted successfully');
                }
            );
        });
    }

    // ==================== INVOICE PREVIEW ====================
    async function previewInvoice(id) {
        const invoices = await getInvoices();
        const clients = await getClients();
        const invoice = invoices.find(inv => inv.id === id);
        if (!invoice) return;

        const client = clients.find(c => c.id === invoice.client_id);
        const container = document.getElementById('invoicePreviewContent');

        container.innerHTML = `
            <div class="invoice-preview-header">
                <div class="invoice-preview-brand">
                    <h1>ClientFlow</h1>
                    <p>Professional Invoice</p>
                </div>
                <div class="invoice-preview-number">
                    <h2>${invoice.invoice_number}</h2>
                    <p>Date: ${formatDate(invoice.date)}</p>
                    <p>Due: ${formatDate(invoice.due_date)}</p>
                    <p style="margin-top:8px;">
                        <span class="invoice-status status-${invoice.status}" style="display:inline-block;">${capitalize(invoice.status)}</span>
                    </p>
                </div>
            </div>

            <div class="invoice-preview-parties">
                <div>
                    <h4>From</h4>
                    <p><strong>Your Business Name</strong></p>
                    <p>your@email.com</p>
                    <p>Your Address</p>
                </div>
                <div>
                    <h4>Bill To</h4>
                    <p><strong>${client ? escapeHtml(client.name) : 'Unknown'}</strong></p>
                    ${client && client.company ? `<p>${escapeHtml(client.company)}</p>` : ''}
                    ${client && client.email ? `<p>${escapeHtml(client.email)}</p>` : ''}
                    ${client && client.phone ? `<p>${escapeHtml(client.phone)}</p>` : ''}
                    ${client && client.address ? `<p>${escapeHtml(client.address)}</p>` : ''}
                </div>
            </div>

            <table class="invoice-preview-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Rate</th>
                        <th>Qty</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${formatCurrency(item.rate)}</td>
                            <td>${item.quantity}</td>
                            <td class="text-right">${formatCurrency(item.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="invoice-preview-totals">
                <div class="invoice-preview-totals-inner">
                    <div class="invoice-preview-total-row">
                        <span>Subtotal</span>
                        <span>${formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div class="invoice-preview-total-row">
                        <span>Tax (${invoice.tax_rate}%)</span>
                        <span>${formatCurrency(invoice.tax)}</span>
                    </div>
                    <div class="invoice-preview-total-row grand">
                        <span>Grand Total</span>
                        <span>${formatCurrency(invoice.grand_total)}</span>
                    </div>
                </div>
            </div>

            ${invoice.notes ? `
            <div class="invoice-preview-notes">
                <h4>Notes</h4>
                <p>${escapeHtml(invoice.notes)}</p>
            </div>` : ''}

            <div class="invoice-preview-footer">
                <p>Generated by ClientFlow Invoice Manager</p>
            </div>
        `;

        document.getElementById('invoicePreviewModal').classList.add('active');
    }

    function closeInvoicePreview() {
        document.getElementById('invoicePreviewModal').classList.remove('active');
    }

    function printInvoice() {
        window.print();
    }

    // ==================== CONFIRM MODAL ====================
    let confirmCallback = null;

    function openConfirmModal(message, callback) {
        document.getElementById('confirmMessage').innerHTML = message;
        confirmCallback = callback;
        document.getElementById('confirmModal').classList.add('active');
    }

    function closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        confirmCallback = null;
    }

    function executeConfirm() {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    }

    // ==================== UTILITY FUNCTIONS ====================
    function formatCurrency(amount) {
        return 'R' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== INITIALIZATION ====================
    function init() {
        initTheme();

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // Theme toggles
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);

        // Mobile sidebar
        document.getElementById('hamburger').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        });
        document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

        // Client form
        document.getElementById('clientForm').addEventListener('submit', saveClient);
        document.getElementById('addClientBtn').addEventListener('click', () => openClientModal());

        // Service form
        document.getElementById('serviceForm').addEventListener('submit', saveService);
        document.getElementById('addServiceBtn').addEventListener('click', () => openServiceModal());

        // Invoice
        document.getElementById('createInvoiceBtn').addEventListener('click', () => openInvoiceModal());

        // Tax rate change
        document.getElementById('invoiceTaxRate').addEventListener('input', recalculateTotals);

        // Confirm delete
        document.getElementById('confirmDeleteBtn').addEventListener('click', executeConfirm);

        // Search
        document.getElementById('clientSearch').addEventListener('input', (e) => {
            renderClients(e.target.value.toLowerCase().trim());
        });

        document.getElementById('invoiceSearch').addEventListener('input', (e) => {
            renderInvoices(e.target.value.toLowerCase().trim());
        });

        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('signupForm').addEventListener('submit', handleSignup);
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
            }
        });

        // Initial session check
        getSession();
    }

    // Start app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==================== PUBLIC API ====================
    return {
        switchView,
        openClientModal,
        closeClientModal,
        editClient,
        confirmDeleteClient,
        openServiceModal,
        closeServiceModal,
        editService,
        confirmDeleteService,
        openInvoiceModal,
        closeInvoiceModal,
        toggleServiceSelection,
        updateItemQuantity,
        updateItemRate,
        updateItemAmount,
        updateCustomItemName,
        removeLineItem,
        addCustomLineItem,
        saveInvoice,
        createInvoiceForClient,
        toggleInvoiceStatus,
        confirmDeleteInvoice,
        previewInvoice,
        closeInvoicePreview,
        printInvoice,
        closeConfirmModal,
        closeLoginModal,
        openSignupModal,
        closeSignupModal
    };
})();