import React, { useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTaskStore } from '../../store/useTaskStore';
import { useTaskHistoryStore } from '../../store/useTaskHistoryStore';
import { MdOutlineDateRange } from "react-icons/md";
import { FaAngleDown } from "react-icons/fa";

const CalendarCheckIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
        <path d="M3 10h18" />
        <path d="m16 20 2 2 4-4" />
    </svg>
);

const TaskOverviewChart = ({ userId }) => {
    const { tasks, fetchTodaysData } = useTaskStore();
    const { history: apiHistory, fetchHistory } = useTaskHistoryStore();

    // State for the reference date (End of the 7-day window)
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const dateInputRef = React.useRef(null);

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTodaysData();
    }, []);

    // Fetch history when selectedDate changes
    // We fetch data around the selected date. 
    // Ideally we should ensure we have data for the sliding window. 
    // Sending the selected date to the backend.
    useEffect(() => {
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            fetchHistory(dateStr, userId === 'all' ? null : userId);
        }
    }, [selectedDate, userId, fetchHistory]);

    // --- Helper to filter history by user ---
    const getFilteredHistory = (history) => {
        if (userId === 'all') return history;
        return history.filter(h => h.userId === userId || (!h.userId && userId === 'dev-default'));
    };

    // Calculate the 7-day window
    const dateWindow = useMemo(() => {
        const days = [];
        const endDate = new Date(selectedDate);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            days.push(d);
        }
        return days;
    }, [selectedDate]);

    // --- Data Processing for 7-Day Stats (Donut & Bar) ---
    // We calculate everything based on the 7-day window to ensure consistency
    const { stats, barData } = useMemo(() => {
        const filteredHistory = getFilteredHistory(apiHistory);
        const processedDays = [];

        let totalCompleted = 0;
        let totalInProgress = 0;
        let totalPending = 0;

        dateWindow.forEach(date => {
            const monthShort = date.toLocaleDateString('en-IN', { month: 'short' });
            const dayNum = date.getDate();
            const year = date.getFullYear();
            const shortDate = `${monthShort} ${dayNum}`; // "Jan 1"

            // Legacy/Store Date Format "01 Jan 2026"
            const storeFormat = date.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                timeZone: 'Asia/Kolkata'
            });
            // ISO Date Format
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const isoDate = `${year}-${mm}-${dd}`;

            // Find history for this specific day
            const historyEntry = filteredHistory.find(h =>
                h.date === storeFormat || h.rawDate === isoDate
            );

            let dayCompleted = 0;
            let dayInProgress = 0;
            let dayPending = 0;

            if (historyEntry) {
                (historyEntry.tasks || []).forEach(t => {
                    const s = (t.status || '').toLowerCase();
                    if (s === 'completed') dayCompleted++;
                    else if (s === 'in progress' || s === 'in-progress' || s === 'in-progress') dayInProgress++;
                    else dayPending++;
                });
            }

            // Merge 'Today' if applicable and not in history
            const now = new Date();
            const isToday =
                date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();

            if (isToday && !historyEntry) {
                const currentTasks = userId === 'all'
                    ? tasks
                    : tasks.filter(t => t.userId === userId || (!t.userId && userId === 'dev-default'));

                currentTasks.forEach(t => {
                    const s = (t.status || '').toLowerCase();
                    if (s === 'completed') dayCompleted++;
                    else if (s === 'in progress' || s === 'in-progress' || s === 'in-progress') dayInProgress++;
                    else dayPending++;
                });
            }

            // Update Totals
            totalCompleted += dayCompleted;
            totalInProgress += dayInProgress;
            totalPending += dayPending;

            processedDays.push({
                name: shortDate,
                dayOfMonth: dayNum,
                completed: dayCompleted,
                inProgress: dayInProgress,
                pending: dayPending,
                total: dayCompleted + dayInProgress + dayPending
            });
        });

        return {
            stats: {
                completed: totalCompleted,
                inProgress: totalInProgress,
                pending: totalPending,
                total: totalCompleted + totalInProgress + totalPending
            },
            barData: processedDays
        };

    }, [userId, tasks, apiHistory, dateWindow]);


    // Donut Data
    const donutData = [
        { name: 'Completed', value: stats.completed, color: '#4ade80' },
        { name: 'In Progress', value: stats.inProgress, color: '#fbbf24' },
        { name: 'Pending', value: stats.pending, color: '#3b82f6' },
    ].filter(d => d.value > 0);

    const isEmpty = donutData.length === 0;
    const chartData = isEmpty ? [{ name: 'No Data', value: 1, color: '#e5e7eb' }] : donutData;

    // Bar Totals (For Bottom List)
    // In this 7-day view, stats and barTotals are identical as they cover the same range
    const barTotals = stats;


    // Styles matching the image
    const COLORS = {
        completed: '#4ade80',  // Green
        inProgress: '#fbbf24', // Orange
        pending: '#3b82f6',    // Blue
    };

    const StatusBadge = ({ color, label }) => (
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
            <span className="text-sm text-gray-600 font-medium">{label}</span>
        </div>
    );

    const StatRow = ({ label, value, color }) => (
        <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                <span className="text-gray-600 text-sm">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">{value}</span>
                <div className="w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                    <CalendarCheckIcon className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );

    // Display Header: Date Range
    // "Jan 1, 2026 - Jan 7, 2026"
    const startDate = dateWindow[0];
    const endDate = dateWindow[dateWindow.length - 1];

    // Helper to format date for header
    const formatHeaderDate = (d) => {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const headerDateDisplay = `${formatHeaderDate(startDate)} - ${formatHeaderDate(endDate)}`;

    const handleDateClick = () => {
        if (dateInputRef.current) {
            dateInputRef.current.showPicker();
        }
    };

    const handleDateChange = (e) => {
        if (e.target.value) {
            setSelectedDate(new Date(e.target.value));
        }
    };

    return (
        <div
            className="bg-white rounded-[24px] p-4 md:p-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_20px_5px_rgba(0,0,0,0.20)] transition-shadow duration-300 w-full h-full flex flex-col border border-gray-100"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Task Overview</h2>
                <div
                    onClick={handleDateClick}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-gray-600 font-medium shadow-sm hover:border-gray-300 transition-colors cursor-pointer relative"
                ><MdOutlineDateRange />
                    <span>{headerDateDisplay}</span>
                    <span className="text-gray-400 text-m"><FaAngleDown /></span>

                    {/* Hidden Date Input */}
                    <input
                        type="date"
                        ref={dateInputRef}
                        onChange={handleDateChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0"
                        style={{ pointerEvents: 'none' }}
                    />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-grow">
                {/* LEFT: Donut Chart Section (7-Day Stats) */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 my-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Tasks</div>
                            <div className="text-3xl font-bold text-gray-800 transition-all">{stats.total}</div>
                        </div>
                    </div>

                    {/* Stats List (7-Day) */}
                    <div className="w-full max-w-[200px] mt-2 space-y-2">
                        <StatRow label="Completed" value={stats.completed} color={COLORS.completed} />
                        <StatRow label="In Progress" value={stats.inProgress} color={COLORS.inProgress} />
                        <StatRow label="Pending" value={stats.pending} color={COLORS.pending} />
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block w-px bg-gray-100 mx-2 self-stretch"></div>

                {/* RIGHT: Bar Chart Section */}
                <div className="flex-[1.5] flex flex-col h-full min-h-[300px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <h3 className="font-bold text-gray-700">Tasks in Last 7 Days</h3>
                        <div className="flex flex-wrap gap-3">
                            <StatusBadge label="Completed" color={COLORS.completed} />
                            <StatusBadge label="In Progress" color={COLORS.inProgress} />
                            <StatusBadge label="Pending" color={COLORS.pending} />
                        </div>
                    </div>

                    {/* Chart Container - Fixed height fallback */}
                    <div className="w-full h-[300px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barSize={24} stackOffset="sign" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#f3f4f6" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    dy={10}
                                    interval={0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb', radius: 4 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                />
                                <Bar dataKey="pending" stackId="a" fill={COLORS.pending} radius={[0, 0, 4, 4]} />
                                <Bar dataKey="inProgress" stackId="a" fill={COLORS.inProgress} />
                                <Bar dataKey="completed" stackId="a" fill={COLORS.completed} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stats List for Bar Chart Section */}
                    <div className="w-full mt-auto space-y-2 border-t border-gray-100 pt-3">
                        <div className="flex justify-between items-center px-4 hover:bg-gray-50 rounded-lg transition-colors py-1">
                            <StatusBadge label="Completed" color={COLORS.completed} />
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                {barTotals.completed} <CalendarCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                        </div>
                        <div className="flex justify-between items-center px-4 hover:bg-gray-50 rounded-lg transition-colors py-1">
                            <StatusBadge label="In Progress" color={COLORS.inProgress} />
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                {barTotals.inProgress} <CalendarCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                        </div>
                        <div className="flex justify-between items-center px-4 hover:bg-gray-50 rounded-lg transition-colors py-1">
                            <StatusBadge label="Pending" color={COLORS.pending} />
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                {barTotals.pending} <CalendarCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskOverviewChart;
