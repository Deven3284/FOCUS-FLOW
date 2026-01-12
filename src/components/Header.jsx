import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useNavStore } from "../store/useNavStore"; // Import NavStore for tutorial
import { PiCirclesThreeLight } from "react-icons/pi";
import {
    Box, AppBar, Toolbar, IconButton, Typography, Button,
    Avatar, Menu, MenuItem, List, ListItem, ListItemButton,
    ListItemText, Divider, useTheme, useMediaQuery, Collapse
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DvrIcon from '@mui/icons-material/Dvr';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import GridViewIcon from '@mui/icons-material/GridView';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { IoMdNotificationsOutline } from "react-icons/io";
import { useNotificationStore } from '../store/useNotificationStore';
import { Badge, Popover, ListSubheader } from '@mui/material'; // Adding Popover/Badge

const Header = () => {
    const navigate = useNavigate();
    const { userInfo, logout, role, currentUser } = useUserStore();
    const { openTutorial } = useNavStore(); // Access tutorial
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { notifications, markAsRead, removeNotification } = useNotificationStore();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);

    // Filter Notifications
    const myNotifications = notifications.filter(n => {
        // Filter out notifications created by self (optional, but requested implicitly)
        // if (n.actionUser === (currentUser?.name || 'Admin')) return false;

        if (n.targetType === 'ALL') return true;

        if (n.targetType === 'ROLE') {
            // Check if user has one of the allowed roles
            // currentUser.role is like 'admin', 'user'. targetRoles might be ['Admin', 'Manager']
            // Normalize to ensure match
            const userRole = (currentUser?.role || '').toLowerCase();
            return n.targetRoles?.some(r => r.toLowerCase() === userRole);
        }

        if (n.targetType === 'USER') {
            return n.targetUsers?.includes(currentUser?.id);
        }

        return false;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

    const unreadCount = myNotifications.filter(n => !n.readBy?.includes(currentUser?.id)).length;

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id, currentUser?.id);
        setNotificationAnchorEl(null);
        if (notification.link) {
            // Check if admin route needed
            const finalLink = (role === 'admin' && !notification.link.includes('/admin'))
                ? notification.link.replace('/app/', '/app/admin/')
                : notification.link;
            navigate(finalLink);
        }
    };

    // Mobile Menu State
    const [tasksOpen, setTasksOpen] = useState(false);
    const [mastersOpen, setMastersOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleProfileMenuClose();
        logout();
        navigate('/app/login');
    };

    const handleNavigate = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    // Mobile Drawer Content
    const drawerContent = (
        <Box sx={{ bgcolor: 'white', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)' }}>

            <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
                {/* Dashboard */}
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                        onClick={() => handleNavigate(role === 'admin' ? '/app/admin/dashboard' : '/app/dashboard')}
                        sx={{ borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                    >
                        <DvrIcon sx={{ mr: 2, fontSize: 22 }} />
                        <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 500 }} />
                    </ListItemButton>
                </ListItem>

                {/* SOP Documents */}
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                        onClick={() => handleNavigate(role === 'admin' ? '/app/admin/sop-documents' : '/app/sop-documents')}
                        sx={{ borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                    >
                        <PdfIcon sx={{ mr: 2, fontSize: 22 }} />
                        <ListItemText primary="SOP Documents" primaryTypographyProps={{ fontWeight: 500 }} />
                    </ListItemButton>
                </ListItem>

                {/* Masters (Admin Only) */}
                {role === 'admin' && (
                    <>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => setMastersOpen(!mastersOpen)}
                                sx={{ borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                            >
                                <GridViewIcon sx={{ mr: 2, fontSize: 22 }} />
                                <ListItemText primary="Masters" primaryTypographyProps={{ fontWeight: 500 }} />
                                {mastersOpen ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={mastersOpen} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                <ListItemButton sx={{ pl: 6, borderRadius: 2, color: '#64748b' }} onClick={() => handleNavigate('/app/admin/master/users')}>
                                    <ListItemText primary="Users" />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    </>
                )}

                {/* Tasks */}
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                        onClick={() => setTasksOpen(!tasksOpen)}
                        sx={{ borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                    >
                        <AccountTreeIcon sx={{ mr: 2, fontSize: 22 }} />
                        <ListItemText primary="Tasks" primaryTypographyProps={{ fontWeight: 500 }} />
                        {tasksOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={tasksOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton sx={{ pl: 6, borderRadius: 2, color: '#64748b' }} onClick={() => handleNavigate(role === 'admin' ? '/app/admin/task' : '/app/task')}>
                            <ListItemText primary="Today's Tasks" />
                        </ListItemButton>
                        <ListItemButton sx={{ pl: 6, borderRadius: 2, color: '#64748b' }} onClick={() => handleNavigate(role === 'admin' ? '/app/admin/history' : '/app/history')}>
                            <ListItemText primary="Task History" />
                        </ListItemButton>
                    </List>
                </Collapse>

                {/* Tutorial */}
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                        onClick={() => { openTutorial(); setMobileOpen(false); }}
                        sx={{ borderRadius: 2, color: '#475569', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
                    >
                        <PlayCircleOutlineIcon sx={{ mr: 2, fontSize: 22 }} />
                        <ListItemText primary="Tutorial" primaryTypographyProps={{ fontWeight: 500 }} />
                    </ListItemButton>
                </ListItem>
            </List>

        </Box>
    );

    return (
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#1a202c', zIndex: 1200 }}>
            <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 5 } }}>

                {/* Mobile: Hamburger/Close (Left) */}
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ display: { md: 'none' }, mr: 1, position: 'relative', zIndex: 20 }}
                >
                    {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                </IconButton>

                {/* Logo Section (Center on mobile, Left on desktop) */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        cursor: 'pointer',
                        // Centering logic for mobile
                        position: { xs: 'absolute', md: 'static' },
                        left: { xs: '50%', md: 'auto' },
                        transform: { xs: 'translateX(-50%)', md: 'none' }
                    }}
                    onClick={() => navigate(role === 'admin' ? '/app/admin/dashboard' : '/app/dashboard')}
                >
                    <PiCirclesThreeLight size={isMobile ? 24 : 28} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>FocusTask</Typography>
                </Box>

                {/* Desktop Navigation & Actions */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
                    <Button
                        variant="outlined"
                        sx={{
                            color: 'white',
                            borderColor: 'white',
                            textTransform: 'none',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }
                        }}
                        startIcon={<PiCirclesThreeLight />}
                        onClick={() => navigate(role === 'admin' ? '/app/admin/task' : '/app/task')}
                    >
                        Go to Task
                    </Button>

                    {/* Notification Section */}
                    <Box>
                        <IconButton
                            sx={{ color: 'white' }}
                            onClick={(e) => setNotificationAnchorEl(e.currentTarget)}
                        >
                            <Badge badgeContent={unreadCount} color="error">
                                <IoMdNotificationsOutline size={24} />
                            </Badge>
                        </IconButton>
                        <Popover
                            open={Boolean(notificationAnchorEl)}
                            anchorEl={notificationAnchorEl}
                            onClose={() => setNotificationAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            PaperProps={{
                                sx: { width: 320, maxHeight: 400, mt: 1.5, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
                            }}
                        >
                            <ListSubheader sx={{ fontWeight: 700, lineHeight: '40px', bgcolor: '#f8fafc' }}>
                                Notifications
                            </ListSubheader>
                            <Divider />
                            {myNotifications.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2">No notifications</Typography>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {myNotifications.map((notification) => (
                                        <ListItemButton
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            sx={{
                                                bgcolor: notification.readBy?.includes(currentUser?.id) ? 'transparent' : '#eff6ff',
                                                borderBottom: '1px solid #f1f5f9',
                                                pr: 6 // Make space for delete button
                                            }}
                                        >
                                            <ListItemText
                                                primary={notification.title}
                                                secondary={
                                                    <>
                                                        <Typography variant="caption" display="block" color="text.primary" sx={{ my: 0.5 }}>
                                                            {notification.message}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(notification.timestamp).toLocaleString()}
                                                        </Typography>
                                                    </>
                                                }
                                                primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeNotification(notification.id);
                                                }}
                                                sx={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    color: '#94a3b8',
                                                    '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' }
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </ListItemButton>
                                    ))}
                                </List>
                            )}
                        </Popover>
                    </Box>

                    <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                        onClick={handleProfileMenuOpen}
                    >
                        <Avatar
                            src={userInfo.profileImage}
                            alt={userInfo.name}
                            sx={{ width: 40, height: 40, bgcolor: 'gray.800' }}
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 600, color: 'white' }}>
                                {userInfo.name}
                            </Typography>
                            <Typography variant="caption" sx={{ lineHeight: 1, color: 'rgba(255,255,255,0.7)' }}>
                                {userInfo.position}
                            </Typography>
                        </Box>
                    </Box>

                </Box>


                {/* Mobile: Profile Icon (Right) */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, position: 'relative', zIndex: 20 }}>
                    <IconButton
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{ p: 0 }}
                    >
                        <Avatar
                            src={userInfo.profileImage}
                            alt={userInfo.name}
                            sx={{ width: 32, height: 32, border: '2px solid #374151' }}
                        />
                    </IconButton>
                </Box>


            </Toolbar>

            {/* Shared Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        bgcolor: '#1f2937',
                        color: 'white',
                        borderRadius: 3,
                        minWidth: 200,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        '& .MuiMenuItem-root': { py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate(role === 'admin' ? '/app/admin/settings' : '/app/settings'); }}>
                    Account Settings
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <MenuItem onClick={handleLogout} sx={{ color: '#f87171' }}>
                    Logout
                </MenuItem>
            </Menu>

            {/* Mobile Expandable Menu (Pushes Content Down) */}
            <Collapse in={mobileOpen} timeout="auto" unmountOnExit sx={{ width: '100%', display: { md: 'none' } }}>
                {drawerContent}
            </Collapse>
        </AppBar>
    );
};

export default Header;
