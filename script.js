// Kanban Board Pro - Supabase Integration

// ==================== SUPABASE CLIENT ====================
console.log('Initializing Supabase...');

// Use 'db' as variable name to avoid conflicts with window.supabase
let db;
try {
    if (typeof SUPABASE_CONFIG === 'undefined') {
        throw new Error('SUPABASE_CONFIG not found. Check supabase-config.js');
    }
    const supabaseUrl = SUPABASE_CONFIG.url;
    const supabaseKey = SUPABASE_CONFIG.anonKey;

    if (!window.supabase) {
        throw new Error('Supabase SDK not loaded. Check CDN.');
    }

    db = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
} catch (error) {
    console.error('Failed to create Supabase client:', error);
    alert('Failed to connect to Supabase: ' + error.message);
}

// ==================== STATE ====================
let currentUser = null;
let currentBoard = null;
let columns = [];
let tasks = [];
let editingTask = null;
let currentColumn = null;
let currentTags = [];
let currentSubtasks = [];
let selectedTask = null;
let realtimeChannel = null;

// ==================== DOM ELEMENTS ====================
let loadingScreen, authContainer, mainApp, board;
let loginForm, registerForm, authTabs;
let userBtn, userDropdown, userAvatar, userName, logoutBtn;
let modalOverlay, modalTitle, saveBtnText;
let taskTitleInput, taskPrioritySelect, taskDueDateInput, taskDescriptionInput;
let tagInput, tagsList, subtaskInput, subtasksList;
let toastContainer;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');

    // Get DOM elements
    loadingScreen = document.getElementById('loadingScreen');
    authContainer = document.getElementById('authContainer');
    mainApp = document.getElementById('mainApp');
    board = document.getElementById('board');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    authTabs = document.querySelectorAll('.auth-tab');
    userBtn = document.getElementById('userBtn');
    userDropdown = document.getElementById('userDropdown');
    userAvatar = document.getElementById('userAvatar');
    userName = document.getElementById('userName');
    logoutBtn = document.getElementById('logoutBtn');
    modalOverlay = document.getElementById('modalOverlay');
    modalTitle = document.getElementById('modalTitle');
    saveBtnText = document.getElementById('saveBtnText');
    taskTitleInput = document.getElementById('taskTitle');
    taskPrioritySelect = document.getElementById('taskPriority');
    taskDueDateInput = document.getElementById('taskDueDate');
    taskDescriptionInput = document.getElementById('taskDescription');
    tagInput = document.getElementById('tagInput');
    tagsList = document.getElementById('tagsList');
    subtaskInput = document.getElementById('subtaskInput');
    subtasksList = document.getElementById('subtasksList');
    toastContainer = document.getElementById('toastContainer');

    // Setup auth tabs
    setupAuthTabs();

    // Setup auth event listeners
    setupAuthListeners();

    // Timeout fallback - show auth after 10 seconds if stuck
    const timeoutId = setTimeout(() => {
        console.log('Timeout reached, showing auth screen');
        showAuthScreen();
        showToast('Connection timeout. Please try again.', 'warning');
    }, 10000);

    try {
        // Check if Supabase is available
        if (!db) {
            throw new Error('Supabase client not initialized');
        }

        // Check auth state
        console.log('Checking session...');
        const { data, error } = await db.auth.getSession();

        if (error) {
            console.error('Session error:', error);
            throw error;
        }

        console.log('Session check result:', data.session ? 'Logged in' : 'Not logged in');
        clearTimeout(timeoutId);

        if (data.session) {
            currentUser = data.session.user;
            await initializeApp();
        } else {
            showAuthScreen();
        }

        // Listen for auth changes
        db.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                await initializeApp();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentBoard = null;
                columns = [];
                tasks = [];
                showAuthScreen();
            }
        });
    } catch (error) {
        console.error('Init error:', error);
        clearTimeout(timeoutId);
        showToast('Failed to initialize: ' + error.message, 'error');
        showAuthScreen();
    }
});

// ==================== AUTH FUNCTIONS ====================
function showAuthScreen() {
    loadingScreen.style.display = 'none';
    mainApp.style.display = 'none';
    authContainer.style.display = 'flex';
}

function showMainApp() {
    loadingScreen.style.display = 'none';
    authContainer.style.display = 'none';
    mainApp.style.display = 'block';
}

// Auth tabs - setup after DOM ready
function setupAuthTabs() {
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        });
    });
}

