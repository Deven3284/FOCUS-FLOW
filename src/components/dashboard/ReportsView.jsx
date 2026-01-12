import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    FormControl,
    useTheme,
    useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as XLSX from 'xlsx';
import { useTaskStore } from '../../store/useTaskStore';
import { useUserStore } from '../../store/useUserStore';
import { useMasterStore } from '../../store/useMasterStore';
import { FiUser, FiClock, FiFilter, FiDownload, FiX, FiCalendar } from "react-icons/fi";
import { MdPriorityHigh, MdCheckCircle, MdPending, MdPlayArrow } from "react-icons/md";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';

/* =======================
   Time Formatter Utility
======================= */
const formatTime = (totalSeconds = 0) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDurationRead = (totalSeconds = 0) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
};

const ReportsView = ({ onClose }) => {
    const { history, tasks } = useTaskStore();
    const { role, currentUser } = useUserStore();
    const { users } = useMasterStore();

    const [selectedUser, setSelectedUser] = React.useState((users && users.length > 0) ? users[0].id : ''); // Default to first user
    const [selectedSession, setSelectedSession] = React.useState(null); // For Modal
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const parseDate = (dateString) => {
        if (!dateString) return null;
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    };

    const groupedData = useMemo(() => {
        const rows = [];
        const safeHistory = Array.isArray(history) ? history : [];
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        const safeUsers = Array.isArray(users) ? users : [];

        // Helper for user lookup (loose comparison for ID)
        const findUser = (uid) => safeUsers.find(u => String(u.id) === String(uid));

        // 1. Process History (Completed Sessions)
        safeHistory.forEach((session) => {
            if (!session) return;

            // Date Filter
            const sessionDate = new Date(session.date);
            if (!isNaN(sessionDate.getTime())) {
                if (sessionDate.getMonth() !== selectedMonth || sessionDate.getFullYear() !== selectedYear) {
                    return;
                }
            }

            // Admin Logic
            if (role === 'admin') {
                const sId = String(session.userId);
                const isLegacy = !session.userId || sId === 'dev-default' || sId === 'undefined' || sId === 'null';
                const isValidUser = safeUsers.some(u => String(u.id) === String(session.userId));

                // Strict Filter: Allow Real Users OR Legacy Data (dev-default)
                if (!isValidUser && !isLegacy) return;

                // Selection Filter
                if (selectedUser) {
                    const isMatch = String(session.userId) === String(selectedUser);

                    // Smart Alias: If legacy data ('dev-default'), allow it if selected user is 'Deven'
                    const selectedUserDetails = safeUsers.find(u => String(u.id) === String(selectedUser));
                    const isDeven = selectedUserDetails?.name?.toLowerCase().includes('deven');

                    if (!isMatch && !(isLegacy && isDeven)) return;
                }
            } else {
                if (!currentUser?.id || String(session.userId) !== String(currentUser.id)) return;
            }

            // Find user name
            let userName = 'Unknown';
            let userRole = 'Unknown';

            if (role === 'admin') {
                const sessionUser = findUser(session.userId);
                userName = sessionUser ? sessionUser.name : (currentUser && String(session.userId) === String(currentUser.id) ? 'You' : 'Unknown');
                userRole = sessionUser ? (sessionUser.role === 'Admin' ? 'Admin' : 'Developer') : 'Unknown';
            } else {
                // For standard users, explicitly use their own details to avoid lookup errors
                // Ensure we only show their data (filtered above), so we can safely use currentUser name
                userName = currentUser?.name || 'You';
                userRole = 'Developer';
            }

            // Calculate total duration for session
            const totalDuration = (session.tasks || []).reduce((acc, t) => acc + (t.timeElapsed || 0), 0);

            rows.push({
                id: session.id || Math.random(),
                userId: session.userId,
                userName: userName,
                userRole: userRole,
                date: session.date,
                sessionStart: session.startTime,
                sessionEnd: session.endTime,
                taskCount: (session.tasks || []).length,
                totalDuration: totalDuration,
                tasks: session.tasks || [],
                status: 'Completed',
                type: 'history'
            });
        });

        // 2. Process Active Tasks (Grouped by User)
        // Active tasks are 'Today', so only show if selected Mon/Year is Today's month/year
        const today = new Date();
        if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
            const activeTasksByUser = {};
            safeTasks.forEach(task => {
                if (!task) return;

                // Admin Logic
                if (role === 'admin') {
                    const tId = String(task.userId);
                    const isLegacy = !task.userId || tId === 'dev-default' || tId === 'undefined' || tId === 'null';
                    const isValidUser = safeUsers.some(u => String(u.id) === String(task.userId));

                    // Strict Filter: Allow Real Users OR Legacy Data (dev-default)
                    if (!isValidUser && !isLegacy) return;

                    // Selection Filter
                    if (selectedUser) {
                        const isMatch = String(task.userId) === String(selectedUser);

                        // Smart Alias: If legacy data ('dev-default'), allow it if selected user is 'Deven'
                        const selectedUserDetails = safeUsers.find(u => String(u.id) === String(selectedUser));
                        const isDeven = selectedUserDetails?.name?.toLowerCase().includes('deven');

                        if (!isMatch && !(isLegacy && isDeven)) return;
                    }
                } else {
                    if (!currentUser?.id || String(task.userId) !== String(currentUser.id)) return;
                }

                if (!activeTasksByUser[task.userId]) {
                    activeTasksByUser[task.userId] = [];
                }
                activeTasksByUser[task.userId].push(task);
            });

            // Create rows for active sessions
            Object.keys(activeTasksByUser).forEach(userId => {
                const userTasks = activeTasksByUser[userId];

                let userName = 'Unknown';
                let userRole = 'Unknown';

                if (role === 'admin') {
                    const taskUser = findUser(userId);
                    userName = taskUser ? taskUser.name : (currentUser && String(userId) === String(currentUser.id) ? 'You' : 'Unknown');
                    userRole = taskUser ? (taskUser.role === 'Admin' ? 'Admin' : 'Developer') : 'Unknown';
                } else {
                    userName = currentUser?.name || 'You';
                    userRole = 'Developer';
                }

                const today = new Date();
                const todayMonth = today.toLocaleDateString('en-In', { month: 'short', timeZone: 'Asia/Kolkata' });
                const todayStr = `${todayMonth} ${today.getDate()}, ${today.getFullYear()}`;
                const totalDuration = userTasks.reduce((acc, t) => acc + (t.timeElapsed || 0), 0);

                rows.push({
                    id: `active-${userId}`,
                    userId: userId,
                    userName: userName,
                    userRole: userRole,
                    date: todayStr,
                    sessionStart: 'Active',
                    sessionEnd: 'Now',
                    taskCount: userTasks.length,
                    totalDuration: totalDuration,
                    tasks: userTasks,
                    status: 'In Progress',
                    type: 'active'
                });
            });
        }

        return rows.sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateB - dateA; // Descending
        });
    }, [history, tasks, role, currentUser, users, selectedUser, selectedMonth, selectedYear]);


    /* =======================
       Excel Download
    ======================= */
    const handleDownload = () => {
        try {
            // 1. Identify Target Users
            let targetUsers = [];
            if (role === 'admin') {
                if (selectedUser) {
                    const u = users.find(u => String(u.id) === String(selectedUser));
                    if (u) targetUsers = [u];
                } else {
                    targetUsers = users;
                }
            } else {
                if (currentUser) targetUsers = [currentUser];
            }

            // 2. Prepare Date Range
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const excelRows = [];
            let maxTaskDetailLength = 50;

            // 3. Generate Rows (User -> Days)
            let srNo = 1;

            targetUsers.forEach(user => {
                // Counters for Summary
                let possibleWorkingDays = 0;
                let actualWorkingDays = 0;

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(selectedYear, selectedMonth, day);
                    // Legacy Format: Jan 6, 2026
                    const month = dateObj.toLocaleDateString('en-In', { month: 'short', timeZone: 'Asia/Kolkata' });
                    const dateStr = `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

                    // Fallback for interim "06 Jan 2026"
                    const standardDateStr = dateObj.toLocaleDateString('en-In', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

                    const dayName = dateObj.toLocaleDateString('en-In', { weekday: 'long', timeZone: 'Asia/Kolkata' });

                    // Find History
                    const userHistory = history.filter(h => {
                        if (String(h.userId) !== String(user.id)) return false;
                        const hDate = new Date(h.date);
                        // Check for both current and legacy date formats
                        const isCurrentFormat = hDate.getDate() === day &&
                            hDate.getMonth() === selectedMonth &&
                            hDate.getFullYear() === selectedYear;

                        // Check against both constructed string formats
                        const isLegacyFormat = h.date === dateStr || h.date === standardDateStr;

                        return isNaN(hDate.getTime()) ? isLegacyFormat : (isCurrentFormat || isLegacyFormat);
                    });

                    // Find Active Tasks (If Today)
                    const today = new Date();
                    const todayMonth = today.toLocaleDateString('en-In', { month: 'short', timeZone: 'Asia/Kolkata' });
                    const todayStr = `${todayMonth} ${today.getDate()}, ${today.getFullYear()}`;

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
                    else if (isSunday) status = 'Not Worked';

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
                    "User Name": `Total Working Days (excl. weekends):`,
                    "Date": possibleWorkingDays,
                    "Day": "",
                    "Work Status": "",
                    "Start Time": "",
                    "End Time": "",
                    "Task Detail": ""
                });
                excelRows.push({
                    "Sr No": "",
                    "User Name": `Actual Working Days:`,
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

            // Set Column Widths Dynamic (Capped at 200)
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
            XLSX.writeFile(workbook, `FocusFlow_Report_${selectedMonth + 1}_${selectedYear}.xlsx`);
        } catch (error) {
            console.error("Excel download failed:", error);
            alert("Failed to download report.");
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-600 bg-red-50 border-red-100';
            case 'Medium': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'Low': return 'text-green-600 bg-green-50 border-green-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'text-green-700 bg-green-100';
            case 'In Progress': return 'text-blue-700 bg-blue-100';
            case 'Pending': return 'text-yellow-700 bg-yellow-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    const handleRowClick = (session) => {
        setSelectedSession(session);
    };

    const handleCloseModal = () => {
        setSelectedSession(null);
    };

    return (
        <Box sx={{ px: { xs: 2, md: 9 }, py: 2, height: '100%', overflowY: 'auto' }}>
            <div className="w-full h-full flex flex-col bg-white rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden ">
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Task History Reports</h2>
                        <p className="text-sm text-gray-500 mt-1">Daily aggregated logs of user activity.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Selector */}
                        <div className="relative group">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[120px]"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>
                                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Year Selector */}
                        <div className="relative group">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[100px]"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Admin User Filter */}
                        {role === 'admin' && (
                            <div className="relative group">
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
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

                        <button
                            onClick={handleDownload}
                            disabled={groupedData.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-green-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiDownload size={18} />
                            Download Report
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {groupedData.length > 0 ? (
                        groupedData.map((row) => (
                            <div
                                key={row.id}
                                onClick={() => handleRowClick(row)}
                                className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col md:flex-row items-center gap-6 cursor-pointer hover:border-blue-200"
                            >
                                {/* User Info */}
                                <div className="flex items-center gap-4 w-full md:w-[25%] border-b md:border-b-0 md:border-r border-gray-50 pb-4 md:pb-0 md:pr-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${row.type === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                        {row.userName.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{row.userName}</h3>
                                        <p className="text-xs text-gray-500 truncate">{row.userRole}</p>
                                    </div>
                                </div>

                                {/* Session Info Grid */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 w-full items-center">
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Date</p>
                                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                                                <FiCalendar size={14} />
                                            </div>
                                            {row.date}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Session Time</p>
                                        <p className={`text-sm font-semibold flex items-center gap-2 ${row.type === 'active' ? 'text-blue-600' : 'text-gray-700'}`}>
                                            <div className={`p-1.5 rounded-lg ${row.type === 'active' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'}`}>
                                                <FiClock size={14} />
                                            </div>
                                            {row.sessionStart} - {row.sessionEnd}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Total Tasks</p>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white shadow-sm">
                                                {row.taskCount} Tasks
                                            </span>
                                        </div>
                                    </div>

                                </div>

                                {/* Arrow Indicator */}
                                <div className="hidden md:flex items-center text-gray-300 group-hover:text-blue-500 transition-colors">
                                    <MdPlayArrow size={20} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 min-h-[400px]">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center transition-transform hover:scale-110">
                                <FiFilter size={40} className="text-gray-200" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-gray-600 font-medium">No Sessions Found</h3>
                                <p className="text-sm text-gray-400 mt-1">Try adjusting the filters.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Tasks Modal */}
                <Dialog
                    open={!!selectedSession}
                    onClose={handleCloseModal}
                    maxWidth="md"
                    fullWidth
                    fullScreen={isMobile}
                    PaperProps={{
                        style: { borderRadius: isMobile ? 0 : 24, padding: isMobile ? '0px' : '16px' }
                    }}
                >
                    <div className="flex justify-between items-center mb-6 px-4 pt-2">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
                            <p className="text-sm text-gray-500">
                                {selectedSession?.userName} • {selectedSession?.date}
                            </p>
                        </div>
                        <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <CloseIcon />
                        </button>
                    </div>

                    <DialogContent dividers className="!border-gray-100 !py-4 space-y-3">
                        {selectedSession?.tasks && selectedSession.tasks.length > 0 ? (
                            selectedSession.tasks.map((task, index) => (
                                <div key={task.id || index} className="bg-white border border-gray-100 p-2 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3 gap-3">
                                        <h4 className="font-semibold text-gray-800 text-base leading-tight flex-1 break-words">
                                            {task.title || "No Task Name"}
                                        </h4>
                                        <span className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm mt-2">
                                        <div className={`px-2 py-0.5 rounded border text-xs font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                            {task.priority || 'Medium'}
                                        </div>
                                        <div className="text-gray-500 flex items-center gap-1">
                                            <FiClock size={14} />
                                            {formatDurationRead(task.timeElapsed || 0)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                No tasks recorded for this session.
                            </div>
                        )}
                    </DialogContent>

                    <DialogActions className="!pt-4 !px-4">
                        <button
                            onClick={handleCloseModal}
                            className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </DialogActions>
                </Dialog>
            </div>
        </Box>
    );
}

export default ReportsView;
