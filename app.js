// 1. Supabase Initialization
const SUPABASE_URL = "https://bgivjkmybvltqizkvlbg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnaXZqa215YnZsdHFpemt2bGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzAwNjMsImV4cCI6MjA5NzUwNjA2M30.jKgLZZDy_rnWXeDkYG7_U188IX6Ssxj3Yjs3TqL2TAs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Application State
let currentUser = null;
let subjects = [];
let studyLogs = [];
let weeklyChart = null;

// Timer State
let timerInterval = null;
let timerSeconds = 0;
let timerSubjectId = null;
let timerStartTime = null;
let timerIsPaused = false;

// 3. Document Elements Cache
const elements = {
  guestNav: document.getElementById('guest-nav'),
  authNav: document.getElementById('auth-nav'),
  displayUserEmail: document.getElementById('display-user-email'),
  logoutBtn: document.getElementById('logout-btn'),
  
  // Views
  views: {
    home: document.getElementById('home-view'),
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view'),
    report: document.getElementById('report-view')
  },
  
  // Auth Form Elements
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  signupForm: document.getElementById('signup-form'),
  signupEmail: document.getElementById('signup-email'),
  signupPassword: document.getElementById('signup-password'),
  
  // Dashboard Elements
  dashboardGreeting: document.getElementById('dashboard-greeting'),
  streakCountVal: document.getElementById('streak-count-val'),
  streakCard: document.getElementById('streak-card'),
  todayTotalTime: document.getElementById('today-total-time'),
  timerSubjectSelect: document.getElementById('timer-subject-select'),
  timerClock: document.getElementById('timer-clock'),
  timerStatus: document.getElementById('timer-status'),
  timerCircleProgress: document.getElementById('timer-circle-progress'),
  timerStartBtn: document.getElementById('timer-start-btn'),
  timerPauseBtn: document.getElementById('timer-pause-btn'),
  timerStopBtn: document.getElementById('timer-stop-btn'),
  timerPanel: document.getElementById('timer-panel'),
  dashboardSubjectsList: document.getElementById('dashboard-subjects-list'),
  todayActivityList: document.getElementById('today-activity-list'),
  
  // Modal Elements
  addSubjectModal: document.getElementById('add-subject-modal'),
  addSubjectTrigger: document.getElementById('add-subject-trigger'),
  addSubjectCloseBtn: document.getElementById('add-subject-close-btn'),
  addSubjectCancelBtn: document.getElementById('add-subject-cancel-btn'),
  addSubjectForm: document.getElementById('add-subject-form'),
  subjectNameInput: document.getElementById('subject-name-input'),
  suggestedChipsContainer: document.getElementById('suggested-chips-container'),
  chipUpsc: document.getElementById('chip-filter-upsc'),
  chipJee: document.getElementById('chip-filter-jee'),
  chipNeet: document.getElementById('chip-filter-neet'),
  
  // Report Elements
  reportSubjectsList: document.getElementById('report-subjects-list'),
  reportCumulativeTime: document.getElementById('report-cumulative-time'),
  toastContainer: document.getElementById('toast-container')
};

// 4. Suggested Subjects List
const SUGGESTED_SUBJECTS = {
  upsc: [
    "Indian Polity", "Modern History", "Geography", "Indian Economy",
    "Environment & Ecology", "Science & Tech", "Ancient & Medieval History", "Current Affairs"
  ],
  jee: [
    "Physics: Mechanics", "Physics: Electromagnetism", "Chemistry: Organic",
    "Chemistry: Inorganic", "Chemistry: Physical", "Mathematics: Calculus", "Mathematics: Algebra"
  ],
  neet: [
    "Biology: Zoology", "Biology: Botany", "Chemistry: Organic",
    "Chemistry: Inorganic", "Chemistry: Physical", "Physics: Mechanics", "Physics: Optics"
  ]
};