// Setup auth event listeners (called after DOM ready)
function setupAuthListeners() {
    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const { error } = await db.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Login successful!', 'success');
        }
    });

    // Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        const { error } = await db.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Account created!', 'success');
        }
    });

    // Google Login
    document.getElementById('googleLogin').addEventListener('click', signInWithGoogle);
    document.getElementById('googleRegister').addEventListener('click', signInWithGoogle);

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await db.auth.signOut();
        showToast('Logged out successfully', 'info');
    });

    // User dropdown toggle
    userBtn.addEventListener('click', () => {
        userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            userDropdown.classList.remove('show');
        }
    });
}

async function signInWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google'
    });
    if (error) showToast(error.message, 'error');
}

// ==================== APP INITIALIZATION ====================
async function initializeApp() {
    console.log('initializeApp called');
    try {
        // Get user profile
        console.log('Getting user profile...');
        await getUserProfile();

        // Get or create default board
        console.log('Getting board...');
        await getOrCreateBoard();

        if (!currentBoard) {
            throw new Error('Failed to get or create board');
        }

        // Load columns and tasks
        console.log('Loading columns...');
        await loadColumns();

        console.log('Loading tasks...');
        await loadTasks();

        // Setup realtime
        console.log('Setting up realtime...');
        setupRealtime();

        // Setup UI events
        console.log('Setting up UI events...');
        setupUIEvents();

        // Show main app
        showMainApp();

        // Update statistics
        updateStatistics();

        showToast('Welcome back!', 'success');
        console.log('App initialized successfully');
    } catch (error) {
        console.error('App init error:', error);
        showToast('Failed to load data: ' + error.message, 'error');
        // Still show auth screen so user can try again
        showAuthScreen();
    }
}

async function getUserProfile() {
    const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error) {
        console.log('Profile error (might be new user):', error.message);
        // Profile might not exist yet, create it
        const { error: insertError } = await db
            .from('profiles')
            .insert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]
            });

        if (insertError) {
            console.error('Failed to create profile:', insertError);
        }

        userName.textContent = currentUser.email?.split('@')[0] || 'User';
        userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        return;
    }

    if (data) {
        userName.textContent = data.full_name || data.email?.split('@')[0] || 'User';

        if (data.avatar_url) {
            userAvatar.innerHTML = `<img src="${data.avatar_url}" alt="Avatar">`;
        } else {
            userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        }
    }
}

async function getOrCreateBoard() {
    // Try to get default board
    let { data, error } = await db
        .from('boards')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_default', true)
        .single();

    if (error || !data) {
        console.log('No board found, creating one...');

        // Create board manually (in case trigger didn't work)
        const { data: newBoard, error: createError } = await db
            .from('boards')
            .insert({
                user_id: currentUser.id,
                title: 'My Kanban Board',
                is_default: true
            })
            .select()
            .single();

        if (createError) {
            console.error('Failed to create board:', createError);
            throw new Error('Failed to create board: ' + createError.message);
        }

        data = newBoard;

        // Create columns
        const columnsData = [
            { board_id: data.id, title: 'To Do', color: '#e94560', position: 0 },
            { board_id: data.id, title: 'In Progress', color: '#ffc107', position: 1 },
            { board_id: data.id, title: 'Review', color: '#00bcd4', position: 2 },
            { board_id: data.id, title: 'Done', color: '#4caf50', position: 3 },
            { board_id: data.id, title: 'Archive', color: '#6c757d', position: 4 }
        ];

        const { error: colsError } = await db
            .from('columns')
            .insert(columnsData);

        if (colsError) {
            console.error('Failed to create columns:', colsError);
        }
    }

    currentBoard = data;
    console.log('Board ready:', currentBoard.id);
}

async function loadColumns() {
    console.log('Loading columns for board:', currentBoard.id);
    const { data, error } = await db
        .from('columns')
        .select('*')
        .eq('board_id', currentBoard.id)
        .order('position');

    if (error) {
        console.error('Load columns error:', error);
        throw new Error('Failed to load columns: ' + error.message);
    }

    columns = data || [];
    console.log('Columns loaded:', columns.length);

    if (columns.length === 0) {
        console.log('No columns, creating default...');
        // Create default columns
        const columnsData = [
            { board_id: currentBoard.id, title: 'To Do', color: '#e94560', position: 0 },
            { board_id: currentBoard.id, title: 'In Progress', color: '#ffc107', position: 1 },
            { board_id: currentBoard.id, title: 'Review', color: '#00bcd4', position: 2 },
            { board_id: currentBoard.id, title: 'Done', color: '#4caf50', position: 3 },
            { board_id: currentBoard.id, title: 'Archive', color: '#6c757d', position: 4 }
        ];

        const { data: newCols, error: colsError } = await db
            .from('columns')
            .insert(columnsData)
            .select();

        if (colsError) {
            console.error('Failed to create columns:', colsError);
        } else {
            columns = newCols;
        }
    }

    renderColumns();
}

