import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTaskStore } from '../../store/useTaskStore';
import { useMasterStore } from '../../store/useMasterStore';
import { MdOutlineDateRange, MdAccessTime, MdAssignment } from "react-icons/md";
import { FiUser, FiClock, FiList, FiFilter } from "react-icons/fi";

const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr || startStr === '-' || endStr === '-') return '-';

    // Helper to parse "9:00 AM" to minutes
    const parseTime = (timeStr) => {
        // Robust parsing handling non-breaking spaces and various formats
        const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s|[\u2000-\u206F]|[\u00A0])?([APap][Mm])?/);
        if (!match) return 0;

        let hours = parseInt(match[1], 10);
        let minutes = parseInt(match[2], 10);
        const modifier = match[3] ? match[3].toUpperCase() : null;

        if (modifier) {
            if (hours === 12) hours = 0;
            if (modifier === 'PM') hours += 12;
        }
        return hours * 60 + minutes;
    };

    try {
        const startMin = parseTime(startStr);
        const endMin = parseTime(endStr);
        let diff = endMin - startMin;
        if (diff < 0) diff += 24 * 60; // Handle midnight crossing

        if (diff < 60) {
            return `${diff} minutes`;
        } else {
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return m === 0 ? `${h} hours` : `${h}h ${m}m`;
        }
    } catch (e) {
        return '-';
    }
};