// 5. Toast System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Trigger animation reflow
  setTimeout(() => toast.classList.add('toast-show'), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 6. Router System
const routes = {
  '#/home': 'home',
  '#/auth': 'auth',
  '#/dashboard': 'dashboard',
  '#/report': 'report'
};

function router() {
  const hash = window.location.hash || '#/home';
  const targetView = routes[hash] || 'home';
  
  // Route Guards: Redirect based on authentication
  if (!currentUser && (targetView === 'dashboard' || targetView === 'report')) {
    window.location.hash = '#/auth';
    showToast('Please log in to access this page.', 'error');
    return;
  }
  
  if (currentUser && (targetView === 'home' || targetView === 'auth')) {
    window.location.hash = '#/dashboard';
    return;
  }
  
  // Deactivate all views, activate target view
  Object.keys(elements.views).forEach(key => {
    elements.views[key].classList.remove('active-view');
  });
  
  elements.views[targetView].classList.add('active-view');
  
  // Navigation Links Active Styling
  const activeNavClass = 'active';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add(activeNavClass);
    } else {
      link.classList.remove(activeNavClass);
    }
  });

  // Perform view-specific data refresh
  if (currentUser) {
    if (targetView === 'dashboard') {
      loadDashboardData();
    } else if (targetView === 'report') {
      loadReportData();
    }
  }
}

// Switch authentication tabs (Login/Signup)
function switchAuthTab(type) {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  
  if (type === 'login') {
    tabLogin.classList.add('active-tab');
    tabSignup.classList.remove('active-tab');
    formLogin.classList.add('active-form');
    formSignup.classList.remove('active-form');
  } else {
    tabSignup.classList.add('active-tab');
    tabLogin.classList.remove('active-tab');
    formSignup.classList.add('active-form');
    formLogin.classList.remove('active-form');
  }
}

// 7. Auth Logic
async function handleLogin(e) {
  e.preventDefault();
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showToast('Logged in successfully!', 'success');
  } catch (error) {
    console.error('Login error:', error);
    showToast(error.message || 'Login failed.', 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = elements.signupEmail.value.trim();
  const password = elements.signupPassword.value;
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    
    // Check if user is signed in immediately
    if (data.session) {
      showToast('Account created and logged in!', 'success');
    } else {
      showToast('Registration successful! Please check your email for confirmation link.', 'info');
      switchAuthTab('login');
      elements.loginEmail.value = email;
    }
  } catch (error) {
    console.error('Signup error:', error);
    showToast(error.message || 'Registration failed.', 'error');
  }
}

async function handleLogout() {
  // If timer is running, stop it first
  if (timerInterval) {
    stopTimerAndLog(false); // discard or force-log if requested, but let's reset timer silently on logout
    resetTimer();
  }
  
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null;
    updateNavigation();
    window.location.hash = '#/home';
    showToast('Logged out successfully.', 'info');
  } catch (error) {
    showToast(error.message || 'Logout failed.', 'error');
  }
}

function updateNavigation() {
  if (currentUser) {
    elements.guestNav.style.display = 'none';
    elements.authNav.style.display = 'flex';
    elements.displayUserEmail.textContent = currentUser.email;
  } else {
    elements.guestNav.style.display = 'flex';
    elements.authNav.style.display = 'none';
  }
}

// Listen to Auth State Changes
supabaseClient.auth.onAuthStateChange((event, session) => {
  currentUser = session ? session.user : null;
  updateNavigation();
  router(); // Re-run router on auth state change
});

// 8. Database Operations & Data Loaders
async function fetchSubjects() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    subjects = data || [];
  } catch (error) {
    showToast('Failed to fetch subjects.', 'error');
    console.error(error);
  }
}

async function fetchStudyLogs() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('study_logs')
      .select('*')
      .order('start_time', { ascending: false });
      
    if (error) throw error;
    studyLogs = data || [];
  } catch (error) {
    showToast('Failed to fetch study logs.', 'error');
    console.error(error);
  }
}