async function loadTasks() {
    console.log('Loading tasks for board:', currentBoard.id);
    const { data, error } = await db
        .from('tasks')
        .select(`
            *,
            tags (*),
            subtasks (*)
        `)
        .eq('board_id', currentBoard.id)
        .order('position');

    if (error) {
        console.error('Load tasks error:', error);
        // Don't throw, just log and continue with empty tasks
        tasks = [];
    } else {
        tasks = data || [];
    }

    console.log('Tasks loaded:', tasks.length);
    renderTasks();
}

// ==================== RENDER FUNCTIONS ====================
function renderColumns() {
    board.innerHTML = columns.map((col, index) => {
        const columnNames = ['To Do', 'In Progress', 'Review', 'Done', 'Archive'];
        const columnIcons = ['fa-clipboard-list', 'fa-spinner', 'fa-eye', 'fa-check-circle', 'fa-archive'];
        const columnClasses = ['todo-header', 'progress-header', 'review-header', 'done-header', 'archive-header'];

        const isArchive = col.title.toLowerCase() === 'archive';

        return `
            <div class="column ${isArchive ? 'archive-column' : ''}" data-id="${col.id}">
                <div class="column-header ${columnClasses[index] || ''}">
                    <div class="column-title">
                        <i class="fas ${columnIcons[index] || 'fa-list'}"></i>
                        <h2>${col.title}</h2>
                    </div>
                    <span class="task-count">0</span>
                </div>
                <div class="task-list" data-column="${col.id}"></div>
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No tasks yet</p>
                </div>
                ${!isArchive ? `<button class="add-task-btn" data-column="${col.id}"><i class="fas fa-plus"></i> Add Task</button>` : ''}
            </div>
        `;
    }).join('');

    // Initialize Sortable for each column
    document.querySelectorAll('.task-list').forEach(list => {
        new Sortable(list, {
            group: 'kanban',
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: handleTaskDrop
        });
    });

    // Add task button listeners
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.dataset.column));
    });
}

function renderTasks() {
    // Clear all task lists
    document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');

    tasks.forEach(task => {
        const columnEl = document.querySelector(`.task-list[data-column="${task.column_id}"]`);
        if (columnEl) {
            const taskEl = createTaskElement(task);
            columnEl.appendChild(taskEl);
        }
    });

    updateAllCounts();
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task';
    div.dataset.id = task.id;
    div.dataset.priority = task.priority;

    // Check overdue
    if (task.due_date && new Date(task.due_date) < new Date()) {
        div.classList.add('overdue');
    }

    const tags = task.tags || [];
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.is_completed).length;
    const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

    const isArchived = columns.find(c => c.id === task.column_id)?.title?.toLowerCase() === 'archive';

    div.innerHTML = `
        <div class="task-header">
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            <div class="task-actions">
                ${isArchived ? `
                    <button class="task-action-btn restore-btn" title="Restore">
                        <i class="fas fa-undo"></i>
                    </button>
                ` : `
                    <button class="task-action-btn edit-btn" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="task-action-btn archive-btn" title="Archive">
                        <i class="fas fa-archive"></i>
                    </button>
                `}
                <button class="task-action-btn delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <p class="task-text">${escapeHtml(task.title)}</p>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
        ${tags.length > 0 ? `
            <div class="task-tags">
                ${tags.map(tag => `<span class="tag">${escapeHtml(tag.name)}</span>`).join('')}
            </div>
        ` : ''}
        ${subtasks.length > 0 ? `
            <div class="subtask-progress">
                <div class="subtask-bar">
                    <div class="subtask-bar-fill" style="width: ${subtaskProgress}%"></div>
                </div>
                <span class="subtask-count">${completedSubtasks}/${subtasks.length}</span>
            </div>
        ` : ''}
        <div class="task-footer">
            <span class="task-date ${getDateClass(task.due_date)}">
                <i class="far fa-clock"></i> ${formatDateDisplay(task.due_date)}
            </span>
        </div>
    `;

    // Event listeners
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.task-action-btn')) {
            selectTask(div);
        }
    });

    div.querySelector('.edit-btn')?.addEventListener('click', () => openEditModal(task));
    div.querySelector('.archive-btn')?.addEventListener('click', () => archiveTask(task));
    div.querySelector('.restore-btn')?.addEventListener('click', () => restoreTask(task));
    div.querySelector('.delete-btn')?.addEventListener('click', () => deleteTask(task));

    return div;
}

