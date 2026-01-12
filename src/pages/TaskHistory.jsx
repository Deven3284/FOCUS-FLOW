import React, { useMemo, useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useUserStore } from '../store/useUserStore';
import { useMasterStore } from '../store/useMasterStore';
import { FiUser, FiClock, FiFilter } from "react-icons/fi";
import {
    Box, Typography, Paper, Button, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, FormControl, InputLabel, TextField,
    Stack, InputAdornment, Grid, Card, CardContent, Divider, Fade, Zoom, IconButton, Container, Autocomplete
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    CalendarMonth as CalendarMonthIcon,
    AccessTime as AccessTimeIcon,
    Add as AddIcon,
    FilterList as FilterListIcon,
    CheckCircleOutline as CheckIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const TaskHistory = () => {
    const { history, historyFilterUserId, setHistoryFilterUserId, addHistorySession } = useTaskStore();
    const { role, currentUser } = useUserStore();
    const { users } = useMasterStore();
    const [selectedSession, setSelectedSession] = useState(null);
    const [openBackDayTask, setOpenBackDayTask] = useState(false);
    const [workTypeFilter, setWorkTypeFilter] = useState('All'); // New Filter State
    const [backTaskData, setBackTaskData] = useState({
        title: '',
        priority: 'Medium',
        workType: 'All', // Default work type
        // Fix: Use IST Date string
        date: new Date().toLocaleDateString('en-In', { timeZone: 'Asia/Kolkata' }), // YYYY-MM-DD in IST
        startTime: '09:00',
        endTime: '18:00',
        userId: historyFilterUserId || ''
    });



    // Initial Date State
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-11
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Report Dialog State
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [reportConfig, setReportConfig] = useState({
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        workType: 'All'
    });

    // Generate Year Options Dynamically
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handleBackTaskSubmit = () => {
        if (!backTaskData.title || !backTaskData.userId || !backTaskData.date) {
            alert("Please fill in all required fields (Title, User, Date).");
            return;
        }

        const dateObj = new Date(backTaskData.date);
        const formattedDate = dateObj.toLocaleDateString('en-In', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

        const formatTimeInput = (timeStr) => {
            if (!timeStr) return '-';
            const [h, m] = timeStr.split(':');
            const date = new Date();
            date.setHours(parseInt(h), parseInt(m));
            return date.toLocaleTimeString('en-In', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        };

        const sessionStart = new Date(`${backTaskData.date}T${backTaskData.startTime}`);
        const sessionEnd = new Date(`${backTaskData.date}T${backTaskData.endTime}`);
        const durationSeconds = (sessionEnd - sessionStart) / 1000;

        const newTask = {
            id: Date.now(),
            title: backTaskData.title,
            priority: backTaskData.priority,
            status: 'Completed',
            userId: backTaskData.userId,
            estHour: 0,
            estMin: 0,
            timeElapsed: durationSeconds > 0 ? durationSeconds : 0,
            isTimerRunning: false
        };

        const newSession = {
            id: Date.now(),
            userId: backTaskData.userId,
            date: formattedDate,
            startTime: formatTimeInput(backTaskData.startTime),
            endTime: formatTimeInput(backTaskData.endTime),
            tasks: [newTask],
            taskCount: 1,
            workType: backTaskData.workType || 'Onsite' // Save Work Type (Title Case)
        };

        addHistorySession(newSession);
        setOpenBackDayTask(false);
        setBackTaskData({
            title: '',
            priority: 'Medium',
            workType: 'Remote',
            date: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00',
            userId: historyFilterUserId || ''
        });
    };

    const parseDate = (dateString) => {
        if (!dateString) return null;
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    };

    const filteredHistory = useMemo(() => {
        if (!history) return [];
        const targetUserId = role === 'admin' ? historyFilterUserId : (currentUser?.id || 'dev-default');

        return history.filter(session => {
            // Treat sessions with no userId as 'dev-default'
            // If current user is dev-default, show ALL sessions (or fallback logic)
            // For now, let's treat dev-default as a 'super viewer' of local data

            if (role === 'admin') {
                const sId = String(session.userId);
                const isLegacy = !session.userId || sId === 'dev-default' || sId === 'undefined' || sId === 'null';
                const isValidUser = users.some(u => String(u.id) === String(session.userId));

                // Strict Filter: Allow Real Users OR Legacy Data (dev-default)
                if (!isValidUser && !isLegacy) return false;

                // Selection Filter
                if (targetUserId) {
                    const isMatch = String(session.userId) === String(targetUserId);

                    // Smart Alias
                    const selectedUserDetails = users.find(u => String(u.id) === String(targetUserId));
                    const isDeven = selectedUserDetails?.name?.toLowerCase().includes('deven');

                    if (!isMatch && !(isLegacy && isDeven)) return false;
                }
            } else {
                if (targetUserId !== 'dev-default' && session.userId !== targetUserId) return false;
                // If targetUserId IS dev-default, we skip the check, ensuring everything is shown
            }

            // Work Type Filter
            if (role === 'admin' && workTypeFilter !== 'All') {
                // Resolve Work Type: Explicit -> User Profile -> Default 'Onsite'
                let sessionType = session.workType;
                if (!sessionType) {
                    const sessionOwner = users.find(u => String(u.id) === String(session.userId));
                    sessionType = sessionOwner?.workType || 'Onsite';
                }

                if (sessionType !== workTypeFilter) return false;
            }

            const sessionDate = parseDate(session.date);
            if (!sessionDate) return false;
            return sessionDate.getMonth() === selectedMonth && sessionDate.getFullYear() === selectedYear;
        }).sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateB - dateA;
        });
    }, [history, selectedMonth, selectedYear, currentUser, role, historyFilterUserId, workTypeFilter]);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return '#ef4444';
            case 'Medium': return '#f59e0b';
            case 'Low': return '#10b981';
            default: return '#6b7280';
        }
    };



    const getStatusParams = (status) => {
        switch (status) {
            case 'Completed': return { color: '#16a34a', bg: '#dcfce7' };
            case 'In Progress': return { color: '#2563eb', bg: '#dbeafe' };
            case 'Pending': return { color: '#d97706', bg: '#fef3c7' };
            default: return { color: '#4b5563', bg: '#f3f4f6' };
        }
    };

    /* =======================
       Excel Download
    ======================= */

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const flatData = useMemo(() => {
        return filteredHistory.flatMap(session =>
            (session.tasks || []).map(task => {
                const user = users.find(u => u.id === session.userId);
                return {
                    id: session.id + "_" + task.id,
                    userId: session.userId,
                    userName: user ? user.name : 'Unknown User',
                    // Show date as stored (legacy: Jan 6, 2026). If it was standardized (06 Jan 2026), it will show that too.
                    // To force "Jan 6" style even for "06 Jan" data, we would need re-formatting.
                    // But user asked to "not change date", so showing raw string is safest if it's "Jan 6".
                    date: session.date,
                    sessionStart: session.startTime,
                    sessionEnd: session.endTime,
                    taskTitle: task.title,
                    priority: task.priority,
                    status: task.status,
                    duration: task.timeElapsed
                };
            })
        );
    }, [filteredHistory, users]);

    const { tasks } = useTaskStore(); // Ensure tasks are available

    /* =======================
       Excel Download
    ======================= */
    // Excel Download
    const handleDownload = (config = null) => {
        try {
            // Use config if provided, otherwise fallback to view state
            const targetMonth = config ? config.month : selectedMonth;
            const targetYear = config ? config.year : selectedYear;
            const targetWorkType = config ? config.workType : workTypeFilter; // Fallback to 'All' if filter removed

            // 1. Identify Target Users
            let targetUsers = [];
            if (role === 'admin') {
                if (config) {
                    // Driven by Dialog: Use Work Type Filter
                    if (targetWorkType === 'All') {
                        targetUsers = users;
                    } else {
                        // Case-insensitive check for robustness
                        targetUsers = users.filter(u => (u.workType || '').toLowerCase() === targetWorkType.toLowerCase());
                    }
                } else {
                    // Fallback / Legacy (e.g. single user button if it existed)
                    if (historyFilterUserId) {
                        const u = users.find(u => String(u.id) === String(historyFilterUserId));
                        if (u) targetUsers = [u];
                    } else {
                        targetUsers = users;
                    }
                }
            } else {
                if (currentUser) targetUsers = [currentUser];
            }

            // 2. Prepare Date Range
            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const excelRows = [];
            let maxTaskDetailLength = 50;

            // 3. Generate Rows (User -> Days)
            let srNo = 1;

            targetUsers.forEach(user => {
                // Counters for Summary
                let possibleWorkingDays = 0;
                let actualWorkingDays = 0;

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(targetYear, targetMonth, day);
                    const dateStr = dateObj.toLocaleDateString('en-In', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                    // Find History
                    const userHistory = history.filter(h => {
                        if (String(h.userId) !== String(user.id)) return false;
                        const hDate = new Date(h.date);
                        if (isNaN(hDate.getTime())) return false;
                        return hDate.getDate() === day &&
                            hDate.getMonth() === targetMonth && // Updated to targetMonth
                            hDate.getFullYear() === targetYear; // Updated to targetYear
                    });

                    // Find Active Tasks
                    const todayStr = new Date().toLocaleDateString('en-In', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                    let activeTasks = [];
                    if (dateStr === todayStr) {
                        activeTasks = tasks.filter(t => String(t.userId) === String(user.id) && t.dueDate === 'Today');
                    }

                    // Consolidated Data & Deduplication (Using Map)
                    const uniqueTasksMap = new Map();
                    const addToMap = (taskList) => {
                        taskList.forEach(t => {
                            const key = t.id ? String(t.id) : (t.title + (t.priority || ''));
                            if (key && !uniqueTasksMap.has(key)) {
                                uniqueTasksMap.set(key, t);
                            }
                        });
                    };
                    userHistory.forEach(h => addToMap(h.tasks || []));
                    addToMap(activeTasks);
                    const allTasks = Array.from(uniqueTasksMap.values());

                    const startTimes = [];
                    const endTimes = [];
                    userHistory.forEach(h => {
                        if (h.startTime) startTimes.push(h.startTime);
                        if (h.endTime) endTimes.push(h.endTime);
                    });
                    if (dateStr === todayStr && activeTasks.length > 0) {
                        const hasInProgress = activeTasks.some(t => t.status === 'In Progress');
                        if (hasInProgress) endTimes.push('Active');
                    }

                    // Status Logic
                    const isSunday = dayName === 'Sunday';
                    const hasWork = allTasks.length > 0;

                    let status = 'Not Worked';
                    if (hasWork) status = 'Worked';
                    else if (isSunday) status = 'Sunday Not Worked';

                    // Update Counters
                    if (!isSunday) possibleWorkingDays++;
                    if (status === 'Worked') actualWorkingDays++;

                    // Time Logic
                    const startTime = startTimes.length > 0 ? startTimes.sort()[0] : '-';
                    const endTime = endTimes.includes('Active') ? 'Active' : (endTimes.length > 0 ? endTimes.sort().reverse()[0] : '-');

                    // Task Detail
                    const taskDetail = allTasks.length > 0
                        ? allTasks.map((t, i) => `${i + 1}. ${t.title || 'Untitled'}`).join(' • ')
                        : '-';

                    if (taskDetail.length > maxTaskDetailLength) {
                        maxTaskDetailLength = taskDetail.length;
                    }

                    excelRows.push({
                        "Sr No": srNo++,
                        "User Name": user.name || 'Unknown',
                        "Date": dateStr,
                        "Day": dayName,
                        "Work Status": status,
                        "Start Time": startTime,
                        "End Time": endTime,
                        "Task Detail": taskDetail
                    });
                }

                // Add Summary Rows for this User
                const attendancePercentage = possibleWorkingDays > 0 ? ((actualWorkingDays / possibleWorkingDays) * 100).toFixed(2) : "0.00";

                excelRows.push({ "Sr No": "", "User Name": "", "Date": "", "Day": "", "Work Status": "", "Start Time": "", "End Time": "", "Task Detail": "" }); // Spacer
                excelRows.push({
                    "Sr No": "",
                    "User Name": "*** SUMMARY ***",
                    "Date": "",
                    "Day": "",
                    "Work Status": "",
                    "Start Time": "",
                    "End Time": "",
                    "Task Detail": ""
                });
                excelRows.push({
                    "Sr No": "",
                    "User Name": `Total Working Days (excl. weekends): `,
                    "Date": possibleWorkingDays,
                    "Day": "",
                    "Work Status": "",
                    "Start Time": "",
                    "End Time": "",
                    "Task Detail": ""
                });
                excelRows.push({
                    "Sr No": "",
                    "User Name": `Actual Working Days: `,
                    "Date": actualWorkingDays,
                    "Day": "",
                    "Work Status": "",
                    "Start Time": "",
                    "End Time": "",
                    "Task Detail": ""
                });
                excelRows.push({
                    "Sr No": "",
                    "User Name": `Attendance Percentage: `,
                    "Date": `${attendancePercentage}%`,
                    "Day": "",
                    "Work Status": "",
                    "Start Time": "",
                    "End Time": "",
                    "Task Detail": ""
                });
                excelRows.push({ "Sr No": "", "User Name": "", "Date": "", "Day": "", "Work Status": "", "Start Time": "", "End Time": "", "Task Detail": "" }); // Spacer
            });

            const worksheet = XLSX.utils.json_to_sheet(excelRows);

            // Set Column Widths Dynamic
            const safeTaskWidth = Math.min(Math.max(maxTaskDetailLength, 50), 200);

            const colWidths = [
                { wch: 8 },  // Sr No
                { wch: 20 }, // User Name
                { wch: 15 }, // Date
                { wch: 12 }, // Day
                { wch: 20 }, // Work Status
                { wch: 12 }, // Start Time
                { wch: 12 }, // End Time
                { wch: safeTaskWidth } // Task Detail (wide)
            ];
            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Task Report");
            XLSX.writeFile(workbook, `FocusFlow_Report_${targetMonth + 1}_${targetYear}.xlsx`);
        } catch (error) {
            console.error("Excel download failed:", error);
            alert("Failed to download report.");
        }
    };

    // Validate Filter on Mount/Users Change
    React.useEffect(() => {
        if (role === 'admin') {
            const isValid = historyFilterUserId && users.some(u => String(u.id) === String(historyFilterUserId));
            if (!isValid && users.length > 0) {
                setHistoryFilterUserId(users[0].id); // Force select first user if invalid or empty
            }
        }
    }, [users, role, historyFilterUserId, setHistoryFilterUserId]);

    // Sync Work Type with Selected User
    React.useEffect(() => {
        if (role === 'admin' && historyFilterUserId) {
            const user = users.find(u => String(u.id) === String(historyFilterUserId));
            if (user && user.workType) {
                // setWorkTypeFilter(user.workType); // Removed: Filter UI is gone
                setBackTaskData(prev => ({ ...prev, workType: user.workType }));
            }
        }
    }, [historyFilterUserId, users, role]);

    return (
        <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflowY: 'auto', width: '100%',
            pl: { xs: '40px', md: 10 }, pr: { xs: '60px', md: 10 }, py: 4,
        }}>
            {/* Header Section */}
            <Box sx={{
                mb: 4,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'center', md: 'flex-start' },
                gap: 2
            }}>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                    <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a', letterSpacing: '-1px' }}>
                        Task History
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                        Review past sessions and task logs.
                    </Typography>
                </Box>



                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' }, // Stack on very small, row on sm+ (or just column on xs if user wants strict mobile view)
                    gap: 2,
                    width: { xs: '100%', md: 'auto' }
                }}>
                    {role === 'admin' && (
                        <Button
                            onClick={() => setOpenReportDialog(true)}
                            disabled={flatData.length === 0}
                            variant="contained"
                            sx={{
                                bgcolor: '#16a34a', color: 'white', px: 2.5, py: 1, borderRadius: '12px',
                                textTransform: 'none', fontWeight: 600,
                                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)',
                                '&:hover': { bgcolor: '#15803d' },
                                width: { xs: '100%', md: 'auto' }
                            }}
                        >
                            Generate Report
                        </Button>
                    )}
                    {role === 'admin' && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenBackDayTask(true)}
                            sx={{
                                bgcolor: '#0f172a', color: 'white', px: 2.5, py: 1, borderRadius: '12px',
                                textTransform: 'none', fontWeight: 600,
                                '&:hover': { bgcolor: '#334155' },
                                width: { xs: '100%', md: 'auto' }
                            }}
                        >
                            Add Back Day Task
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Filters Bar */}
            <Paper elevation={0} sx={{
                p: { xs: 2, md: 2 }, mb: 4, borderRadius: '16px', border: '1px solid #e2e8f0',
                display: 'flex', flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' }, gap: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FilterListIcon sx={{ color: '#94a3b8' }} />

                    {/* Admin User Select */}
                    {role === 'admin' && (
                        <div className="relative group">
                            <select
                                value={historyFilterUserId}
                                onChange={(e) => setHistoryFilterUserId(e.target.value)}
                                className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[200px]"
                            >
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role === 'Admin' ? 'Admin' : 'Developer'})
                                    </option>
                                ))}
                            </select>
                            <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {/* Date Selectors */}
                <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <Select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        variant="standard"
                        disableUnderline
                        sx={{
                            fontSize: '0.9rem', fontWeight: 600, color: '#334155',
                            bgcolor: 'white', border: '1px solid #e2e8f0', px: 2, py: 0.5, borderRadius: '8px',
                            '&:hover': { bgcolor: '#f8fafc' },
                            flex: 1
                        }}
                    >
                        {months.map((m, index) => (
                            <MenuItem key={index} value={index}>{m}</MenuItem>
                        ))}
                    </Select>
                    <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        variant="standard"
                        disableUnderline
                        sx={{
                            fontSize: '0.9rem', fontWeight: 600, color: '#334155',
                            bgcolor: 'white', border: '1px solid #e2e8f0', px: 2, py: 0.5, borderRadius: '8px',
                            '&:hover': { bgcolor: '#f8fafc' },
                            flex: 1
                        }}
                    >
                        {yearOptions.map((year) => (
                            <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                    </Select>
                </Stack>
            </Paper>

            {/* Sessions Grid */}
            <Box sx={{ flexGrow: 1 }}>
                {filteredHistory.length === 0 ? (
                    <Box sx={{
                        height: '400px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#94a3b8'
                    }}>
                        <CalendarMonthIcon sx={{ fontSize: 48, mb: 1, color: '#cbd5e1' }} />
                        <Typography fontWeight="500">No sessions found</Typography>
                        <Typography variant="caption">{role === 'admin' && !historyFilterUserId ? 'Please select a user to view history.' : 'Try changing the date filter.'}</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%' }}>
                        {filteredHistory.map((session, index) => (
                            <Grid item xs={12} md={6} lg={4} key={session.id}>
                                <Zoom in style={{ transitionDelay: `${index * 50}ms` }}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            borderRadius: '20px', border: '1px solid #e2e8f0',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.08)'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Box sx={{
                                                        width: 42, height: 42, borderRadius: '12px',
                                                        bgcolor: '#eff6ff', color: '#3b82f6',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <CalendarMonthIcon />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                                                            {session.date.split(',')[0]}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {session.date.split(',')[1]}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={`${session.taskCount} Tasks`}
                                                    size="small"
                                                    sx={{ bgcolor: '#f1f5f9', fontWeight: 600, color: '#475569', borderRadius: '6px' }}
                                                />
                                            </Box>
                                            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">Start Time</Typography>
                                                    <Typography variant="body2" fontWeight="600" color="#334155">
                                                        {session.startTime}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">End Time</Typography>
                                                    <Typography variant="body2" fontWeight="600" color="#334155">
                                                        {session.endTime}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                onClick={() => setSelectedSession(session)}
                                                sx={{
                                                    borderRadius: '10px', textTransform: 'none', fontWeight: 600,
                                                    color: '#334155', borderColor: '#e2e8f0',
                                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Zoom>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
            {/* Container Removed */}

            {/* Task Details Dialog */}
            <Dialog
                open={!!selectedSession}
                onClose={() => setSelectedSession(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>
                    Session Details
                    <Typography variant="body2" color="text.secondary">
                        {selectedSession?.date} • {selectedSession?.startTime} - {selectedSession?.endTime}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {selectedSession?.tasks?.map((task, i) => (
                            <Paper
                                key={i} elevation={0}
                                sx={{ p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Typography fontWeight="600" color="#1e293b">{task.title}</Typography>
                                    <Chip
                                        label={task.status}
                                        size="small"
                                        sx={{
                                            bgcolor: getStatusParams(task.status).bg,
                                            color: getStatusParams(task.status).color,
                                            fontWeight: 600, borderRadius: '6px', height: 24, fontSize: '0.75rem'
                                        }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Chip
                                        label={task.priority}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            color: getPriorityColor(task.priority),
                                            borderColor: alpha(getPriorityColor(task.priority), 0.3),
                                            fontWeight: 600, borderRadius: '6px', height: 22, fontSize: '0.7rem'
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                                        {Math.floor(task.timeElapsed / 60)}m {task.timeElapsed % 60}s
                                    </Typography>
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        onClick={() => setSelectedSession(null)}
                        sx={{ color: '#64748b', fontWeight: 600, textTransform: 'none' }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Generate Report Dialog */}
            <Dialog
                open={openReportDialog}
                onClose={() => setOpenReportDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                    <Typography variant="h6" fontWeight="700" color="#334155">
                        Generate Report
                    </Typography>
                    <IconButton onClick={() => setOpenReportDialog(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <DialogContent sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ mb: 1, display: 'block' }}>
                                Month
                            </Typography>
                            <Select
                                value={reportConfig.month}
                                onChange={(e) => setReportConfig({ ...reportConfig, month: Number(e.target.value) })}
                                fullWidth
                                size="small"
                                sx={{ borderRadius: '8px', bgcolor: 'white' }}
                            >
                                {months.map((m, index) => (
                                    <MenuItem key={index} value={index}>{m}</MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ mb: 1, display: 'block' }}>
                                Year
                            </Typography>
                            <Select
                                value={reportConfig.year}
                                onChange={(e) => setReportConfig({ ...reportConfig, year: Number(e.target.value) })}
                                fullWidth
                                size="small"
                                sx={{ borderRadius: '8px', bgcolor: 'white' }}
                            >
                                {yearOptions.map((year) => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ mb: 1, display: 'block' }}>
                                Work Type
                            </Typography>
                            <Select
                                value={reportConfig.workType}
                                onChange={(e) => setReportConfig({ ...reportConfig, workType: e.target.value })}
                                fullWidth
                                size="small"
                                sx={{ borderRadius: '8px', bgcolor: 'white' }}
                            >
                                <MenuItem value="All">All</MenuItem>
                                <MenuItem value="Onsite">Onsite</MenuItem>
                                <MenuItem value="Remote">Remote</MenuItem>
                            </Select>
                        </Grid>
                    </Grid>

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                            handleDownload(reportConfig);
                            setOpenReportDialog(false);
                        }}
                        sx={{
                            mt: 4,
                            bgcolor: '#22c55e',
                            color: 'white',
                            py: 1.5,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#16a34a', boxShadow: 'none' }
                        }}
                    >
                        Generate
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Back Day Task Dialog */}
            <Dialog
                open={openBackDayTask}
                onClose={() => setOpenBackDayTask(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Add Back-Dated Task</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Task Name"
                            fullWidth
                            variant="outlined"
                            value={backTaskData.title}
                            onChange={(e) => setBackTaskData({ ...backTaskData, title: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={backTaskData.priority}
                                        label="Priority"
                                        onChange={(e) => setBackTaskData({ ...backTaskData, priority: e.target.value })}
                                        sx={{ borderRadius: '12px' }}
                                    >
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="Low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl className='w-50'>
                                    <InputLabel>Assigned User</InputLabel>
                                    <Select
                                        value={backTaskData.userId}
                                        label="Assigned User"
                                        onChange={(e) => setBackTaskData({ ...backTaskData, userId: e.target.value })}
                                        sx={{ borderRadius: '12px' }}
                                    >
                                        {users.map((user) => (
                                            <MenuItem key={user.id} value={user.id}>
                                                {user.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <DatePicker
                            label="Date"
                            value={dayjs(backTaskData.date)}
                            onChange={(newValue) => {
                                if (!newValue) return;
                                setBackTaskData({
                                    ...backTaskData,
                                    date: newValue.format('YYYY-MM-DD')
                                });
                            }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    sx: {
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px'
                                        }
                                    }
                                }
                            }}
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Start Time"
                                type="time"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={backTaskData.startTime}
                                onChange={(e) => setBackTaskData({ ...backTaskData, startTime: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                            <TextField
                                label="End Time"
                                type="time"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={backTaskData.endTime}
                                onChange={(e) => setBackTaskData({ ...backTaskData, endTime: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Stack>

                        <Box sx={{ bgcolor: '#eff6ff', p: 2, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CheckIcon color="primary" fontSize="small" />
                            <Typography variant="body2" color="primary" fontWeight="500">
                                This task will be marked as "Completed" automatically.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenBackDayTask(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
                    <Button
                        onClick={handleBackTaskSubmit}
                        variant="contained"
                        sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: '#0f172a' }}
                    >
                        Save Task
                    </Button>
                </DialogActions>
            </Dialog>

        </Box >
    );
};

export default TaskHistory;