async function loadDashboardData() {
  await Promise.all([fetchSubjects(), fetchStudyLogs()]);
  
  // Set greeting
  const hour = new Date().getHours();
  let greeting = "Namaste";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";
  elements.dashboardGreeting.textContent = `${greeting}, ${currentUser.email.split('@')[0]}!`;
  
  populateTimerDropdown();
  renderSubjects();
  renderDashboardStats();
  renderActivityList();
}

async function loadReportData() {
  await Promise.all([fetchSubjects(), fetchStudyLogs()]);
  renderReportBreakdown();
  renderWeeklyChart();
}

// 9. Subject Manager Dialog Logic
function setupSubjectSuggestions(examType) {
  elements.suggestedChipsContainer.innerHTML = '';
  const list = SUGGESTED_SUBJECTS[examType] || [];
  
  list.forEach(subject => {
    const chip = document.createElement('span');
    chip.className = 'exam-chip';
    chip.textContent = subject;
    chip.addEventListener('click', () => {
      elements.subjectNameInput.value = subject;
    });
    elements.suggestedChipsContainer.appendChild(chip);
  });
}

function handleExamFilterTabClick(selectedChip, examKey) {
  [elements.chipUpsc, elements.chipJee, elements.chipNeet].forEach(chip => {
    chip.classList.remove('active-chip');
  });
  selectedChip.classList.add('active-chip');
  setupSubjectSuggestions(examKey);
}

async function handleAddSubjectSubmit(e) {
  e.preventDefault();
  const name = elements.subjectNameInput.value.trim();
  if (!name) return;
  
  // Avoid duplicate local names
  if (subjects.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
    showToast(`Subject "${name}" already exists.`, 'error');
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('subjects')
      .insert([{ name, user_id: currentUser.id }])
      .select();
      
    if (error) throw error;
    
    showToast(`Subject "${name}" added successfully!`, 'success');
    closeSubjectModal();
    await loadDashboardData();
  } catch (error) {
    console.error('Add subject error:', error);
    showToast(error.message || 'Failed to add subject.', 'error');
  }
}