// ==================== TASK OPERATIONS ====================
async function handleTaskDrop(e) {
    const taskId = e.item.dataset.id;
    const newColumnId = e.to.dataset.column;
    const newPosition = Array.from(e.to.children).indexOf(e.item);

    // Update task in database
    const { error } = await db
        .from('tasks')
        .update({
            column_id: newColumnId,
            position: newPosition
        })
        .eq('id', taskId);

    if (error) {
        showToast('Failed to move task', 'error');
        renderTasks(); // Revert
    } else {
        // Update local state
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.column_id = newColumnId;
            task.position = newPosition;
        }
        updateAllCounts();
        showToast('Task moved', 'info');
    }
}

async function saveTask() {
    const title = taskTitleInput.value.trim();
    const priority = taskPrioritySelect.value;
    const dueDate = taskDueDateInput.value || null;
    const description = taskDescriptionInput.value.trim();

    if (!title) {
        showToast('Please enter a task title', 'error');
        return;
    }

    try {
        if (editingTask) {
            // Update existing task
            const { error } = await db
                .from('tasks')
                .update({
                    title,
                    priority,
                    due_date: dueDate,
                    description
                })
                .eq('id', editingTask.id);

            if (error) throw error;

            // Update tags
            await updateTags(editingTask.id, currentTags);

            // Update subtasks
            await updateSubtasks(editingTask.id, currentSubtasks);

            showToast('Task updated!', 'success');
        } else {
            // Create new task
            const position = tasks.filter(t => t.column_id === currentColumn).length;

            const { data, error } = await db
                .from('tasks')
                .insert({
                    column_id: currentColumn,
                    board_id: currentBoard.id,
                    user_id: currentUser.id,
                    title,
                    priority,
                    due_date: dueDate,
                    description,
                    position
                })
                .select()
                .single();

            if (error) throw error;

            // Add tags
            for (const tag of currentTags) {
                await db.from('tags').insert({
                    task_id: data.id,
                    name: tag
                });
            }

            // Add subtasks
            for (let i = 0; i < currentSubtasks.length; i++) {
                await db.from('subtasks').insert({
                    task_id: data.id,
                    title: currentSubtasks[i].title,
                    position: i
                });
            }

            showToast('Task created!', 'success');
        }

        closeModal();
        await loadTasks();
        updateStatistics();
    } catch (error) {
        console.error('Save task error:', error);
        showToast('Failed to save task', 'error');
    }
}

async function deleteTask(task) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const { error } = await db
        .from('tasks')
        .delete()
        .eq('id', task.id);

    if (error) {
        showToast('Failed to delete task', 'error');
    } else {
        tasks = tasks.filter(t => t.id !== task.id);
        renderTasks();
        updateStatistics();
        showToast('Task deleted', 'error');
    }
}

async function archiveTask(task) {
    const archiveColumn = columns.find(c => c.title.toLowerCase() === 'archive');
    if (!archiveColumn) return;

    const { error } = await db
        .from('tasks')
        .update({
            column_id: archiveColumn.id,
            is_archived: true
        })
        .eq('id', task.id);

    if (error) {
        showToast('Failed to archive task', 'error');
    } else {
        task.column_id = archiveColumn.id;
        task.is_archived = true;
        renderTasks();
        updateStatistics();
        showToast('Task archived', 'info');
    }
}

async function restoreTask(task) {
    const todoColumn = columns.find(c => c.title.toLowerCase() === 'to do');
    if (!todoColumn) return;

    const { error } = await db
        .from('tasks')
        .update({
            column_id: todoColumn.id,
            is_archived: false
        })
        .eq('id', task.id);

    if (error) {
        showToast('Failed to restore task', 'error');
    } else {
        task.column_id = todoColumn.id;
        task.is_archived = false;
        renderTasks();
        updateStatistics();
        showToast('Task restored', 'success');
    }
}

async function updateTags(taskId, tags) {
    // Delete existing tags
    await db.from('tags').delete().eq('task_id', taskId);

    // Insert new tags
    for (const tag of tags) {
        await db.from('tags').insert({
            task_id: taskId,
            name: tag
        });
    }
}