export default function DeveloperReportsView({ onClose }) {
    const { history, activeSessions, tasks } = useTaskStore();
    const { users } = useMasterStore();

    // Default to Today
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const [currentTime, setCurrentTime] = useState(Date.now());
    const [workTypeFilter, setWorkTypeFilter] = useState('all');

    // Update current time every minute to refresh "Active" durations
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const dateInputRef = useRef(null);

    // Filter State
    const [appliedFilters, setAppliedFilters] = useState({
        userId: 'all',
        date: new Date().toISOString().split('T')[0]
    });

    const [selectedSession, setSelectedSession] = useState(null);

    const handleCloseDialog = () => {
        setSelectedSession(null);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-50 text-red-600 border-red-100';
            case 'Medium': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'Low': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleSearch = () => {
        setAppliedFilters({
            userId: workTypeFilter,
            date: selectedDate
        });
    };

    const reportData = useMemo(() => {
        if (!users) return [];

        const targetDate = new Date(appliedFilters.date);
        const month = targetDate.toLocaleDateString('en-In', { month: 'short', timeZone: 'Asia/Kolkata' });

        // Default to Legacy: Jan 6, 2026
        const dateString = `${month} ${targetDate.getDate()}, ${targetDate.getFullYear()}`;

        // Fallback for interim: 06 Jan 2026
        const standardDateStr = targetDate.toLocaleDateString('en-In', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

        const isToday = appliedFilters.date === new Date().toISOString().split('T')[0];

        // Filter users based on workType
        const filteredUsers = users.filter(user => {
            const filterType = appliedFilters.userId;
            if (!filterType || filterType.toLowerCase() === 'all') return true;
            return user.workType?.toLowerCase() === filterType.toLowerCase();
        });

        return filteredUsers.map(user => {
            // 1. Find History for this date
            // Check legacy OR interim standard
            const userHistory = history.find(h => h.userId === user.id && (h.date === dateString || h.date === standardDateStr));

            // 2. Check Active Session
            const activeStartTime = (isToday && activeSessions[user.id]) ? activeSessions[user.id] : null;

            let startTime = '-';
            let endTime = '-';
            let totalTime = '-';
            let taskCount = 0;

            if (userHistory) {
                startTime = userHistory.startTime;
                endTime = userHistory.endTime;
                taskCount = userHistory.tasks ? userHistory.tasks.length : 0;
            }

            if (activeStartTime) {
                const activeStartStr = new Date(activeStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

                if (startTime === '-') {
                    startTime = activeStartStr;
                }
                endTime = 'Active Now';
            }

            if (isToday) {
                const currentTasksCount = tasks.filter(t => t.userId === user.id).length;
                taskCount = (userHistory?.taskCount || 0) + currentTasksCount;
            }

            const historyTasks = userHistory?.tasks || [];
            const activeTasksToday = isToday ? tasks.filter(t => t.userId === user.id && t.dueDate === 'Today') : [];
            const mergedTasks = [...historyTasks, ...activeTasksToday];

            // Calculate active duration
            if (activeStartTime && isToday) {
                const diff = currentTime - activeStartTime; // diff in ms
                const seconds = Math.floor(diff / 1000);

                if (seconds < 60) {
                    totalTime = `${seconds} seconds (Running)`;
                } else {
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) {
                        totalTime = `${minutes} minutes (Running)`;
                    } else {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        totalTime = `${h}h ${m}m (Running)`;
                    }
                }
            } else if (startTime !== '-' && endTime !== '-') {
                totalTime = calculateDuration(startTime, endTime);
            }

            return {
                id: user.id,
                name: user.name,
                role: user.position || 'Developer',
                workType: user.workType || 'Remote',
                startTime,
                endTime,
                totalTime,
                taskCount,
                tasks: mergedTasks,
                isActive: !!activeStartTime
            };
        });
    }, [users, history, activeSessions, appliedFilters, tasks, currentTime]);

    return (
        <Box sx={{ px: { xs: 2, md: '80px' }, py: 2, height: '100%', overflowY: 'auto' }}>
            <div className="w-full h-full flex flex-col bg-white rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Daily Developer Reports</h2>
                        <p className="text-sm text-gray-500 mt-1">Track attendance, work hours, and task completion.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Access Control / Filter - Styled Selection */}
                        <div className="relative group">
                            <select
                                value={workTypeFilter}
                                onChange={(e) => setWorkTypeFilter(e.target.value)}
                                className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                            >
                                <option value="all">All</option>
                                <option value="onsite">On-site</option>
                                <option value="remote">Remote</option>
                            </select>
                            <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Date Picker - Custom Trigger */}
                        <div
                            className="relative bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-all group"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <MdOutlineDateRange className="text-gray-500 group-hover:text-blue-500 transition-colors" size={16} />
                            <span className="text-sm font-medium text-gray-700">
                                {new Date(selectedDate).toLocaleDateString('en-In', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                            </span>
                            <input
                                type="date"
                                ref={dateInputRef}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-gray-200 flex items-center gap-2"
                        >
                            <SearchIcon style={{ fontSize: 18 }} />
                            Search
                        </button>

                        <button
                            onClick={() => setCurrentTime(Date.now())}
                            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            title="Refresh"
                        >
                            <RefreshIcon style={{ fontSize: 20 }} />
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {reportData.length > 0 ? (
                        reportData.map((row) => (
                            <div
                                key={row.id}
                                className="group bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col md:flex-row items-center gap-6"
                            >
                                {/* User Info */}
                                <div className="flex items-center gap-4 w-full md:w-[25%] border-b md:border-b-0 md:border-r border-gray-50 pb-4 md:pb-0 md:pr-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${row.isActive ? 'bg-green-100 text-green-600 ring-4 ring-green-50' : 'bg-blue-50 text-blue-600'}`}>
                                        {row.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-sm">{row.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${row.workType === 'Remote' ? 'bg-purple-400' : 'bg-orange-400'}`}></span>
                                            {row.role}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Start Time</p>
                                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                            <FiClock className="text-gray-400" size={14} />
                                            {row.startTime}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">End Time</p>
                                        <p className={`text-sm font-semibold flex items-center gap-1.5 ${row.endTime === 'Active Now' ? 'text-green-600' : 'text-gray-700'}`}>
                                            {row.endTime === 'Active Now' && <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>}
                                            {row.endTime}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Duration</p>
                                        <p className="text-sm font-semibold text-gray-700">{row.totalTime}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tasks</p>
                                        <button
                                            onClick={() => setSelectedSession({
                                                date: appliedFilters.date,
                                                tasks: row.tasks,
                                                userName: row.name
                                            })}
                                            className="text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors flex items-center gap-2 w-fit"
                                        >
                                            <MdAssignment />
                                            {row.taskCount} Tasks
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 min-h-[300px]">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                <FiUser size={30} className="text-gray-300" />
                            </div>
                            <p className="text-sm">No developers found for the selected criteria.</p>
                        </div>
                    )}
                </div>

                {/* Task Details Dialog */}
                <Dialog
                    open={!!selectedSession}
                    onClose={handleCloseDialog}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        style: { borderRadius: 24, padding: '16px' }
                    }}
                >
                    <div className="flex justify-between items-center mb-6 px-4 pt-2">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Task Details</h3>
                            <p className="text-sm text-gray-500">{selectedSession?.userName} • {selectedSession?.date}</p>
                        </div>
                        <button onClick={handleCloseDialog} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <CloseIcon />
                        </button>
                    </div>

                    <DialogContent dividers className="!border-gray-100 !py-4 space-y-3">
                        {selectedSession?.tasks && selectedSession.tasks.length > 0 ? (
                            selectedSession.tasks.map((task, index) => (
                                <div key={task.id || index} className="bg-white border boundary-gray-100 border p-4 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-semibold text-gray-800 text-base">{task.title || "No Task Name"}</h4>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <div className={`px-2 py-0.5 rounded border text-xs font-medium flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </div>
                                        {(task.timeElapsed !== undefined) && (
                                            <div className="text-gray-500 flex items-center gap-1">
                                                <FiClock size={14} />
                                                {Math.floor(task.timeElapsed / 60)}m {task.timeElapsed % 60}s
                                            </div>
                                        )}
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
                            onClick={handleCloseDialog}
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