async function handleDeleteSubject(subjectId, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This will delete all associated study logs for this subject.`)) {
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('subjects')
      .delete()
      .eq('id', subjectId);
      
    if (error) throw error;
    
    // If deleted subject was selected in timer, reset timer
    if (timerSubjectId === subjectId) {
      resetTimer();
    }
    
    showToast(`Subject "${name}" deleted.`, 'info');
    await loadDashboardData();
  } catch (error) {
    console.error('Delete subject error:', error);
    showToast(error.message || 'Failed to delete subject.', 'error');
  }
}

function openSubjectModal() {
  elements.subjectNameInput.value = '';
  handleExamFilterTabClick(elements.chipUpsc, 'upsc'); // default
  elements.addSubjectModal.classList.add('active-modal');
}

function closeSubjectModal() {
  elements.addSubjectModal.classList.remove('active-modal');
}

// Helper to format date string to YYYY-MM-DD based on local timezone
function getLocalDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 10. Dashboard UI Renderers
function populateTimerDropdown() {
  // Save current selection if any
  const previousSelection = elements.timerSubjectSelect.value;
  
  elements.timerSubjectSelect.innerHTML = '<option value="" disabled selected>-- Select Subject --</option>';
  
  subjects.forEach(sub => {
    const option = document.createElement('option');
    option.value = sub.id;
    option.textContent = sub.name;
    elements.timerSubjectSelect.appendChild(option);
  });
  
  if (previousSelection && subjects.some(s => s.id === previousSelection)) {
    elements.timerSubjectSelect.value = previousSelection;
    elements.timerStartBtn.removeAttribute('disabled');
  } else if (!timerSubjectId) {
    elements.timerStartBtn.setAttribute('disabled', 'true');
  }
}

function renderSubjects() {
  elements.dashboardSubjectsList.innerHTML = '';
  
  if (subjects.length === 0) {
    elements.dashboardSubjectsList.innerHTML = '<div class="empty-state">No subjects added yet. Click "Add Subject" to begin!</div>';
    return;
  }
  
  // Calculate today's time per subject
  const todayStr = getLocalDateString(new Date());
  const todayLogs = studyLogs.filter(log => getLocalDateString(new Date(log.start_time)) === todayStr);
  
  subjects.forEach(sub => {
    const subLogs = todayLogs.filter(log => log.subject_id === sub.id);
    const totalSecsToday = subLogs.reduce((sum, log) => sum + log.duration, 0);
    const todayFormatted = formatDurationShort(totalSecsToday);
    
    const card = document.createElement('div');
    card.className = 'subject-card';
    
    // Play button disables if timer is already running for a different subject
    const isThisRunning = timerSubjectId === sub.id && timerInterval;
    
    card.innerHTML = `
      <div class="subject-card-header">
        <span class="subject-name">${escapeHTML(sub.name)}</span>
        <button class="subject-delete-btn" onclick="handleDeleteSubject('${sub.id}', '${escapeHTML(sub.name).replace(/'/g, "\\'")}')" title="Delete Subject">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <div class="subject-card-footer">
        <div class="subject-today-time">
          <i class="fa-solid fa-calendar-day"></i> Today: <span style="font-weight: 700;">${todayFormatted}</span>
        </div>
        <button class="subject-play-btn" onclick="quickStartSubject('${sub.id}')" title="Start Timer">
          <i class="fa-solid ${isThisRunning ? 'fa-square' : 'fa-play'}"></i>
        </button>
      </div>
    `;
    elements.dashboardSubjectsList.appendChild(card);
  });
}

function renderActivityList() {
  elements.todayActivityList.innerHTML = '';
  
  const todayStr = getLocalDateString(new Date());
  const todayLogs = studyLogs.filter(log => getLocalDateString(new Date(log.start_time)) === todayStr);
  
  if (todayLogs.length === 0) {
    elements.todayActivityList.innerHTML = '<div class="empty-state">No sessions logged today.</div>';
    return;
  }
  
  todayLogs.forEach(log => {
    const sub = subjects.find(s => s.id === log.subject_id);
    const subjectName = sub ? sub.name : 'Deleted Subject';
    const startTimeLocal = new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeLocal = new Date(log.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-details">
        <span class="activity-subject">${escapeHTML(subjectName)}</span>
        <span class="activity-time">${startTimeLocal} - ${endTimeLocal}</span>
      </div>
      <span class="activity-duration">+${formatDurationShort(log.duration)}</span>
    `;
    elements.todayActivityList.appendChild(item);
  });
}

function renderDashboardStats() {
  const todayStr = getLocalDateString(new Date());
  
  // 1. Calculate Today's Time
  const todayLogs = studyLogs.filter(log => getLocalDateString(new Date(log.start_time)) === todayStr);
  const totalSecsToday = todayLogs.reduce((sum, log) => sum + log.duration, 0);
  elements.todayTotalTime.textContent = formatDurationLong(totalSecsToday);
  
  // 2. Calculate Daily Streak (>= 30 mins, i.e., 1800 seconds)
  const streak = calculateStreak(studyLogs);
  elements.streakCountVal.textContent = streak;
  
  if (streak > 0) {
    elements.streakCard.classList.add('streak-active');
  } else {
    elements.streakCard.classList.remove('streak-active');
  }
}