async function updateSubtasks(taskId, subtasks) {
    // Get existing subtasks
    const { data: existing } = await db
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId);

    // Delete removed subtasks
    const existingIds = existing?.map(s => s.id) || [];
    const newIds = subtasks.filter(s => s.id).map(s => s.id);

    for (const id of existingIds) {
        if (!newIds.includes(id)) {
            await db.from('subtasks').delete().eq('id', id);
        }
    }

    // Upsert subtasks
    for (let i = 0; i < subtasks.length; i++) {
        if (subtasks[i].id) {
            await db
                .from('subtasks')
                .update({
                    title: subtasks[i].title,
                    is_completed: subtasks[i].is_completed,
                    position: i
                })
                .eq('id', subtasks[i].id);
        } else {
            await db.from('subtasks').insert({
                task_id: taskId,
                title: subtasks[i].title,
                position: i
            });
        }
    }
}

// ==================== MODAL FUNCTIONS ====================
function openModal(columnId) {
    currentColumn = columnId;
    editingTask = null;
    currentTags = [];
    currentSubtasks = [];

    modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Task';
    saveBtnText.textContent = 'Add Task';
    clearForm();

    modalOverlay.classList.add('active');
    setTimeout(() => taskTitleInput.focus(), 100);
}

function openEditModal(task) {
    editingTask = task;
    currentColumn = task.column_id;

    taskTitleInput.value = task.title;
    taskPrioritySelect.value = task.priority;
    taskDueDateInput.value = task.due_date || '';
    taskDescriptionInput.value = task.description || '';
    currentTags = task.tags?.map(t => t.name) || [];
    currentSubtasks = task.subtasks?.map(s => ({
        id: s.id,
        title: s.title,
        is_completed: s.is_completed
    })) || [];

    renderTags();
    renderSubtasks();

    modalTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Task';
    saveBtnText.textContent = 'Save Changes';
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    clearForm();
    editingTask = null;
    currentColumn = null;
}

function clearForm() {
    taskTitleInput.value = '';
    taskPrioritySelect.value = 'medium';
    taskDueDateInput.value = '';
    taskDescriptionInput.value = '';
    currentTags = [];
    currentSubtasks = [];
    renderTags();
    renderSubtasks();
}

// ==================== TAGS & SUBTASKS ====================
function renderTags() {
    tagsList.innerHTML = currentTags.map((tag, i) => `
        <span class="tag-item">
            ${escapeHtml(tag)}
            <button type="button" onclick="removeTag(${i})">&times;</button>
        </span>
    `).join('');
}

function removeTag(index) {
    currentTags.splice(index, 1);
    renderTags();
}

tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        if (tag && !currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags();
        }
        tagInput.value = '';
    }
});

