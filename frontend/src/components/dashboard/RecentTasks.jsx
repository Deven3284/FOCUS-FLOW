import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTaskStore } from '../../store/useTaskStore';
import { useUserStore } from '../../store/useUserStore';
import { useMasterStore } from '../../store/useMasterStore';
import { useNavigate } from 'react-router-dom';

const RecentTasks = () => {
    const { tasks, addTask, syncTasksToBackend, dailyStatusId, fetchTodaysData } = useTaskStore();
    const { role, currentUser } = useUserStore();
    const navigate = useNavigate();
    const theme = useTheme();

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTodaysData();
    }, []);

    // NOTE: Card view removed to enforce consistent table layout with scroll

    const basePath = role === 'admin' ? '/app/admin' : '/app';
    const currentUserId = currentUser?.id || 'dev-default';

    /* =====================
       POPUP STATE
    ===================== */
    const [openTaskDialog, setOpenTaskDialog] = useState(false);
    const [selectedTaskTitle, setSelectedTaskTitle] = useState('');

    const handleOpenTask = (title) => {
        setSelectedTaskTitle(title);
        setOpenTaskDialog(true);
    };

    const handleCloseTask = () => {
        setOpenTaskDialog(false);
        setSelectedTaskTitle('');
    };

    const handleAddTask = async () => {
        addTask(
            {
                title: '',
                priority: 'Medium',
                status: 'Pending',
                dueDate: 'Today',
                estHour: 0,
                estMin: 0
            },
            currentUserId
        );

        // If day is started, sync immediately to persist task on backend
        // before navigation (which triggers a fetch that might overwrite local state)
        if (dailyStatusId) {
            await syncTasksToBackend();
        }

        navigate(`${basePath}/task`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#86efac';
            case 'In Progress': return '#93c5fd';
            case 'Pending': return '#fca5a5';
            default: return '#f3f4f6';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return '#fca5a5';
            case 'Medium': return '#fcd34d';
            case 'Low': return '#6ee7b7';
            default: return '#e5e7eb';
        }
    };



    // Filter Logic: Everyone sees THEIR OWN non-completed tasks
    const filteredTasks = tasks.filter(
        (task) => {
            const isCompleted = task.status === 'Completed';
            if (currentUserId === 'dev-default') return !isCompleted;
            return (task.userId === currentUserId) && !isCompleted;
        }
    );

    const gridColumns = '2.5fr 1.2fr 1fr 1fr 90px';

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 2 }, // Reduced padding on mobile
                    borderRadius: 4,
                    boxShadow: '0 4px 20px -5px rgba(0,0,0,0.08)',
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12)',
                        borderColor: 'transparent'
                    }
                }}
            >
                {/* HEADER */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="800" sx={{ color: '#1e293b' }}>
                        Recent Tasks
                    </Typography>
                    <Button
                        size="small"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            color: '#64748b',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' }
                        }}
                        onClick={() => navigate(`${basePath}/task`)}
                    >
                        View All
                    </Button>
                </Box>

                {/* SCROLLABLE CONTAINER */}
                <Box sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    pb: 1, // Space for scrollbar
                    // Custom Scrollbar
                    '&::-webkit-scrollbar': { width: '6px', height: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '4px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' },
                }}>
                    {/* MIN-WIDTH CONTAINER for Table Sync */}
                    <Box sx={{ minWidth: '600px' }}>

                        {/* TABLE HEADER */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: gridColumns,
                                gap: 2,
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid #e2e8f0',
                                fontWeight: 600,
                                color: '#64748b',
                                fontSize: '0.875rem',
                                bgcolor: '#f8fafc',
                                borderRadius: '8px 8px 0 0'
                            }}
                        >
                            <Box>Task</Box>
                            <Box>Status</Box>
                            <Box>Priority</Box>
                            <Box>Due Date</Box>
                            <Box textAlign="center">Action</Box>
                        </Box>

                        {/* TABLE BODY */}
                        {filteredTasks.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, color: '#94a3b8', gap: 1 }}>
                                <Typography variant="body2" fontWeight="500">No active tasks found</Typography>
                            </Box>
                        ) : (
                            filteredTasks.map((task) => (
                                <Box
                                    key={task.id}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: gridColumns,
                                        gap: 2,
                                        alignItems: 'center',
                                        px: 2,
                                        py: 1.5,
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'bgcolor 0.2s',
                                        '&:hover': { bgcolor: '#f8fafc' }
                                    }}
                                >
                                    {/* Task Title */}
                                    <Box sx={{ minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    cursor: task.title.length > 10 ? 'pointer' : 'default',
                                                    fontWeight: 600,
                                                    color: '#334155',
                                                    '&:hover': { color: task.title.length > 10 ? '#2563eb' : 'inherit' }
                                                }}
                                                title={task.title}
                                                onClick={() => task.title.length > 15 && handleOpenTask(task.title)}
                                            >
                                                {task.title.length > 15 ? task.title.slice(0, 15) + '...' : task.title}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Status */}
                                    <Chip
                                        label={task.status}
                                        size="small"
                                        sx={{
                                            bgcolor: getStatusColor(task.status),
                                            color: '#000000',
                                            borderRadius: '6px', height: 24, fontSize: '0.75rem', fontWeight: 600
                                        }}
                                    />

                                    {/* Priority */}
                                    <Box
                                        sx={{
                                            bgcolor: getPriorityColor(task.priority),
                                            color: '#000000',
                                            px: 1, py: 0.5, borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, width: 'fit-content',
                                            textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}
                                    >
                                        {task.priority}
                                    </Box>

                                    {/* Due Date */}
                                    <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                                        {task.dueDate}
                                    </Typography>

                                    {/* Action */}
                                    <Box textAlign="center">
                                        <Button
                                            size="small"
                                            sx={{ minWidth: 'auto', color: '#64748b', fontWeight: 600, '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                            onClick={() => navigate(`${basePath}/task`)}
                                        >
                                            View
                                        </Button>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Box>
                </Box>

                {/* FOOTER */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', pt: 2, borderTop: '1px solid #f1f5f9' }}>
                    <Button
                        variant="contained"
                        sx={{
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: '#0f172a',
                            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                            '&:hover': { bgcolor: '#334155' }
                        }}
                        onClick={handleAddTask}
                    >
                        + Add Task
                    </Button>
                </Box>
            </Paper>

            {/* TASK TITLE POPUP */}
            <Dialog
                open={openTaskDialog}
                onClose={handleCloseTask}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 800,
                        color: '#1e293b',
                        pb: 1
                    }}
                >
                    Task Title
                    <Button onClick={handleCloseTask} sx={{ minWidth: 'auto', color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                        <CloseIcon />
                    </Button>
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: '#e2e8f0' }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155', fontSize: '1rem' }}>
                        {selectedTaskTitle}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={handleCloseTask} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, bgcolor: '#cbd5e1', color: '#1e293b', boxShadow: 'none', '&:hover': { bgcolor: '#94a3b8' } }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RecentTasks;
