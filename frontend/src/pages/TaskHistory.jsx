import React, { useMemo, useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useUserStore } from '../store/useUserStore';
import { useMasterStore } from '../store/useMasterStore';
import { useTaskHistoryStore } from '../store/useTaskHistoryStore';
import { useUsersApiStore } from '../store/useUsersApiStore';
import { FiUser, FiClock, FiFilter } from "react-icons/fi";
import {
    Box, Typography, Paper, Button, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, FormControl, InputLabel, TextField,
    Stack, InputAdornment, Grid, Card, CardContent, Divider, Fade, Zoom, IconButton, Container, Autocomplete,
    CircularProgress, Snackbar, Alert
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
    const { history: localHistory, historyFilterUserId, setHistoryFilterUserId, addHistorySession } = useTaskStore();
    const { role, currentUser } = useUserStore();
    const { users: localUsers } = useMasterStore();

    // Use API users store to get real user IDs from database
    const { users: apiUsers, fetchUsers } = useUsersApiStore();

    // Use API users if available (they have correct _id), fallback to local
    const users = useMemo(() => apiUsers.length > 0 ? apiUsers.map(u => ({
        ...u,
        id: u._id || u.id  // Ensure id is set to _id for consistency
    })) : localUsers, [apiUsers, localUsers]);

    // API Store for backend integration
    const {
        history: apiHistory,
        isLoading,
        isSaving,
        error: apiError,
        successMessage,
        fetchHistory,
        addBackdatedTask: addBackdatedTaskApi,
        generateReport: generateReportApi,
        clearMessages
    } = useTaskHistoryStore();

    // Fetch users from API on mount (to get correct _id values)
    useEffect(() => {
        if (role === 'admin' && apiUsers.length === 0) {
            fetchUsers(1, 100, '', ''); // Fetch all users
        }
    }, [role]);

    // Use API history if available, fallback to local
    const history = apiHistory.length > 0 ? apiHistory : localHistory;

    const [selectedSession, setSelectedSession] = useState(null);
    const [openBackDayTask, setOpenBackDayTask] = useState(false);
    const [workTypeFilter, setWorkTypeFilter] = useState('All');

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState('success');

    const [backTaskData, setBackTaskData] = useState({
        title: '',
        priority: 'Medium',
        workType: 'All',
        date: dayjs().format('YYYY-MM-DD'),
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
        month: currentDate.getMonth() + 1, // Backend expects 1-12
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

    // Validate historyFilterUserId - if it doesn't exist in users list (e.g. switching from local to api), reset it
    useEffect(() => {
        if (role === 'admin' && historyFilterUserId && users.length > 0) {
            const userExists = users.find(u => u.id === historyFilterUserId);
            if (!userExists) {
                // If current filter ID is not in the list, default to first user or clear
                const newId = users[0].id;
                console.log('Resetting invalid historyFilterUserId:', historyFilterUserId, 'to:', newId);
                setHistoryFilterUserId(newId);
            }
        }
    }, [users, historyFilterUserId, role, setHistoryFilterUserId]);

    // Fetch history from API on mount and when filters change
    useEffect(() => {
        const monthDate = dayjs().year(selectedYear).month(selectedMonth).startOf('month').format('YYYY-MM-DD');

        let userId;
        if (role === 'admin') {
            userId = historyFilterUserId;
        } else {
            // For non-admin users, get their ID
            userId = currentUser?._id || currentUser?.id;
            // If userId is numeric (local mock ID) and we have API users, try to find the real ObjectId
            if (typeof userId === 'number' && apiUsers.length > 0) {
                const foundUser = apiUsers.find(u => u.email === currentUser?.email);
                if (foundUser) {
                    userId = foundUser._id;
                }
            }
        }

        // Only fetch if we have a valid string ID
        if (userId && typeof userId === 'string') {
            fetchHistory(monthDate, userId);
        }
    }, [selectedMonth, selectedYear, historyFilterUserId, role, currentUser?._id, apiUsers.length]);

    // Handle API success/error messages
    useEffect(() => {
        if (successMessage) {
            setToastMessage(successMessage);
            setToastSeverity('success');
            setShowToast(true);
            clearMessages();
        }
        if (apiError) {
            setToastMessage(apiError);
            setToastSeverity('error');
            setShowToast(true);
            clearMessages();
        }
    }, [successMessage, apiError]);

    const handleCloseToast = () => setShowToast(false);

    const handleBackTaskSubmit = async () => {
        if (!backTaskData.title || !backTaskData.userId || !backTaskData.date) {
            setToastMessage("Please fill in all required fields (Title, User, Date).");
            setToastSeverity('error');
            setShowToast(true);
            return;
        }

        // Call API to add backdated task
        const result = await addBackdatedTaskApi({
            date: backTaskData.date,
            startTime: backTaskData.startTime,
            endTime: backTaskData.endTime,
            tasks: [backTaskData.title],
            userId: backTaskData.userId
        });

        if (result.success) {
            setOpenBackDayTask(false);
            // Refresh history
            const monthDate = dayjs().year(selectedYear).month(selectedMonth).startOf('month').format('YYYY-MM-DD');
            fetchHistory(monthDate, role === 'admin' ? historyFilterUserId : currentUser?.id);

            setBackTaskData({
                title: '',
                priority: 'Medium',
                workType: 'All',
                date: dayjs().format('YYYY-MM-DD'),
                startTime: '09:00',
                endTime: '18:00',
                userId: historyFilterUserId || ''
            });
        }
    };

    const parseDate = (dateString) => {
        if (!dateString) return null;
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    };

    const filteredHistory = useMemo(() => {
        if (!history || history.length === 0) return [];

        // Backend already filters by user and month, so we only need to apply workType filter
        let result = history;

        // Work Type Filter (only for admin)
        if (role === 'admin' && workTypeFilter !== 'All') {
            result = result.filter(session => {
                let sessionType = session.workType;
                if (!sessionType) {
                    const sessionOwner = users.find(u => String(u.id) === String(session.userId));
                    sessionType = sessionOwner?.workType || 'Onsite';
                }
                return sessionType === workTypeFilter;
            });
        }

        // Already sorted by backend (by _id descending), no need to re-sort
        return result;
    }, [history, role, workTypeFilter, users]);

    const getPriorityColor = (priority) => {
        const p = (priority || '').toLowerCase();
        if (p === 'high') return '#fca5a5';
        if (p === 'medium') return '#fcd34d';
        if (p === 'low') return '#6ee7b7';
        return '#e5e7eb';
    };



    const getStatusParams = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'completed') return { color: '#000000', bg: '#86efac' };
        if (s === 'in progress') return { color: '#000000', bg: '#93c5fd' };
        if (s === 'pending') return { color: '#000000', bg: '#fca5a5' };
        return { color: '#000000', bg: '#f3f4f6' };
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
       Excel Download via Backend API
    ======================= */
    const handleDownload = async (config = null) => {
        try {
            // Use config if provided, otherwise fallback to view state
            const targetMonth = config ? config.month : selectedMonth;
            const targetYear = config ? config.year : selectedYear;
            const targetWorkType = config ? config.workType : workTypeFilter;

            // Call backend API to generate report
            await generateReportApi(targetMonth, targetYear, targetWorkType);
        } catch (error) {
            console.error("Excel download failed:", error);
            setToastMessage("Failed to download report.");
            setToastSeverity('error');
            setShowToast(true);
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
            px: { xs: 2, md: '80px' }, py: 4, // Reduced padding to remove extra space
        }}>
            {/* Toast Notification */}
            <Snackbar
                open={showToast}
                autoHideDuration={3000}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseToast} severity={toastSeverity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {toastMessage}
                </Alert>
            </Snackbar>

            {/* Loading Indicator */}
            {isLoading && (
                <Box sx={{ position: 'fixed', top: 80, right: 40, zIndex: 1000 }}>
                    <CircularProgress size={28} />
                </Box>
            )}

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
            <Box sx={{ flexGrow: 1, width: '100%' }}>
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
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            lg: 'repeat(5, 1fr)'
                        },
                        gap: 2,
                        width: '100%'
                    }}>
                        {filteredHistory.map((session, index) => (
                            <Zoom in key={session.id} style={{ transitionDelay: `${index * 30}ms` }}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        height: '100%',
                                        minHeight: '200px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.2s',
                                        bgcolor: 'white',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 20px -8px rgba(0, 0, 0, 0.1)',
                                            borderColor: '#3b82f6'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{
                                                    width: 36, height: 36, borderRadius: '10px',
                                                    bgcolor: '#eff6ff', color: '#3b82f6',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <CalendarMonthIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="700" sx={{ lineHeight: 1.2, fontSize: '1rem' }}>
                                                        {session.date.split(',')[0]}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {session.date.split(',')[1]}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={`${session.taskCount} Tasks`}
                                                size="small"
                                                sx={{ bgcolor: '#dbeafe', fontWeight: 600, color: '#2563eb', borderRadius: '6px', height: 22, fontSize: '0.7rem' }}
                                            />
                                        </Box>
                                        <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>Start Time</Typography>
                                                <Typography variant="body2" fontWeight="600" color="#16a34a" sx={{ fontSize: '0.85rem' }}>
                                                    {session.startTimeValue || session.startTime?.split(' ').slice(-2).join(' ') || '-'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>End Time</Typography>
                                                <Typography variant="body2" fontWeight="600" color="#dc2626" sx={{ fontSize: '0.85rem' }}>
                                                    {session.endTimeValue || session.endTime?.split(' ').slice(-2).join(' ') || '-'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            size="small"
                                            onClick={() => setSelectedSession(session)}
                                            sx={{
                                                borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                                                color: '#3b82f6', borderColor: '#bfdbfe', mt: 'auto',
                                                py: 0.75, fontSize: '0.8rem',
                                                '&:hover': { bgcolor: '#eff6ff', borderColor: '#3b82f6' }
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Zoom>
                        ))}
                    </Box>
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
                                        sx={{
                                            bgcolor: getPriorityColor(task.priority),
                                            color: '#000000',
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
