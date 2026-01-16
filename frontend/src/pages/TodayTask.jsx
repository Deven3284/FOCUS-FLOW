import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/useTaskStore';
import { useUserStore } from '../store/useUserStore';
import {
    Box, Typography, Button, IconButton, Paper, Container,
    TextField, Select, MenuItem, Stack, Tooltip, InputAdornment,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Grid, Fade, Zoom, Chip, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Snackbar, Alert
} from '@mui/material';
import {
    AddRounded as AddIcon,
    DeleteOutlineRounded as DeleteIcon,
    PlayArrowRounded as PlayIcon,
    PauseRounded as PauseIcon,
    AccessTimeRounded as TimeIcon,
    WbSunnyRounded as DayIcon,
    NightsStayRounded as NightIcon,
    UpdateRounded as UpdateIcon,
    InfoOutlined as InfoIcon,
    CheckCircleOutlineRounded as CheckIcon,
    RadioButtonUncheckedRounded as PendingIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const TodayTask = () => {
    const {
        tasks, addTask, removeTask, updateTask, updateTaskStatus,
        toggleTimer, incrementTime, startDay, endDay, activeSessions, cleanupEmptyTasks,
        fetchTodaysData, syncTasksToBackend, isLoading, isSyncing, updateAndSyncTask
    } = useTaskStore();
    const { role, currentUser } = useUserStore();

    const navigate = useNavigate();

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isDirty, setIsDirty] = useState(false); // Track unsaved changes
    const [edits, setEdits] = useState({}); // Local buffer for edits
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const toastTimeoutRef = useRef(null);

    // Filter tasks by userId (include all for dev-default)
    const currentUserId = currentUser?.id || 'dev-default';
    const filteredTasks = tasks.filter(t => currentUserId === 'dev-default' ? true : t.userId === currentUserId);

    // Fetch today's data from API on component mount
    useEffect(() => {
        if (currentUserId && currentUserId !== 'dev-default') {
            fetchTodaysData();
        }
    }, [currentUserId]);

    // Check if session is from today
    const isSessionActiveToday = React.useMemo(() => {
        const sessionStart = activeSessions?.[currentUserId];
        if (!sessionStart) return false;

        const sessionDate = new Date(sessionStart);
        const today = new Date();

        return sessionDate.getDate() === today.getDate() &&
            sessionDate.getMonth() === today.getMonth() &&
            sessionDate.getFullYear() === today.getFullYear();
    }, [activeSessions, currentUserId]);

    // Timer Interval Logic
    useEffect(() => {
        const interval = setInterval(() => {
            // Use tasks from store directly in the callback to avoid stale closure
            const currentTasks = useTaskStore.getState().tasks;
            const userId = currentUser?.id || 'dev-default';
            currentTasks.forEach(task => {
                if (task.isTimerRunning && (userId === 'dev-default' || task.userId === userId)) {
                    incrementTime(task.id);
                }
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [incrementTime, currentUser?.id]); // Remove filteredTasks dependency

    const formatTime = (seconds) => {
        if (!seconds) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setShowToast(false);
    };

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
    };

    const handleAddTask = () => {
        addTask({
            title: '',
            priority: 'Medium',
            status: 'Not Started',
            estHour: 0,
            estMin: 0
        }, currentUserId);
        setIsDirty(true);
    };

    const handleStartDay = () => {
        startDay(currentUserId);
        triggerToast("Day Started! ☀️");
    };

    const handleEndDay = async () => {
        cleanupEmptyTasks();
        // Sync to backend before ending
        await syncTasksToBackend();
        endDay(currentUserId);
        triggerToast("Day Ended! Completed tasks archived. 🌙");
    };

    const handleUpdateTasks = async () => {
        // Commit all local edits to the store
        Object.keys(edits).forEach(key => {
            const numericKey = Number(key);
            // If key is a valid number (for local IDs), use Number form. Otherwise (MongoID string), use string form.
            const id = isNaN(numericKey) ? key : numericKey;
            updateTask(id, edits[key]);
        });

        // Sync to backend
        const result = await syncTasksToBackend();

        setEdits({}); // Clear local edits
        setIsDirty(false); // Reset dirty state

        if (result.success) {
            triggerToast("Saved Tasks ✅");
        } else {
            triggerToast("Tasks Updated Locally (Server sync pending)");
        }
    };

    const handleAutoSave = async (key) => {
        if (!edits[key]) return; // No pending edits
        const numericKey = Number(key);
        const id = isNaN(numericKey) ? key : numericKey;

        await updateAndSyncTask(id, edits[key]);

        setEdits(prev => {
            const next = { ...prev };
            delete next[key];
            if (Object.keys(next).length === 0) setIsDirty(false);
            return next;
        });
        triggerToast("Saved ✅");
    };

    const handleDirectChange = async (id, field, value) => {
        await updateAndSyncTask(id, { [field]: value });
        triggerToast("Saved Tasks ✅");
    };

    // Inline Update Handlers
    const handleChange = (id, field, value) => {
        // Update local buffer instead of store directly
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
        setIsDirty(true); // Editing makes it dirty
    };

    // Merge store tasks with local edits for rendering
    // Sort by ID Descending (New tasks at the top)
    const tasksToRender = [...filteredTasks]
        .sort((a, b) => b.id - a.id)
        .map(task => ({
            ...task,
            ...edits[task.id]
        }));

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return '#fca5a5'; // Red-300
            case 'Medium': return '#fcd34d'; // Amber-300
            case 'Low': return '#6ee7b7'; // Emerald-300
            default: return '#e5e7eb'; // Gray-200
        }
    };

    const getStatusParams = (status) => {
        switch (status) {
            case 'Completed': return { color: 'success', icon: <CheckIcon fontSize="small" />, bg: '#86efac', text: '#000000' };
            case 'In Progress': return { color: 'primary', icon: <PlayIcon fontSize="small" />, bg: '#93c5fd', text: '#000000' };
            case 'Pending': return { color: 'error', icon: <PendingIcon fontSize="small" />, bg: '#fca5a5', text: '#000000' };
            default: return { color: 'default', icon: <PendingIcon fontSize="small" />, bg: '#f3f4f6', text: '#000000' };
        }
    };

    const [openTaskDialog, setOpenTaskDialog] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    return (
        <Box sx={{ px: { xs: 2, md: '80px' }, py: 4, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc', overflowY: 'auto' }}>
            {/* Main Content Container with Max Width */}
            <Box sx={{ maxWidth: '1600px', mx: 'auto', width: '100%' }}>
                {/* Toast Notification */}
                <Snackbar
                    open={showToast}
                    autoHideDuration={3000}
                    onClose={handleCloseToast}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert onClose={handleCloseToast} severity="success" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {toastMessage}
                    </Alert>
                </Snackbar>

                {/* Header */}
                <Box sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'center', md: 'center' },
                    gap: 2
                }}>
                    <Box sx={{ textAlign: { xs: 'center', md: 'left' }, width: { xs: '100%', md: 'auto' } }}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a', letterSpacing: '-1px' }}>
                            Today's Focus
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                            Manage your daily tasks and track time efficiently.
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        alignItems: 'center',
                        justifyContent: { xs: 'center', md: 'flex-start' },
                        width: { xs: '100%', md: 'auto' }
                    }}>
                        <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                            {!isSessionActiveToday ? (
                                <Button
                                    variant="contained"
                                    startIcon={<DayIcon />}
                                    onClick={handleStartDay}
                                    sx={{
                                        bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' },
                                        borderRadius: '12px', textTransform: 'none',
                                        px: { xs: 2, md: 3 }, py: { xs: 1, md: 1.5 },
                                        fontSize: { xs: '0.875rem', md: '1rem' },
                                        fontWeight: 600,
                                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                                        flex: { xs: 1, md: 'initial' }
                                    }}
                                >
                                    Start Day
                                </Button>
                            ) : (
                                <Chip
                                    icon={<DayIcon sx={{ fontSize: '18px !important' }} />}
                                    label="Day Started"
                                    sx={{
                                        bgcolor: '#eff6ff', color: '#3b82f6', fontWeight: 600, borderRadius: '12px',
                                        height: { xs: '36px', md: '42px' }, px: 1, '& .MuiChip-label': { px: 2 },
                                        flex: { xs: 1, md: 'initial' },
                                        justifyContent: 'center'
                                    }}
                                />
                            )}
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddTask}
                                sx={{
                                    bgcolor: '#0f172a', color: 'white',
                                    px: { xs: 2, md: 3 }, py: { xs: 1, md: 1.5 },
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    borderRadius: '12px',
                                    textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                                    '&:hover': { bgcolor: '#334155' },
                                    flex: { xs: 1, md: 'initial' }
                                }}
                            >
                                Add Task
                            </Button>
                        </Box>

                        {/* Mobile Only: Save & End Buttons moved to Header */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1.5, width: '100%' }}>
                            <Button
                                variant="outlined"
                                startIcon={<UpdateIcon />}
                                onClick={handleUpdateTasks}
                                disabled={!isDirty}
                                sx={{
                                    borderColor: isDirty ? '#10b981' : '#e2e8f0',
                                    color: isDirty ? '#10b981' : '#94a3b8',
                                    bgcolor: isDirty ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    borderRadius: '12px', textTransform: 'none',
                                    px: 2, py: 1,
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    flex: 1,
                                    '&:hover': { bgcolor: isDirty ? 'rgba(16, 185, 129, 0.2)' : 'transparent', borderColor: isDirty ? '#059669' : '#e2e8f0' }
                                }}
                            >
                                Save
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<NightIcon />}
                                onClick={handleEndDay}
                                disabled={!isSessionActiveToday || isDirty}
                                sx={{
                                    borderColor: (!isSessionActiveToday || isDirty) ? '#e2e8f0' : '#ef4444',
                                    color: (!isSessionActiveToday || isDirty) ? '#cbd5e1' : '#ef4444',
                                    bgcolor: (!isSessionActiveToday || isDirty) ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '12px', textTransform: 'none',
                                    px: 2, py: 1,
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    flex: 1,
                                    '&:hover': { bgcolor: (!isSessionActiveToday || isDirty) ? 'transparent' : 'rgba(239, 68, 68, 0.2)', borderColor: (!isSessionActiveToday || isDirty) ? '#e2e8f0' : '#dc2626' }
                                }}
                            >
                                End Day
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* MOBILE ONLY: Task List Table */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 10 }}>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 800 }} aria-label="simple table">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>TASK</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>PRIORITY</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>STATUS</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>EST. TIME</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>TRACKER</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.75rem', py: 2 }}>ACTION</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tasksToRender.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#64748b' }}>
                                                <AddIcon sx={{ fontSize: 40, bgcolor: '#f1f5f9', p: 1, borderRadius: '50%' }} />
                                                <Typography variant="body2" fontWeight={600}>No tasks for today</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tasksToRender.map((task) => (
                                        <TableRow
                                            key={task.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                bgcolor: task.isTimerRunning ? '#fef2f2' : 'white',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <TableCell component="th" scope="row" sx={{ width: '30%' }}>
                                                <Box
                                                    onClick={() => {
                                                        if (task.title.length > 80) {
                                                            setSelectedTaskId(task.id);
                                                            setOpenTaskDialog(true);
                                                        }
                                                    }}
                                                    sx={{
                                                        width: '100%',
                                                        cursor: task.title.length > 80 ? 'pointer' : 'text'
                                                    }}
                                                >
                                                    <TextField
                                                        fullWidth
                                                        variant="standard"
                                                        value={task.title}
                                                        placeholder="What are you working on?"
                                                        onChange={(e) => {
                                                            handleChange(task.id, 'title', e.target.value);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        InputProps={{
                                                            disableUnderline: true
                                                        }}
                                                        sx={{
                                                            '& .MuiInputBase-input': { fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={task.priority}
                                                    onChange={(e) => handleChange(task.id, 'priority', e.target.value)}
                                                    variant="standard"
                                                    disableUnderline
                                                    sx={{
                                                        fontSize: '0.8rem', fontWeight: 600,
                                                        color: '#000000',
                                                        bgcolor: getPriorityColor(task.priority),
                                                        px: 1.5, py: 0.5, borderRadius: '8px',
                                                        '& .MuiSelect-select': { py: 0, pr: '24px !important' }
                                                    }}
                                                >
                                                    <MenuItem value="High">High</MenuItem>
                                                    <MenuItem value="Medium">Medium</MenuItem>
                                                    <MenuItem value="Low">Low</MenuItem>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={task.status || 'Not Started'}
                                                    onChange={(e) => handleChange(task.id, 'status', e.target.value)}
                                                    variant="standard"
                                                    disableUnderline
                                                    sx={{
                                                        fontSize: '0.8rem', fontWeight: 600,
                                                        color: getStatusParams(task.status).text,
                                                        bgcolor: getStatusParams(task.status).bg,
                                                        px: 1.5, py: 0.5, borderRadius: '8px',
                                                        '& .MuiSelect-select': { py: 0, pr: '24px !important' }
                                                    }}
                                                >
                                                    <MenuItem value="Not Started">Not Started</MenuItem>
                                                    <MenuItem value="In Progress">In Progress</MenuItem>
                                                    <MenuItem value="Completed">Completed</MenuItem>
                                                    <MenuItem value="Pending">Pending</MenuItem>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Box sx={{ position: 'relative' }}>
                                                        <TextField
                                                            value={task.estHour}
                                                            placeholder="0"
                                                            onChange={(e) => /^\d*$/.test(e.target.value) && handleChange(task.id, 'estHour', e.target.value)}
                                                            variant="standard"
                                                            InputProps={{ disableUnderline: true }}
                                                            sx={{ width: 30, input: { textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' } }}
                                                        />
                                                        <Typography variant="caption" sx={{ position: 'absolute', bottom: -10, left: 0, right: 0, textAlign: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>HR</Typography>
                                                    </Box>
                                                    <Typography color="#cbd5e1">:</Typography>
                                                    <Box sx={{ position: 'relative' }}>
                                                        <TextField
                                                            value={task.estMin}
                                                            placeholder="0"
                                                            onChange={(e) => /^\d*$/.test(e.target.value) && handleChange(task.id, 'estMin', e.target.value)}
                                                            variant="standard"
                                                            InputProps={{ disableUnderline: true }}
                                                            sx={{ width: 30, input: { textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' } }}
                                                        />
                                                        <Typography variant="caption" sx={{ position: 'absolute', bottom: -10, left: 0, right: 0, textAlign: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>MIN</Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <IconButton
                                                        onClick={() => toggleTimer(task.id)}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: task.isTimerRunning ? '#ef4444' : '#f1f5f9',
                                                            color: task.isTimerRunning ? 'white' : '#64748b',
                                                            '&:hover': { bgcolor: task.isTimerRunning ? '#dc2626' : '#e2e8f0' }
                                                        }}
                                                    >
                                                        {task.isTimerRunning ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                                                    </IconButton>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: task.isTimerRunning ? '#ef4444' : '#64748b' }}>
                                                        {formatTime(task.timeElapsed)}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    onClick={() => { setTaskToDelete(task.id); setDeleteDialogOpen(true); }}
                                                    disabled={task.isTimerRunning}
                                                    size="small"
                                                    sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' }, opacity: task.isTimerRunning ? 0.3 : 1 }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* DESKTOP ONLY: Task List Cards */}
                <Stack spacing={2.5} sx={{ display: { xs: 'none', md: 'flex' }, mb: 10 }}>
                    {tasksToRender.length === 0 ? (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 8, border: '2px dashed #cbd5e1', borderRadius: '24px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'transparent'
                            }}
                        >
                            <Box sx={{ p: 3, bgcolor: '#e2e8f0', borderRadius: '50%', mb: 2, color: '#64748b' }}>
                                <AddIcon sx={{ fontSize: 40 }} />
                            </Box>
                            <Typography variant="h6" color="#64748b" fontWeight="600">No tasks for today</Typography>
                            <Typography variant="body2" color="#94a3b8">Click "Add New Task" to get started with your day.</Typography>
                        </Paper>
                    ) : (
                        tasksToRender.map((task, index) => (
                            <Zoom in key={task.id} style={{ transitionDelay: `${index * 50}ms` }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5, borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: task.isTimerRunning ? '#fee2e2' : '#f1f5f9',
                                        boxShadow: task.isTimerRunning ? '0 10px 15px -3px rgba(239, 68, 68, 0.1)' : '0 4px 6px -1px rgba(0,0,0,0.02)',
                                        bgcolor: 'white',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
                                        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2
                                    }}
                                >
                                    <Box
                                        sx={{
                                            flex: 1, minWidth: '250px'
                                        }}
                                    >
                                        <TextField
                                            fullWidth
                                            variant="standard"
                                            value={task.title}
                                            placeholder="What are you working on?"
                                            onChange={(e) => {
                                                handleChange(task.id, 'title', e.target.value);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            InputProps={{
                                                disableUnderline: true
                                            }}
                                            inputProps={{
                                                maxLength: 500
                                            }}
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontSize: '1.05rem',
                                                    fontWeight: 600,
                                                    color: '#1e293b'
                                                },
                                                '& .MuiInputBase-input::placeholder': {
                                                    color: '#515457ff'
                                                }
                                            }}
                                        />
                                    </Box>


                                    {/* Priority Selector */}
                                    <Select
                                        value={task.priority}
                                        onChange={(e) => handleChange(task.id, 'priority', e.target.value)}
                                        displayEmpty
                                        variant="standard"
                                        disableUnderline
                                        sx={{
                                            minWidth: 100, fontSize: '0.875rem', fontWeight: 600,
                                            color: '#000000',
                                            bgcolor: getPriorityColor(task.priority),
                                            px: 1.5, py: 0.5, borderRadius: '8px',
                                            '& .MuiSelect-select': { py: 0, pr: '24px !important' }
                                        }}
                                    >
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="Low">Low</MenuItem>
                                    </Select>

                                    {/* Status Selector */}
                                    <Select
                                        value={task.status || 'Not Started'}
                                        onChange={(e) => handleChange(task.id, 'status', e.target.value)}
                                        variant="standard"
                                        disableUnderline
                                        sx={{
                                            minWidth: 120, fontSize: '0.8rem', fontWeight: 600,
                                            color: getStatusParams(task.status).text,
                                            bgcolor: getStatusParams(task.status).bg,
                                            px: 1.5, py: 0.5, borderRadius: '8px',
                                            '& .MuiSelect-select': { py: 0, pr: '24px !important' }
                                        }}
                                    >
                                        <MenuItem value="Not Started">Not Started</MenuItem>
                                        <MenuItem value="In Progress">In Progress</MenuItem>
                                        <MenuItem value="Completed">Completed</MenuItem>
                                        <MenuItem value="Pending">Pending</MenuItem>
                                    </Select>

                                    {/* Estimated Time */}
                                    <Stack direction="row" spacing={0} alignItems="center">
                                        <TextField
                                            type="text"
                                            value={task.estHour}
                                            placeholder="0"
                                            onChange={(e) => /^\d*$/.test(e.target.value) && handleChange(task.id, 'estHour', e.target.value)}
                                            InputProps={{
                                                disableUnderline: true,
                                                endAdornment: <span className="text-[10px] text-gray-400 font-bold ml-1">HR</span>
                                            }}
                                            variant="standard"
                                            sx={{ width: 45, input: { textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' } }}
                                        />
                                        <div className="w-[1px] bg-gray-200"></div>
                                        <TextField
                                            type="text"
                                            value={task.estMin}
                                            placeholder="0"
                                            onChange={(e) => /^\d*$/.test(e.target.value) && handleChange(task.id, 'estMin', e.target.value)}
                                            InputProps={{
                                                disableUnderline: true,
                                                endAdornment: <span className="text-[10px] text-gray-400 font-bold ml-1">MIN</span>
                                            }}
                                            variant="standard"
                                            sx={{ width: 45, input: { textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' } }}
                                        />
                                    </Stack>

                                    {/* Timer Controls & Display */}
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        bgcolor: task.isTimerRunning ? '#fef2f2' : '#f8fafc',
                                        p: 0.8, pr: 2, borderRadius: '50px',
                                        border: '1px solid', borderColor: task.isTimerRunning ? '#fecaca' : '#e2e8f0'
                                    }}>
                                        <IconButton
                                            onClick={() => toggleTimer(task.id)}
                                            size="small"
                                            sx={{
                                                bgcolor: task.isTimerRunning ? '#ef4444' : 'white',
                                                color: task.isTimerRunning ? 'white' : '#64748b',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                '&:hover': { bgcolor: task.isTimerRunning ? '#dc2626' : '#f1f5f9' }
                                            }}
                                        >
                                            {task.isTimerRunning ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                                        </IconButton>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem',
                                                color: task.isTimerRunning ? '#ef4444' : '#64748b'
                                            }}
                                        >
                                            {formatTime(task.timeElapsed)}
                                        </Typography>
                                    </Box>

                                    {/* Delete Action */}
                                    <IconButton
                                        onClick={() => { setTaskToDelete(task.id); setDeleteDialogOpen(true); }}
                                        disabled={task.isTimerRunning}
                                        sx={{
                                            color: '#ef4444',
                                            // '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' },
                                            opacity: task.isTimerRunning ? 0.3 : 1
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Paper>
                            </Zoom>
                        ))
                    )}

                    {/* Add New Task Button (Bottom of List) - Inline Style
                <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddTask}
                    sx={{
                        alignSelf: 'flex-start',
                        color: '#64748b',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        mt: 1,
                        px: 2,
                        py: 1,
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        bgcolor: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
                    }}
                >
                    Add Task
                </Button> */}
                </Stack>
            </Box>
            {/* End Main Content Container */}

            {/* Bottom Action Bar */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    p: { xs: 1, md: 1.5 },
                    px: { xs: 2, md: 3 },
                    borderRadius: '24px',
                    boxShadow:
                        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    display: { xs: 'none', md: 'flex' }, // Hidden on Mobile
                    alignItems: 'center',
                    gap: 2,

                    zIndex: 1300,
                    width: 'fit-content',
                    minWidth: '320px',
                    justifyContent: 'center'
                }}
            >

                {/* Day Start Button Moved to Header */}



                <Button
                    startIcon={<UpdateIcon />}
                    onClick={handleUpdateTasks}
                    disabled={!isDirty}
                    sx={{
                        color: isDirty ? '#10b981' : '#94a3b8',
                        fontWeight: 600, textTransform: 'none',
                        '&:hover': { bgcolor: '#f0fdf4' }
                    }}
                >
                    Save Changes
                </Button>

                <div className="h-6 w-[1px] bg-gray-200"></div>

                <Button
                    color="error"
                    startIcon={<NightIcon />}
                    onClick={handleEndDay}
                    disabled={!isSessionActiveToday || isDirty}
                    sx={{
                        fontWeight: 600, textTransform: 'none',
                        color: (!isSessionActiveToday || isDirty) ? '#cbd5e1' : '#ef4444',
                        '&:hover': { bgcolor: '#fef2f2' }
                    }}
                >
                    End Day
                </Button>
            </Box>
            {/* Container Removed */}

            {/* Delete Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Task?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this task? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
                    <Button
                        onClick={() => { removeTask(taskToDelete); setDeleteDialogOpen(false); }}
                        variant="contained" color="error"
                        sx={{ borderRadius: '10px', fontWeight: 600, boxShadow: 'none' }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openTaskDialog}
                onClose={() => setOpenTaskDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Edit Task Title
                </DialogTitle>

                <DialogContent dividers>
                    <TextField
                        multiline
                        fullWidth
                        autoFocus
                        onFocus={(e) => {
                            const val = e.target.value;
                            e.target.setSelectionRange(val.length, val.length);
                        }}
                        minRows={4}
                        variant="outlined"
                        value={tasksToRender.find(t => t.id === selectedTaskId)?.title || ''}
                        onChange={(e) => {
                            if (selectedTaskId) {
                                handleChange(selectedTaskId, 'title', e.target.value);
                                if (e.target.value.length <= 78) {
                                    setOpenTaskDialog(false);
                                }
                            }
                        }}
                        inputProps={{ maxLength: 500 }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                fontSize: '1rem',
                                lineHeight: 1.6
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => setOpenTaskDialog(false)}
                        sx={{ textTransform: 'none' }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>


        </Box >
    );
};

export default TodayTask;
