import React from 'react';
import { Box, Typography, Button, Container, Grid, Tabs, Tab } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import StatsCard from './dashboard/StatsCard';
import TaskOverviewChart from './dashboard/TaskOverviewChart';
import RecentTasks from './dashboard/RecentTasks';
import ReportsView from './dashboard/ReportsView';
import DeveloperReportsView from './dashboard/DeveloperReportsView';
import { useTaskStore } from '../store/useTaskStore';
import { useUserStore } from '../store/useUserStore';
import { useMasterStore } from '../store/useMasterStore';

import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { getStats, tasks, history } = useTaskStore();
    const { role, currentUser } = useUserStore();
    const { users } = useMasterStore();

    // Revert to showing personal stats for Admin as well, per user request "Admin Task to show"
    const currentUserId = currentUser?.id || 'dev-default';
    const stats = getStats(currentUserId);

    const navigate = useNavigate();
    // 'overview', 'reports', 'devReports'
    const [view, setView] = React.useState('overview');

    const basePath = role === 'admin' ? '/app/admin' : '/app';

    const renderContent = () => {
        if (view === 'reports') {
            return (
                <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                    <ReportsView onClose={() => setView('overview')} />
                </Box>
            );
        }
        if (view === 'devReports' && role === 'admin') {
            return (
                <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                    <DeveloperReportsView onClose={() => setView('overview')} />
                </Box>
            );
        }

        // Default: Overview
        return (
            <Box sx={{ height: { xs: 'auto', md: '100%' }, pb: { xs: 8, md: 2 } }}>
                {/* <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%', padding: { xs: 2, md: '0 65px' } }}> */}
                {/* Stats Cards Row */}
                <Grid
                    container
                    spacing={{ xs: 2, md: 3 }}
                    sx={{
                        width: '100%',
                        px: { xs: 2, md: '65px' },
                        mb: 2
                    }}
                >
                    {role === 'admin' && (
                        <Grid item xs={6} sm={6} md={3}>
                            <StatsCard
                                title="Total Users"
                                count={users.length}
                                icon={<PeopleAltIcon />}
                                color="#9c27b0"
                                bgColor="#f3e5f5"
                            />
                        </Grid>
                    )}
                    <Grid item xs={6} sm={6} md={3}>
                        <StatsCard
                            title="Total Tasks"
                            count={stats.total}
                            icon={<AssignmentIcon />}
                            color="#1976d2"
                            bgColor="#e3f2fd"
                        />
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                        <StatsCard
                            title="Completed"
                            count={stats.completed}
                            icon={<CheckCircleIcon />}
                            color="#2e7d32"
                            bgColor="#e8f5e9"
                        />
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                        <StatsCard
                            title="Pending"
                            count={stats.pending}
                            icon={<PendingActionsIcon />}
                            color="#ed6c02"
                            bgColor="#fff3e0"
                        />
                    </Grid>
                    <Grid item xs={6} sm={6} md={3}>
                        <StatsCard
                            title="In Progress"
                            count={stats.inProgress}
                            icon={<BoltIcon />}
                            color="#0288d1"
                            bgColor="#e1f5fe"
                        />
                    </Grid>
                </Grid>
                {/* Recent Tasks & Overview Row */}
                {/* Recent Tasks & Overview Row */}
                <Grid
                    container
                    spacing={{ xs: 2, md: 3 }}
                    wrap={{ xs: 'wrap', md: 'nowrap' }}
                    sx={{
                        width: '100%',
                        px: { xs: 2, md: '70px' },
                        py: { xs: 1, md: '15px' },
                        mt: 0,
                        flexWrap: { xs: 'wrap', md: 'nowrap' } // Force correct behavior while keeping user's prop
                    }}
                >
                    {/* Recent Tasks (Left on Desktop, Top on Mobile) */}
                    <Grid item xs={12} md={7} lg={7.5} sx={{ height: { xs: 'auto', md: '580px' } }}>
                        <RecentTasks />
                    </Grid>
                    {/* Task Overview Chart (Right on Desktop, Bottom on Mobile) */}
                    <Grid item xs={12} md={5} lg={4.5} sx={{ height: { xs: 'auto', md: '600px' } }}>
                        <TaskOverviewChart userId={currentUserId} />
                    </Grid>
                </Grid>
            </Box>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 1, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'hidden' }, position: 'relative' }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                padding: { xs: 2, md: '0 70px' },
                flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile
                alignItems: { xs: 'flex-start', md: 'center' }, // Align left on mobile
                gap: { xs: 2, md: 0 },
                mb: 3,
                color: '#000000ff'
            }}>
                <Typography variant="h4" fontWeight="bold">Dashboard</Typography>
                <Box sx={{
                    display: 'flex',
                    gap: 1.5,
                    flexWrap: 'wrap', // Allow buttons to wrap if needed
                    width: { xs: '100%', md: 'auto' }
                }}>
                    <Button
                        variant={view === 'overview' ? "contained" : "outlined"}
                        onClick={() => setView('overview')}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            height: '40px',
                            px: 3,
                            fontWeight: 600,
                            flex: { xs: '1 1 auto', md: 'none' }, // Grow on mobile
                            borderWidth: '1.5px',
                            borderColor: view === 'overview' ? 'primary.main' : 'gray.300',
                            '&:hover': { borderWidth: '1.5px' }
                        }}
                    >
                        Overview
                    </Button>
                    <Button
                        variant={view === 'reports' ? "contained" : "outlined"}
                        onClick={() => setView('reports')}
                        startIcon={<BarChartIcon />}
                        sx={{
                            textTransform: 'none',
                            borderRadius: '12px',
                            height: '40px',
                            px: 3,
                            fontWeight: 600,
                            flex: { xs: '1 1 auto', md: 'none' },
                            borderWidth: '1.5px',
                            borderColor: view === 'reports' ? 'primary.main' : 'gray.300',
                            '&:hover': { borderWidth: '1.5px' }
                        }}
                    >
                        Reports
                    </Button>
                    {role === 'admin' && (
                        <Button
                            variant={view === 'devReports' ? "contained" : "outlined"}
                            onClick={() => setView('devReports')}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '12px',
                                height: '40px',
                                px: 3,
                                fontWeight: 600,
                                flex: { xs: '1 1 auto', md: 'none' },
                                borderWidth: '1.5px',
                                borderColor: view === 'devReports' ? 'primary.main' : 'gray.300',
                                '&:hover': { borderWidth: '1.5px' }
                            }}
                        >
                            Developer Time Reports
                        </Button>
                    )}
                </Box>
            </Box>

            {renderContent()}
        </Container>
    );
}