function renderSubtasks() {
    subtasksList.innerHTML = currentSubtasks.map((subtask, i) => `
        <div class="subtask-item ${subtask.is_completed ? 'completed' : ''}">
            <input type="checkbox" ${subtask.is_completed ? 'checked' : ''} onchange="toggleSubtask(${i})">
            <span>${escapeHtml(subtask.title)}</span>
            <button type="button" onclick="removeSubtask(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function toggleSubtask(index) {
    currentSubtasks[index].is_completed = !currentSubtasks[index].is_completed;
    renderSubtasks();
}

function removeSubtask(index) {
    currentSubtasks.splice(index, 1);
    renderSubtasks();
}

subtaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const title = subtaskInput.value.trim();
        if (title) {
            currentSubtasks.push({ title, is_completed: false });
            renderSubtasks();
        }
        subtaskInput.value = '';
    }
});

document.getElementById('addSubtaskBtn').addEventListener('click', () => {
    const title = subtaskInput.value.trim();
    if (title) {
        currentSubtasks.push({ title, is_completed: false });
        renderSubtasks();
    }
    subtaskInput.value = '';
});

// Make functions global for onclick
window.removeTag = removeTag;
window.toggleSubtask = toggleSubtask;
window.removeSubtask = removeSubtask;

// ==================== REALTIME ====================
function setupRealtime() {
    realtimeChannel = db
        .channel('kanban-changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `board_id=eq.${currentBoard.id}`
        }, async (payload) => {
            console.log('Task change:', payload);
            await loadTasks();
            updateStatistics();
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tags'
        }, async () => {
            await loadTasks();
        })
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'subtasks'
        }, async () => {
            await loadTasks();
        })
        .subscribe((status) => {
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-text');

            if (status === 'SUBSCRIBED') {
                statusDot?.classList.remove('disconnected');
                if (statusText) statusText.textContent = 'Connected';
            } else {
                statusDot?.classList.add('disconnected');
                if (statusText) statusText.textContent = 'Disconnected';
            }
        });
}

// ==================== UI HELPERS ====================
function selectTask(el) {
    document.querySelectorAll('.task.selected').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    selectedTask = el;
}

function updateAllCounts() {
    document.querySelectorAll('.column').forEach(col => {
        const columnId = col.dataset.id;
        const count = tasks.filter(t => t.column_id === columnId).length;
        col.querySelector('.task-count').textContent = count;

        const emptyState = col.querySelector('.empty-state');
        if (count === 0) {
            emptyState?.classList.add('show');
        } else {
            emptyState?.classList.remove('show');
        }
    });
}

function updateStatistics() {
    const stats = { todo: 0, inprogress: 0, review: 0, done: 0, archive: 0 };
    const priorities = { high: 0, medium: 0, low: 0 };

    columns.forEach(col => {
        const key = col.title.toLowerCase().replace(' ', '');
        stats[key] = tasks.filter(t => t.column_id === col.id).length;
    });

    tasks.forEach(t => {
        priorities[t.priority]++;
    });

    document.getElementById('statTodo').textContent = stats.todo;
    document.getElementById('statProgress').textContent = stats.inprogress;
    document.getElementById('statReview').textContent = stats.review;
    document.getElementById('statDone').textContent = stats.done;

    const total = stats.todo + stats.inprogress + stats.review + stats.done;
    const progress = total > 0 ? Math.round((stats.done / total) * 100) : 0;

    document.getElementById('progressPercent').textContent = progress + '%';
    document.getElementById('progressFill').style.width = progress + '%';

    const maxP = Math.max(priorities.high, priorities.medium, priorities.low, 1);
    document.getElementById('barHigh').style.width = (priorities.high / maxP * 100) + '%';
    document.getElementById('barMedium').style.width = (priorities.medium / maxP * 100) + '%';
    document.getElementById('barLow').style.width = (priorities.low / maxP * 100) + '%';

    document.getElementById('countHigh').textContent = priorities.high;
    document.getElementById('countMedium').textContent = priorities.medium;
    document.getElementById('countLow').textContent = priorities.low;
}

function formatDateDisplay(date) {
    if (!date) return 'No due date';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < -1) return `Overdue (${Math.abs(diff)} days)`;
    if (diff <= 7) return `${diff} days left`;

    return due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getDateClass(date) {
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== UI EVENT SETUP ====================
function setupUIEvents() {
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.task').forEach(task => {
            const text = task.querySelector('.task-text').textContent.toLowerCase();
            task.classList.toggle('hidden', !text.includes(query) && query);
        });
        updateAllCounts();
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const icon = document.querySelector('#themeToggle i');
        icon.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    });

    // Load saved theme
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    }

    // Stats panel
    document.getElementById('statsBtn').addEventListener('click', () => {
        document.getElementById('statsPanel').classList.toggle('active');
    });
    document.getElementById('closeStats').addEventListener('click', () => {
        document.getElementById('statsPanel').classList.remove('active');
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Shortcuts modal
    document.getElementById('shortcutsModal').querySelector('.modal-close')
        .addEventListener('click', () => document.getElementById('shortcutsModal').classList.remove('active'));
    document.getElementById('shortcutsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('shortcutsModal')) {
            document.getElementById('shortcutsModal').classList.remove('active');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch (e.key.toLowerCase()) {
        case 'n':
            e.preventDefault();
            const todoCol = columns.find(c => c.title.toLowerCase() === 'to do');
            if (todoCol) openModal(todoCol.id);
            break;
        case 'escape':
            closeModal();
            document.getElementById('shortcutsModal').classList.remove('active');
            document.getElementById('statsPanel').classList.remove('active');
            break;
        case 's':
            e.preventDefault();
            document.getElementById('statsPanel').classList.toggle('active');
            break;
        case 't':
            e.preventDefault();
            document.getElementById('themeToggle').click();
            break;
        case '?':
            e.preventDefault();
            document.getElementById('shortcutsModal').classList.toggle('active');
            break;
        case 'delete':
        case 'backspace':
            if (selectedTask) {
                e.preventDefault();
                const taskId = selectedTask.dataset.id;
                const task = tasks.find(t => t.id === taskId);
                if (task) deleteTask(task);
            }
            break;
    }
}

function exportData() {
    const data = {
        board: currentBoard,
        columns,
        tasks,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported!', 'success');
}
