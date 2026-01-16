import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, TextField, Button, Avatar, IconButton, Divider, Grid, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Slide, Fade, InputAdornment, useTheme, useMediaQuery
} from '@mui/material';
import { useUserStore } from '../store/useUserStore';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Snackbar, Alert } from '@mui/material';

// Transition for Dialog
const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Custom Styled TextField
const CustomTextField = ({ label, name, value, onChange, disabled, type = "text", placeholder, showEye, onToggleEye }) => (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography
            variant="subtitle2"
            sx={{
                mb: 1,
                fontWeight: 700,
                color: '#0f172a',
                fontSize: { xs: '0.9rem', md: '0.875rem' }
            }}
        >
            {label}
        </Typography>
        <TextField
            fullWidth
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            variant="outlined"
            size="medium"
            InputProps={{
                endAdornment: showEye && (
                    <InputAdornment position="end">
                        <IconButton onClick={onToggleEye} edge="end" size="small" sx={{ color: '#94a3b8' }}>
                            {type === 'text' ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
                sx: {
                    borderRadius: '12px',
                    bgcolor: disabled ? '#f8fafc' : '#eff6ff',
                    color: '#0f172a',
                    fontWeight: 500,
                    fontSize: { xs: '1rem', md: '0.95rem' },
                    '& .MuiInputBase-input': {
                        py: { xs: 2, md: 1.5 },
                        px: { xs: 2, md: 1.5 }
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#dbeafe',
                        borderWidth: '1.5px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: disabled ? '#dbeafe' : '#bfdbfe',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1976d2',
                        borderWidth: '2px',
                        boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
                    },
                    transition: 'all 0.2s ease-in-out',
                }
            }}
            sx={{
                '& .MuiInputBase-input::placeholder': {
                    color: '#94a3b8',
                    opacity: 1
                }
            }}
        />
    </Box>
)

const AccountSettings = () => {
    const { userInfo, updateUserInfo, changePassword, logout } = useUserStore();
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'password'
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        position: '',
        mobile: '',
        profileImage: ''
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Camera State
    const [openCamera, setOpenCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Load initial data
    useEffect(() => {
        if (userInfo) {
            setFormData({
                name: userInfo.name || '',
                email: userInfo.email || '',
                position: userInfo.position || '',
                mobile: userInfo.mobile || '',
                profileImage: userInfo.profileImage || ''
            });
        }
    }, [userInfo]);
    const isDisabled =
        !isEditing ||
        !formData.name?.trim() ||
        !formData.email?.trim() ||
        !formData.position?.trim() ||
        !formData.mobile?.trim();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const result = reader.result;
                setFormData(prev => ({ ...prev, profileImage: result }));
                const response = await updateUserInfo({ ...formData, profileImage: result });
                if (response === true || response.success) showSnackbar("Profile picture updated", "success");
                else showSnackbar(response.message || "Failed to update profile picture", "error");
            };
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        setOpenCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            showSnackbar("Could not access camera.", "error");
            setOpenCamera(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setOpenCamera(false);
    };

    const captureImage = async () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);

            const imageDataUrl = canvasRef.current.toDataURL('image/png');
            setFormData(prev => ({ ...prev, profileImage: imageDataUrl }));
            const response = await updateUserInfo({ ...formData, profileImage: imageDataUrl }); // Auto-save

            stopCamera();
            if (response === true || response.success) showSnackbar("Selfie captured & saved!", "success");
            else showSnackbar(response.message || "Failed to save selfie", "error");
        }
    };

    const handleSave = async () => {
        if (activeTab === 'personal') {
            const result = await updateUserInfo(formData);
            if (result === true || result.success) {
                setIsEditing(false);
                showSnackbar("Profile updated successfully.", "success");
            } else {
                showSnackbar(result.message || "Failed to update profile.", "error");
            }
        } else {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                showSnackbar("New passwords do not match.", "error");
                return;
            }
            if (!passwordData.currentPassword) {
                showSnackbar("Current password is required.", "error");
                return;
            }
            if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
                showSnackbar("New password must be at least 6 characters.", "error");
                return;
            }
            const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);
            if (!success) {
                showSnackbar("Incorrect current password or update failed.", "error");
                return;
            }
            showSnackbar("Password changed successfully.", "success");
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setIsEditing(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/app/login');
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <Box sx={{
            height: '100%',
            width: '100%',
            bgcolor: '#f8fafc',
            px: { xs: 0, md: 16 },
            py: { xs: 0, md: 3 },
            overflow: 'hidden',
        }}>
            <Box sx={{ width: '97%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Header */}
                {isMobile && (
                    <Box sx={{ mb: 2, px: 2, pt: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight="700" sx={{ color: '#0f172a', mb: 0.5 }}>
                            Account Settings
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Manage your profile and security.
                        </Typography>
                    </Box>
                )}

                <Paper elevation={0} sx={{
                    borderRadius: { xs: 0, md: '24px' },
                    bgcolor: 'white',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    overflow: 'hidden',
                    boxShadow: { xs: 'none', md: '0 4px 20px 0 #e2e8f0' },
                    border: { xs: 'none', md: '1px solid #e2e8f0' },
                    flexGrow: 1,
                    height: '100%',
                    width: '100%',
                    mx: 'auto'
                }}>
                    {/* MOBILE TOP NAVIGATION (Visible only on Mobile) */}
                    {isMobile && (
                        <Box sx={{
                            p: 2,
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            background: 'white' // Clean white header for mobile
                        }}>
                            {/* User Mini Profile */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar src={formData.profileImage} sx={{ width: 44, height: 44, border: '2px solid #e2e8f0' }} />
                                    <IconButton
                                        onClick={startCamera}
                                        sx={{
                                            position: 'absolute', bottom: -5, right: -5,
                                            width: 20, height: 20, bgcolor: '#0f172a', color: 'white',
                                            '&:hover': { bgcolor: '#334155' }
                                        }}
                                    >
                                        <CameraAltIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="700" color="#0f172a" lineHeight={1.2}>
                                        {formData.name || 'User'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        {formData.position || 'Developer'}
                                    </Typography>
                                </Box>
                                {/* File Upload Input (Hidden but accessible via another icon if needed, or just rely on camera for now? User asked for "update photo") */}
                                {/* Let's add a separate upload button next to it or just keep camera for "update photo" as per likely mobile usage */}
                                {/* <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                    <IconButton
                                        component="label"
                                        size="small"
                                        sx={{ bgcolor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    >
                                        <input hidden accept="image/*" type="file" onChange={handleImageUpload} />
                                        <EditIcon sx={{ fontSize: 18, color: '#64748b' }} />
                                    </IconButton>
                                </Box> */}
                            </Box>

                            {/* Segmented Control Tabs */}
                            <Box sx={{
                                display: 'flex',
                                p: 0.5,
                                bgcolor: '#f1f5f9',
                                borderRadius: '12px'
                            }}>
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={() => setActiveTab('personal')}
                                    sx={{
                                        bgcolor: activeTab === 'personal' ? 'white' : 'transparent',
                                        color: activeTab === 'personal' ? '#0f172a' : '#64748b',
                                        boxShadow: activeTab === 'personal' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        py: 0.8,
                                        '&:hover': { bgcolor: activeTab === 'personal' ? 'white' : 'rgba(255,255,255,0.5)' }
                                    }}
                                >
                                    Personal
                                </Button>
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={() => setActiveTab('password')}
                                    sx={{
                                        bgcolor: activeTab === 'password' ? 'white' : 'transparent',
                                        color: activeTab === 'password' ? '#0f172a' : '#64748b',
                                        boxShadow: activeTab === 'password' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        py: 0.8,
                                        '&:hover': { bgcolor: activeTab === 'password' ? 'white' : 'rgba(255,255,255,0.5)' }
                                    }}
                                >
                                    Security
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Left Sidebar (Hidden on Mobile) */}
                    <Box sx={{
                        width: { xs: '100%', md: '350px' },
                        display: { xs: 'none', md: 'flex' }, // HIDE ON MOBILE
                        borderRight: { md: '1px solid #f1f5f9' },
                        borderBottom: { xs: '1px solid #f1f5f9', md: 'none' },
                        flexDirection: 'column',

                    }}>
                        <Box sx={{
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            borderRadius: '15px',
                            background: '#eff6ff',
                        }}>
                            <Box sx={{ position: 'relative', mb: 2 }}>
                                <Avatar
                                    src={formData.profileImage}
                                    sx={{
                                        width: 96,
                                        height: 96,
                                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)',
                                        border: '4px solid rgba(255,255,255,0.8)'
                                    }}
                                />
                                <IconButton
                                    component="label"
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: -8,
                                        bgcolor: 'white',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: '#f1f5f9' }
                                    }}
                                >
                                    <input hidden accept="image/*" type="file" onChange={handleImageUpload} />
                                    <CameraAltIcon sx={{ fontSize: 16, color: '#0f172a' }} />
                                </IconButton>
                            </Box>
                            <Typography variant="h6" fontWeight="700" color="#0f172a">
                                {formData.name || 'User'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                                {formData.position || 'Developer'}
                            </Typography>
                            <Button
                                size="small"
                                onClick={startCamera}
                                sx={{
                                    textTransform: 'none',
                                    color: '#1976d2',
                                    bgcolor: '#dbeafe',
                                    borderRadius: '8px',
                                    px: 2,
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    border: '1px solid #bfdbfe',
                                    '&:hover': { bgcolor: '#bfdbfe' }
                                }}
                            >
                                Take Photo
                            </Button>
                        </Box>

                        <Divider sx={{ borderColor: '#f1f5f9' }} />

                        <Box sx={{ p: 2, flexGrow: 1 }}>
                            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                Account
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    fullWidth
                                    startIcon={<PersonOutlineIcon />}
                                    onClick={() => { setActiveTab('personal'); setIsEditing(false); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        px: 2.5,
                                        py: 1.5,
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        fontSize: '0.9rem',
                                        color: activeTab === 'personal' ? '#1976d2' : '#64748b',
                                        background: activeTab === 'personal' ? '#eff6ff' : 'transparent',
                                        fontWeight: activeTab === 'personal' ? 600 : 500,
                                        '&:hover': {
                                            bgcolor: activeTab === 'personal' ? '#dbeafe' : '#f1f5f9',
                                        }
                                    }}
                                >
                                    Personal Info
                                </Button>
                                <Button
                                    fullWidth
                                    startIcon={<LockOutlinedIcon />}
                                    onClick={() => { setActiveTab('password'); setIsEditing(false); }}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        px: 2.5,
                                        py: 1.5,
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        fontSize: '0.9rem',
                                        color: activeTab === 'password' ? '#1976d2' : '#64748b',
                                        background: activeTab === 'password' ? '#eff6ff' : 'transparent',
                                        fontWeight: activeTab === 'password' ? 600 : 500,
                                        '&:hover': {
                                            bgcolor: activeTab === 'password' ? '#dbeafe' : '#f1f5f9',
                                        }
                                    }}
                                >
                                    Login & Security
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* Right Content Area */}
                    <Box sx={{
                        flexGrow: 1,
                        p: { xs: 2, md: 4 },
                        bgcolor: '#ffffff',
                        overflowY: 'auto',
                        height: '100%',
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                    }}>
                        {/* Desktop Header */}
                        {!isMobile && (
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h5" fontWeight="700" sx={{ color: '#0f172a', mb: 0.5 }}>
                                    Account Settings
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    Manage your profile and security settings.
                                </Typography>
                                <Divider sx={{ mt: 3, borderColor: '#f1f5f9' }} />
                            </Box>
                        )}
                        {activeTab === 'personal' && (
                            <Fade in={true}>
                                <Box sx={{ maxWidth: '800px' }}>
                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'flex-start' }, mb: 3 }}>
                                        <Box sx={{ mb: { xs: 2, md: 0 } }}>
                                            <Typography variant="h6" fontWeight="600" color="#0f172a">Personal Information</Typography>
                                            <Typography variant="body2" color="#64748b">Update your personal details.</Typography>
                                        </Box>
                                        {!isEditing && (
                                            <Button
                                                startIcon={<EditIcon />}
                                                variant="contained"
                                                onClick={() => setIsEditing(true)}
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '10px',
                                                    width: { xs: '100%', md: 'auto' },
                                                    height: { xs: '48px', md: 'auto' },
                                                    background: '#eff6ff',
                                                    color: '#1976d2',
                                                    boxShadow: 'none',
                                                    fontWeight: 600,
                                                    border: '1px solid #dbeafe',
                                                    '&:hover': {
                                                        background: '#dbeafe'
                                                    }
                                                }}
                                            >
                                                Edit Details
                                            </Button>
                                        )}
                                    </Box>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="Full Name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="Your full name"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="Job Title"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="e.g. Senior Developer"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="Email Address"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="you@example.com"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="Phone Number"
                                                name="mobile"
                                                value={formData.mobile}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </Grid>
                                    </Grid>

                                    {isEditing && (
                                        <Box sx={{ mt: 5, display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 3, borderTop: '1px solid #f1f5f9' }}>
                                            <Button
                                                variant="text"
                                                onClick={() => setIsEditing(false)}
                                                sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                disabled={isDisabled}
                                                variant="contained"
                                                onClick={handleSave}
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '10px',
                                                    px: 3,
                                                    background: isDisabled ? '#e2e8f0' : '#eff6ff',
                                                    color: isDisabled ? '#94a3b8' : '#1976d2',
                                                    boxShadow: 'none',
                                                    border: isDisabled ? '1px solid #e2e8f0' : '1px solid #dbeafe',
                                                    '&:hover': {
                                                        background: isDisabled ? '#e2e8f0' : '#dbeafe',
                                                    },
                                                    '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' }
                                                }}
                                            >
                                                Save Changes
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            </Fade>
                        )}

                        {activeTab === 'password' && (
                            <Fade in={true}>
                                <Box sx={{ maxWidth: '700px' }}>
                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="h5" fontWeight="700" color="#0f172a">Password & Security</Typography>
                                        <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>Manage your password to keep your account safe.</Typography>
                                    </Box>



                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <CustomTextField
                                                label="Current Password"
                                                name="currentPassword"
                                                type={showPassword.current ? 'text' : 'password'}
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                showEye={true}
                                                onToggleEye={() => togglePasswordVisibility('current')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="New Password"
                                                name="newPassword"
                                                type={showPassword.new ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                showEye={true}
                                                onToggleEye={() => togglePasswordVisibility('new')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <CustomTextField
                                                label="Confirm New Password"
                                                name="confirmPassword"
                                                type={showPassword.confirm ? 'text' : 'password'}
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                                showEye={true}
                                                onToggleEye={() => togglePasswordVisibility('confirm')}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ mt: 5, display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 3, borderTop: '1px solid #f1f5f9' }}>
                                        <Button
                                            variant="contained"
                                            onClick={handleSave}
                                            sx={{
                                                textTransform: 'none',
                                                borderRadius: '10px',
                                                px: 3,
                                                background: '#eff6ff',
                                                color: '#1976d2',
                                                boxShadow: 'none',
                                                border: '1px solid #dbeafe',
                                                '&:hover': {
                                                    background: '#dbeafe',
                                                }
                                            }}
                                        >
                                            Update Password
                                        </Button>
                                    </Box>
                                </Box>
                            </Fade>
                        )}
                    </Box>
                </Paper>
            </Box >

            {/* Same Dialog and Snackbar components */}
            < Dialog
                open={openCamera}
                onClose={stopCamera}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
                TransitionComponent={Transition}
                PaperProps={{ sx: { borderRadius: isMobile ? 0 : '24px' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 4, pb: 1 }}>
                    Take a Profile Photo
                </DialogTitle>
                <DialogContent>
                    <Box sx={{
                        width: '100%',
                        height: '400',
                        bgcolor: 'black',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        <Box sx={{
                            position: 'absolute', bottom: 30, left: 0, right: 0,
                            display: 'flex', justifyContent: 'center', gap: 2
                        }}>
                            <IconButton
                                onClick={captureImage}
                                sx={{
                                    width: 72, height: 72,
                                    bgcolor: 'white',
                                    '&:hover': { bgcolor: '#f8fafc', transform: 'scale(1.05)' },
                                    border: '4px solid rgba(255,255,255,0.4)',
                                    boxShadow: '0 0 0 4px rgba(255,255,255,0.2)',
                                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                <CameraAltIcon sx={{ fontSize: 32, color: '#0f172a' }} />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 4, justifyContent: 'center' }}>
                    <Button onClick={stopCamera} sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog >

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box >
    );
};

export default AccountSettings;