// 11. Streak Logic
function calculateStreak(logs) {
  if (logs.length === 0) return 0;
  
  // Group logs by local date YYYY-MM-DD
  const durationPerDate = {};
  logs.forEach(log => {
    const localDate = getLocalDateString(new Date(log.start_time));
    durationPerDate[localDate] = (durationPerDate[localDate] || 0) + log.duration;
  });
  
  // Filter dates with >= 30 minutes (1800 seconds)
  const validDates = new Set();
  Object.keys(durationPerDate).forEach(dateStr => {
    if (durationPerDate[dateStr] >= 1800) {
      validDates.add(dateStr);
    }
  });
  
  const todayStr = getLocalDateString(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  let streakCount = 0;
  let checkDate = new Date(); // Start checking from today
  
  // Case A: User has met the 30-min goal today
  if (validDates.has(todayStr)) {
    streakCount = 1;
    // Iterate backwards
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalDateString(checkDate);
      if (validDates.has(checkStr)) {
        streakCount++;
      } else {
        break;
      }
    }
  } 
  // Case B: User hasn't met the 30-min goal today, check if yesterday was valid (streak is preserved today)
  else if (validDates.has(yesterdayStr)) {
    streakCount = 1;
    checkDate.setDate(checkDate.getDate() - 1); // Start backwards check from yesterday
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalDateString(checkDate);
      if (validDates.has(checkStr)) {
        streakCount++;
      } else {
        break;
      }
    }
  }
  
  return streakCount;
}

// 12. Weekly Report UI Renderers
function renderReportBreakdown() {
  elements.reportSubjectsList.innerHTML = '';
  
  // Filter logs in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);
  
  const recentLogs = studyLogs.filter(log => new Date(log.start_time) >= sevenDaysAgo);
  const subjectSums = {};
  
  // Initialize sums
  subjects.forEach(s => subjectSums[s.id] = 0);
  
  recentLogs.forEach(log => {
    if (subjectSums[log.subject_id] !== undefined) {
      subjectSums[log.subject_id] += log.duration;
    }
  });
  
  const sortedSums = Object.entries(subjectSums)
    .map(([subId, secs]) => ({
      subId,
      name: subjects.find(s => s.id === subId)?.name || 'Deleted Subject',
      hours: secs / 3600
    }))
    .sort((a, b) => b.hours - a.hours);
    
  let cumulativeHours = 0;
  const colors = getSubjectColorPalette(subjects.length);
  
  if (sortedSums.length === 0 || sortedSums.every(s => s.hours === 0)) {
    elements.reportSubjectsList.innerHTML = '<div class="empty-state">No study time recorded in the last 7 days.</div>';
    elements.reportCumulativeTime.textContent = '0.0 hrs';
    return;
  }
  
  sortedSums.forEach((item, index) => {
    cumulativeHours += item.hours;
    const color = colors[index % colors.length];
    
    const div = document.createElement('div');
    div.className = 'stats-breakdown-item';
    div.innerHTML = `
      <span class="stats-breakdown-name">
        <span class="stats-breakdown-bullet" style="background-color: ${color};"></span>
        ${escapeHTML(item.name)}
      </span>
      <span class="stats-breakdown-val">${item.hours.toFixed(1)} hrs</span>
    `;
    elements.reportSubjectsList.appendChild(div);
  });
  
  elements.reportCumulativeTime.textContent = `${cumulativeHours.toFixed(1)} hrs`;
}

function renderWeeklyChart() {
  if (weeklyChart) {
    weeklyChart.destroy();
  }
  
  const ctx = document.getElementById('weekly-chart').getContext('2d');
  
  // Generate last 7 days labels (local time)
  const labels = [];
  const dateStrings = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    dateStrings.push(getLocalDateString(d));
  }
  
  // Datasets preparation
  const palette = getSubjectColorPalette(subjects.length);
  const datasets = subjects.map((sub, idx) => {
    const data = dateStrings.map(dateStr => {
      // Find logs for this subject on this date
      const logs = studyLogs.filter(log => 
        log.subject_id === sub.id && 
        getLocalDateString(new Date(log.start_time)) === dateStr
      );
      const totalSecs = logs.reduce((sum, log) => sum + log.duration, 0);
      return parseFloat((totalSecs / 3600).toFixed(2)); // Hours
    });
    
    return {
      label: sub.name,
      data: data,
      backgroundColor: palette[idx % palette.length],
      borderColor: 'transparent',
      borderRadius: 4,
      borderSkipped: false
    };
  });
  
  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: {
              family: 'Plus Jakarta Sans',
              weight: '600'
            },
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 4,
            useBorderRadius: true
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
          bodyFont: { family: 'Plus Jakarta Sans' },
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.raw !== undefined) label += context.raw.toFixed(1) + ' hrs';
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 10 }
          }
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 10 },
            callback: function(value) { return value + 'h'; }
          }
        }
      }
    }
  });
}

