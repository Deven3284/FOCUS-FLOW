import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useNavStore } from "../store/useNavStore";
import video from "../assets/tutorial/FocusTask.mp4";
import { RiComputerLine, RiShieldStarLine } from "react-icons/ri"; // Added RiShieldStarLine
import { PiCirclesThreeLight } from "react-icons/pi";
import { RxVideo } from "react-icons/rx";
import { Box, Typography, Button, Menu, MenuItem, IconButton, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useUserStore } from "../store/useUserStore";
import { useMasterStore } from "../store/useMasterStore";
import { useTaskStore } from "../store/useTaskStore";
import { FormControl, Select, useTheme, useMediaQuery } from '@mui/material';
import { IoMdDocument } from "react-icons/io";

// Modal Style
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 900,
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  p: 0,
  outline: 'none',
  overflow: 'hidden'
};

const SubNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTutorialOpen, openTutorial, closeTutorial } = useNavStore();
  const { role } = useUserStore();
  const { users } = useMasterStore();
  const { historyFilterUserId, setHistoryFilterUserId } = useTaskStore();
  const basePath = role === 'admin' ? '/app/admin' : '/app';

  // Menu State for Tasks
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleMenuSelect = (path) => {
    navigate(path);
    handleMenuClose();
  };

  // Menu State for Masters
  const [masterAnchorEl, setMasterAnchorEl] = React.useState(null);
  const openMasterMenu = Boolean(masterAnchorEl);
  const handleMasterMenuClick = (event) => {
    setMasterAnchorEl(event.currentTarget);
  };
  const handleMasterMenuClose = () => {
    setMasterAnchorEl(null);
  };
  const handleMasterMenuSelect = (path) => {
    navigate(path);
    handleMasterMenuClose();
  };

  const isDashboardActive = location.pathname === '/app/dashboard' || location.pathname === '/app/admin/dashboard';
  const isTasksActive = location.pathname.startsWith("/app/task") || location.pathname.startsWith("/app/history") || location.pathname.startsWith("/app/admin/task") || location.pathname.startsWith("/app/admin/history");
  const isMasterActive = location.pathname.startsWith("/app/admin/master");
  const isSOPActive = location.pathname.includes('sop-documents');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // if (isMobile) return null; // Removed to allow Dialog to render on mobile

  return (
    <>
      <Box
        component="nav"
        sx={{
          height: 56,
          width: '100%',
          padding: '0 65px',
          bgcolor: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: { xs: 'none', md: 'flex' }, // Hide on mobile, moved to Drawer
          alignItems: 'center',
          gap: 1,
          position: 'sticky',
          top: '64px',
          zIndex: 999
        }}
      >
        <>
          {/* Dashboard Link */}
          <Button
            component={NavLink}
            to={role === 'admin' ? "/app/admin/dashboard" : "/app/dashboard"}
            startIcon={<RiComputerLine size={18} />}
            sx={{
              textTransform: 'none',
              color: isDashboardActive ? 'primary.main' : 'text.secondary',
              fontWeight: isDashboardActive ? 600 : 400,
              bgcolor: isDashboardActive ? '#eff6ff' : 'transparent',
              px: 2,
              borderRadius: 2,
              '&:hover': {
                bgcolor: isDashboardActive ? '#dbeafe' : '#f3f4f6',
                color: isDashboardActive ? 'primary.main' : 'text.primary'
              },
              '&.active': { color: 'primary.main', bgcolor: '#eff6ff' }
            }}
          >
            Dashboard
          </Button>
        </>
        {/* Master Module Dropdown (Admin Only) */}
        {role === 'admin' && (
          <>
            <Button
              onClick={handleMasterMenuClick}
              startIcon={<RiShieldStarLine size={18} />}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{
                textTransform: 'none',
                color: isMasterActive ? 'primary.main' : 'text.secondary',
                fontWeight: isMasterActive ? 600 : 400,
                bgcolor: isMasterActive ? '#eff6ff' : 'transparent',
                px: 2,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: isMasterActive ? '#dbeafe' : '#f3f4f6',
                  color: isMasterActive ? 'primary.main' : 'text.primary'
                },
                '&.active': { color: 'primary.main', bgcolor: '#eff6ff' }
              }}
            >
              Masters
            </Button>
            <Menu
              anchorEl={masterAnchorEl}
              open={openMasterMenu}
              onClose={handleMasterMenuClose}
              elevation={1}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              sx={{ mt: 1, '& .MuiPaper-root': { borderRadius: 2, minWidth: 150, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}
            >
              <MenuItem onClick={() => handleMasterMenuSelect("/app/admin/master/users")} sx={{ fontSize: '0.9rem', py: 1 }}>Users</MenuItem>
            </Menu>
          </>
        )}

        {/* Tasks Dropdown */}
        <Button
          onClick={handleMenuClick}
          startIcon={<PiCirclesThreeLight size={18} />}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            textTransform: 'none',
            color: isTasksActive ? 'primary.main' : 'text.secondary',
            fontWeight: isTasksActive ? 600 : 400,
            bgcolor: isTasksActive ? '#eff6ff' : 'transparent',
            px: 2,
            borderRadius: 2,
            '&:hover': {
              bgcolor: isTasksActive ? '#dbeafe' : '#f3f4f6',
              color: isTasksActive ? 'primary.main' : 'text.primary'
            },
            '&.active': { color: 'primary.main', bgcolor: '#eff6ff' }
          }}
        >
          Tasks
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          elevation={1}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{ mt: 1, '& .MuiPaper-root': { borderRadius: 2, minWidth: 150, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}
        >
          <MenuItem onClick={() => handleMenuSelect(`${basePath}/task`)} sx={{ fontSize: '0.9rem', py: 1 }}>Today's Tasks</MenuItem>
          <MenuItem onClick={() => handleMenuSelect(`${basePath}/history`)} sx={{ fontSize: '0.9rem', py: 1 }}>Task History</MenuItem>
        </Menu>

        {/* Tutorial Button */}
        <Button
          onClick={openTutorial}
          startIcon={<RxVideo size={18} />}
          sx={{
            textTransform: 'none',
            color: isTutorialOpen ? 'primary.main' : 'text.secondary',
            fontWeight: isTutorialOpen ? 600 : 400,
            bgcolor: isTutorialOpen ? '#eff6ff' : 'transparent',
            px: 2,
            borderRadius: 2,
            '&:hover': {
              bgcolor: isTutorialOpen ? '#dbeafe' : '#f3f4f6',
              color: isTutorialOpen ? 'primary.main' : 'text.primary'
            },
            '&.active': { color: 'primary.main', bgcolor: '#eff6ff' }
          }}
        >
          Tutorial
        </Button>

        {/* SOP Document Button (All Users) */}
        <Button
          onClick={() => navigate(role === 'admin' ? '/app/admin/sop-documents' : '/app/sop-documents')}
          startIcon={<IoMdDocument size={18} />}
          sx={{
            textTransform: 'none',
            color: isSOPActive ? 'primary.main' : 'text.secondary',
            fontWeight: isSOPActive ? 600 : 400,
            bgcolor: isSOPActive ? '#eff6ff' : 'transparent',
            px: 2,
            borderRadius: 2,
            '&:hover': {
              bgcolor: isSOPActive ? '#dbeafe' : '#f3f4f6',
              color: isSOPActive ? 'primary.main' : 'text.primary'
            },
            '&.active': { color: 'primary.main', bgcolor: '#eff6ff' }
          }}
        >
          SOP Document
        </Button>
      </Box>

      {/* Tutorial Dialog - Now Outside Box so it works on Mobile */}
      <Dialog
        open={isTutorialOpen}
        onClose={closeTutorial}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3, // No radius on mobile full screen
            overflow: 'hidden',
            bgcolor: 'black', // Cinematic feel
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
        slotProps={{
          backdrop: {
            sx: { backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.7)' }
          }
        }}
      >
        <Box sx={{
          position: 'relative',
          height: isMobile ? '100%' : 'auto', // Fill screen on mobile
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', // Center vertically
          bgcolor: 'black'
        }}>
          {/* Overlay Header */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
            }}
          >
            <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Getting Started
            </Typography>
            <IconButton
              onClick={closeTutorial}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                backdropFilter: 'blur(4px)'
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Video Container (16:9) */}
          <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
            <video
              controls
              autoPlay
              muted // Required for mobile autoplay
              playsInline // Required for iOS
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            >
              <source src={video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default SubNav;