function getSubjectColorPalette(numSubjects) {
  // Sleek vibrant neon HSL colors matching the UI theme
  return [
    'rgba(99, 102, 241, 0.85)',  // Indigo
    'rgba(168, 85, 247, 0.85)',  // Purple/Violet
    'rgba(16, 185, 129, 0.85)',  // Emerald
    'rgba(245, 158, 11, 0.85)',  // Amber
    'rgba(244, 63, 94, 0.85)',   // Rose
    'rgba(6, 182, 212, 0.85)',   // Cyan
    'rgba(234, 179, 8, 0.85)',   // Yellow
    'rgba(236, 72, 153, 0.85)'   // Pink
  ];
}

// 13. Focus Timer Engine
function updateTimerUI() {
  const hours = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(timerSeconds % 60).padStart(2, '0');
  
  elements.timerClock.textContent = `${hours}:${minutes}:${seconds}`;
  
  // Update progress circle offset
  const maxSeconds = 3600; // Visual complete circle represents 1 hour
  const progressPercent = Math.min(timerSeconds / maxSeconds, 1);
  const totalDash = 628;
  const offset = totalDash - (progressPercent * totalDash);
  elements.timerCircleProgress.style.strokeDashoffset = offset;
}

function startTimer() {
  if (timerInterval) return; // already running
  
  if (!timerSubjectId) {
    showToast('Please select a subject to study.', 'error');
    return;
  }
  
  if (!timerStartTime) {
    timerStartTime = new Date().toISOString();
  }
  
  timerIsPaused = false;
  elements.timerStatus.textContent = "Focusing";
  elements.timerPanel.classList.add('timer-running');
  
  elements.timerStartBtn.style.display = 'none';
  elements.timerPauseBtn.style.display = 'inline-flex';
  elements.timerStopBtn.style.display = 'inline-flex';
  elements.timerSubjectSelect.setAttribute('disabled', 'true');
  
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerUI();
  }, 1000);
  
  showToast('Timer started! Stay focused.', 'success');
  renderSubjects(); // Update play icons
}

function pauseTimer() {
  if (!timerInterval) return;
  
  clearInterval(timerInterval);
  timerInterval = null;
  timerIsPaused = true;
  
  elements.timerStatus.textContent = "Paused";
  elements.timerPanel.classList.remove('timer-running');
  
  elements.timerPauseBtn.style.display = 'none';
  elements.timerStartBtn.style.display = 'inline-flex';
  elements.timerStartBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
  
  showToast('Timer paused.', 'info');
}

async function stopTimerAndLog(shouldSave = true) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const loggedSeconds = timerSeconds;
  const startTime = timerStartTime;
  const subjectId = timerSubjectId;
  
  resetTimer();
  
  if (!shouldSave || loggedSeconds < 1) {
    showToast('Session discarded.', 'info');
    return;
  }
  
  const endTime = new Date().toISOString();
  const subName = subjects.find(s => s.id === subjectId)?.name || 'Subject';
  
  try {
    const { error } = await supabaseClient
      .from('study_logs')
      .insert([{
        subject_id: subjectId,
        start_time: startTime,
        end_time: endTime,
        duration: loggedSeconds,
        user_id: currentUser.id
      }]);
      
    if (error) throw error;
    
    showToast(`Logged ${formatDurationLong(loggedSeconds)} to ${subName}!`, 'success');
    
    // Confetti celebration if they studied >= 30 mins (1800 seconds)
    if (loggedSeconds >= 1800) {
      triggerConfetti();
    }
    
    await loadDashboardData();
  } catch (error) {
    showToast(error.message || 'Failed to save study session.', 'error');
    console.error(error);
  }
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerSeconds = 0;
  timerSubjectId = null;
  timerStartTime = null;
  timerIsPaused = false;
  
  elements.timerStatus.textContent = "Paused";
  elements.timerPanel.classList.remove('timer-running');
  
  elements.timerStartBtn.style.display = 'inline-flex';
  elements.timerStartBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
  elements.timerStartBtn.setAttribute('disabled', 'true');
  elements.timerPauseBtn.style.display = 'none';
  elements.timerStopBtn.style.display = 'none';
  
  elements.timerSubjectSelect.removeAttribute('disabled');
  elements.timerSubjectSelect.value = '';
  
  updateTimerUI();
  renderSubjects(); // Update play icons
}

function quickStartSubject(subjectId) {
  // If timer is already running for this subject, stop and log it
  if (timerSubjectId === subjectId && timerInterval) {
    stopTimerAndLog(true);
    return;
  }
  
  // If timer is running for another subject, ask user
  if (timerSubjectId && timerSubjectId !== subjectId) {
    if (!confirm('Another session is already tracking. Log current session and start this one?')) {
      return;
    }
    stopTimerAndLog(true);
  }
  
  // Select subject in dropdown and start
  elements.timerSubjectSelect.value = subjectId;
  timerSubjectId = subjectId;
  elements.timerStartBtn.removeAttribute('disabled');
  startTimer();
}

function triggerConfetti() {
  const duration = 4 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, animate a bit higher than random
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
  
  showToast('Amazing study session! You hit your 30-minute goal today! 🔥', 'success');
}

// 14. Event Listeners & Bootstrapping
function init() {
  // Router Hooks
  window.addEventListener('hashchange', router);
  
  // Auth Form Handlers
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.signupForm.addEventListener('submit', handleSignup);
  elements.logoutBtn.addEventListener('click', handleLogout);
  
  // Modal Trigger Handlers
  elements.addSubjectTrigger.addEventListener('click', openSubjectModal);
  elements.addSubjectCloseBtn.addEventListener('click', closeSubjectModal);
  elements.addSubjectCancelBtn.addEventListener('click', closeSubjectModal);
  elements.addSubjectForm.addEventListener('submit', handleAddSubjectSubmit);
  
  // Modal Exam Suggestions Handlers
  elements.chipUpsc.addEventListener('click', () => handleExamFilterTabClick(elements.chipUpsc, 'upsc'));
  elements.chipJee.addEventListener('click', () => handleExamFilterTabClick(elements.chipJee, 'jee'));
  elements.chipNeet.addEventListener('click', () => handleExamFilterTabClick(elements.chipNeet, 'neet'));
  
  // Timer Dropdown selection
  elements.timerSubjectSelect.addEventListener('change', (e) => {
    timerSubjectId = e.target.value;
    if (timerSubjectId) {
      elements.timerStartBtn.removeAttribute('disabled');
    } else {
      elements.timerStartBtn.setAttribute('disabled', 'true');
    }
  });
  
  // Timer Button Click Hooks
  elements.timerStartBtn.addEventListener('click', startTimer);
  elements.timerPauseBtn.addEventListener('click', pauseTimer);
  elements.timerStopBtn.addEventListener('click', () => stopTimerAndLog(true));
  
  // Check auth state initially
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    currentUser = session ? session.user : null;
    updateNavigation();
    router();
  });
}

// 15. Helper Utilities
function formatDurationShort(totalSeconds) {
  if (totalSeconds === 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  let formatted = '';
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0 || hours === 0) formatted += `${minutes}m`;
  return formatted.trim();
}

function formatDurationLong(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Run bootstrapping
document.addEventListener('DOMContentLoaded', init);
