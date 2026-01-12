import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Grid,
    TextField,
    Button,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Avatar,
    InputAdornment,
    useTheme,
    Select,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Zoom,
    useMediaQuery,
    Fab,
    Card,
    CardHeader,
    CardContent,
    AppBar,
    Toolbar,
    Slide,
    Pagination,
    Stack,
    Snackbar,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import FilterListIcon from '@mui/icons-material/FilterList';
import { IoPersonAddOutline } from "react-icons/io5";
import { useTaskStore } from '../../store/useTaskStore';
import { useMasterStore } from '../../store/useMasterStore';
import { useUserStore } from '../../store/useUserStore';


// Helper for Avatar colors
function stringToColor(string) {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
}

function stringAvatar(name) {
    if (!name) return {};
    const initials = name.split(' ')[0][0];
    return {
        sx: {
            bgcolor: stringToColor(name),
            width: 40,
            height: 40,
            fontSize: '1rem',
            fontWeight: 'bold'
        },
        children: initials.toUpperCase(),
    };
}

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const Users = () => {
    const { history, activeSessions, tasks } = useTaskStore();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { users, addUser, updateUser, deleteUser } = useMasterStore();
    const { currentUser } = useUserStore();
    const [workTypeFilter, setWorkTypeFilter] = useState('all'); // Local state for filter
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'Devloper', // Default to developer
        jobTitle: '',
        workType: 'onsite',
        status: 'Active'
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 7;

    const [errors, setErrors] = useState({});

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const toastTimeoutRef = useRef(null);

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Mobile Form Open State
    const [mobileFormOpen, setMobileFormOpen] = useState(false);

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

    const validateForm = () => {
        let tempErrors = {};
        let isValid = true;

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            tempErrors.email = "Required";
            isValid = false;
        } else if (!emailRegex.test(formData.email)) {
            tempErrors.email = "Invalid format";
            isValid = false;
        } else if (!formData.email.endsWith('@itfuturz.com')) {
            tempErrors.email = "Must be @itfuturz.com";
            isValid = false;
        }

        // Mobile Validation
        const mobileRegex = /^[6-9][0-9]{9}$/;
        if (formData.mobile && !mobileRegex.test(formData.mobile)) {
            tempErrors.mobile = "Invalid mobile number";
            isValid = false;
        }

        // Password Validation
        if (!formData.password) {
            tempErrors.password = "Required";
            isValid = false;
        } else {
            // Regex: At least 1 lowercase, 1 digit, 1 special char (non-alphanumeric), min 6 chars
            const passwordRegex = /^(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{6,}$/;
            if (!passwordRegex.test(formData.password)) {
                tempErrors.password = "Min 6 chars, 1 digit, 1 special";
                isValid = false;
            }
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'name' || name === 'jobTitle') {
            // Capitalize first letter of each word
            value = value.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        } else if (name === 'email') {
            value = value.toLowerCase();
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = () => {
        if (!validateForm()) return false;
        if (!formData.name) return false;

        let success = true;
        if (isEditing) {
            updateUser(editId, formData);
            triggerToast('Member updated successfully');
            setIsEditing(false);
            setEditId(null);
        } else {
            addUser(formData);
            triggerToast('Member added successfully');
        }
        handleReset();
        return true;
    };

    const handleReset = () => {
        setFormData({
            name: '',
            email: '',
            mobile: '',
            password: '',
            role: 'user',
            jobTitle: '',
            workType: 'onsite',
            status: 'Active'
        });
        setIsEditing(false);
        setEditId(null);
        setErrors({});
    };

    const handleEdit = (user) => {
        setFormData(user);
        setIsEditing(true);
        setEditId(user.id);
        if (isMobile) setMobileFormOpen(true);
    };

    const handleDelete = (id) => {
        setUserToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteUser(userToDelete);
            triggerToast('User deleted successfully');
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (workTypeFilter === 'all' || (user.workType || 'Onsite').toLowerCase() === workTypeFilter.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handlePageChange = (event, value) => {
        setPage(value);
    };


    return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 4, bgcolor: '#f8fafc', overflow: 'auto', width: '100%', padding: { xs: 2.5, md: '10px 70px' } }}>
            <Container maxWidth="xl">
                {/* Header Section */}
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', letterSpacing: '-0.5px' }}>
                            Team Members
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                            Manage your team's access and information
                        </Typography>
                    </Box>
                    {/* Optional: Add Global Action Buttons here */}
                </Box>

                <Grid container spacing={4}>
                    {/* Left Column: Form (Desktop) / FAB (Mobile) */}
                    <Grid item xs={12} md={4} lg={3.5} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '24px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.02), 0 8px 10px -6px rgb(0 0 0 / 0.02)',
                                position: 'sticky',
                                top: 20
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ bgcolor: isEditing ? '#f59e0b' : '#3b82f6', variant: 'rounded' }}>
                                    {isEditing ? <EditIcon /> : <IoPersonAddOutline />}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight="700" color="#1e293b">
                                        {isEditing ? 'Edit Team Member' : 'Add Team Member'}
                                    </Typography>
                                    <Typography variant="caption" color="#64748b">
                                        {isEditing ? 'Update team member details' : 'Create new team member account'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    InputProps={{ sx: { borderRadius: '12px' } }}
                                />
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    InputProps={{ sx: { borderRadius: '12px' } }}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                    FormHelperTextProps={{ sx: { position: 'absolute', bottom: -20, ml: 0 } }} // Prevent shift
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Mobile"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleChange}
                                            variant="outlined"
                                            size="small"
                                            InputProps={{ sx: { borderRadius: '12px' } }}
                                            error={!!errors.mobile}
                                            helperText={errors.mobile}
                                            FormHelperTextProps={{ sx: { position: 'absolute', bottom: -20, ml: 0, whiteSpace: 'nowrap' } }} // Prevent shift
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            variant="outlined"
                                            size="small"
                                            InputProps={{ sx: { borderRadius: '12px' } }}
                                            error={!!errors.password}
                                            helperText={errors.password}
                                            FormHelperTextProps={{ sx: { position: 'absolute', bottom: -20, ml: 0, whiteSpace: 'nowrap' } }} // Prevent shift
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    fullWidth
                                    label="Job Title"
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    placeholder="e.g. Senior Developer"
                                    InputProps={{ sx: { borderRadius: '12px' } }}
                                />

                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Role"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                            size="small"
                                            InputProps={{ sx: { borderRadius: '12px', width: '150px' } }}
                                        >
                                            <MenuItem value="Admin">Admin</MenuItem>
                                            <MenuItem value="User">Developer</MenuItem>
                                            <MenuItem value="HR">HR</MenuItem>
                                            <MenuItem value="CEO Founder">CEO Founder</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={5}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Work Type"
                                            name="workType"
                                            value={formData.workType}
                                            onChange={handleChange}
                                            size="small"
                                            InputProps={{ sx: { borderRadius: '12px', width: '110px' } }}
                                        >
                                            <MenuItem value="Onsite">Onsite</MenuItem>
                                            <MenuItem value="Remote">Remote</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmit}
                                        disableElevation
                                        fullWidth
                                        startIcon={<SaveIcon />}
                                        sx={{
                                            bgcolor: '#0f172a',
                                            color: 'white',
                                            borderRadius: '12px',
                                            py: 1.2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { bgcolor: '#334155' }
                                        }}
                                    >
                                        {isEditing ? 'Update Member' : 'Add Member'}
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleReset}
                                            fullWidth
                                            startIcon={<RestartAltIcon />}
                                            sx={{
                                                borderColor: '#cbd5e1',
                                                color: '#64748b',
                                                borderRadius: '12px',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                    {/* Right Column: User List */}

                    <Grid item xs={12} md={8} lg={8.5} sx={{ width: { xs: '100%', md: '55%' } }}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: { xs: '16px', md: '24px' },
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.02), 0 8px 10px -6px rgb(0 0 0 / 0.02)',
                                overflow: 'hidden',
                                minHeight: { xs: 'calc(100vh - 200px)', md: 'auto' } // Ensure height on mobile
                            }}
                        >

                            {/* Table Actions Bar */}
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid #f1f5f9' }}>
                                <TextField
                                    placeholder="Search users..."
                                    variant="outlined"
                                    size="small"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ color: '#94a3b8' }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: '12px', bgcolor: '#f8fafc', '& fieldset': { border: 'none' } }
                                    }}
                                    sx={{ width: 300 }}
                                />
                                <Box sx={{ flexGrow: 1 }} />
                                <Select
                                    value={workTypeFilter}
                                    onChange={(e) => setWorkTypeFilter(e.target.value)}
                                    displayEmpty
                                    inputProps={{ 'aria-label': 'Filter by Work Mode' }}
                                    sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' }, border: '1px solid #e5e7eb', width: '150px', height: '40px' }}
                                >
                                    <MenuItem value="all">
                                        <Typography color="black">All Users</Typography>
                                    </MenuItem>
                                    <MenuItem value="onsite">
                                        <Typography color="black">On site</Typography>
                                    </MenuItem>
                                    <MenuItem value="remote">
                                        <Typography color="black">Remote</Typography>
                                    </MenuItem>
                                </Select>
                            </Box>

                            {isMobile ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>
                                    {paginatedUsers.map((user) => (
                                        <Card key={user.id} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                                            <CardHeader
                                                avatar={
                                                    <Avatar {...stringAvatar(user.name)} variant="rounded" sx={{ ...stringAvatar(user.name).sx, borderRadius: '12px' }} />
                                                }
                                                action={
                                                    <Box>
                                                        <IconButton size="small" onClick={() => handleEdit(user)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => handleDelete(user.id)} disabled={currentUser?.id === user.id} sx={{ color: '#ef4444' }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                }
                                                title={<Typography variant="subtitle1" fontWeight="700">{user.name}</Typography>}
                                                subheader={user.jobTitle || 'No Title'}
                                            />
                                            <CardContent sx={{ pt: 0 }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        <Chip
                                                            label={user.role === 'User' ? 'developer' : user.role}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: user.role === 'Admin' ? '#e0f2fe' : '#f0fdf4',
                                                                color: user.role === 'Admin' ? '#0284c7' : '#16a34a',
                                                                fontWeight: 700, borderRadius: '6px', height: 24
                                                            }}
                                                        />
                                                        <Chip
                                                            label={user.workType}
                                                            size="small"
                                                            icon={<WorkIcon style={{ fontSize: 12 }} />}
                                                            sx={{ bgcolor: 'transparent', border: '1px solid #e2e8f0', height: 24 }}
                                                        />
                                                        <Chip label="Active" size="small" color="success" sx={{ height: 24, fontSize: '0.7rem' }} />
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                <TableCell width="30%" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>USER INFO</TableCell>
                                                <TableCell width="20%" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>CREDENTIALS</TableCell>
                                                <TableCell width="15%" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>ROLE</TableCell>
                                                <TableCell width="15%" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>STATUS</TableCell>
                                                <TableCell width="10%" align="right" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>ACTIONS</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paginatedUsers.map((user) => (
                                                <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: '0.2s' }}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Avatar {...stringAvatar(user.name)} variant="rounded" sx={{ ...stringAvatar(user.name).sx, borderRadius: '12px' }} />
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="700" color="#1e293b">
                                                                    {user.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="#515457" display="block">
                                                                    {user.jobTitle || 'No Title'}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography variant="body2" color="#334155" fontWeight={500}>{user.email}</Typography>
                                                            <Typography variant="caption" color="#5f6268ff">{user.password || '******'}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                                                            <Chip
                                                                label={user.role === 'Admin' ? 'Admin' : (user.role === 'User' ? 'Developer' : user.role)}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: user.role === 'Admin' ? '#e0f2fe' : '#f0fdf4',
                                                                    color: user.role === 'Admin' ? '#0284c7' : '#16a34a',
                                                                    fontWeight: 700,
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.7rem',
                                                                    height: '24px'
                                                                }}
                                                            />
                                                            <Chip
                                                                label={user.workType}
                                                                size="small"
                                                                icon={<WorkIcon style={{ fontSize: 12 }} />}
                                                                sx={{
                                                                    bgcolor: 'transparent',
                                                                    color: '#64748b',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.7rem',
                                                                    height: '24px',
                                                                    '& .MuiChip-icon': { color: '#94a3b8' }
                                                                }}
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label="Active"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#f0fdf4',
                                                                color: '#16a34a',
                                                                borderRadius: '6px',
                                                                fontWeight: 600,
                                                                border: '1px solid #dcfce7'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEdit(user)}
                                                                sx={{
                                                                    bgcolor: 'white',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    color: '#64748b',
                                                                    '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' }
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDelete(user.id)}
                                                                disabled={currentUser?.id === user.id}
                                                                sx={{
                                                                    bgcolor: 'white',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    color: '#ef4444',

                                                                    '&:hover': {
                                                                        bgcolor: currentUser?.id === user.id ? 'white' : '#fef2f2',
                                                                        borderColor: currentUser?.id === user.id ? '#e2e8f0' : '#fecaca'
                                                                    },

                                                                    '&.Mui-disabled': {
                                                                        color: '#9ca3af',
                                                                        cursor: 'not-allowed',
                                                                        bgcolor: '#f8fafc'
                                                                    }
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: '1px solid #f1f5f9' }}>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={handlePageChange}
                                        color="primary"
                                        shape="rounded"
                                        showFirstButton
                                        showLastButton
                                        sx={{
                                            '& .MuiPaginationItem-root': {
                                                borderRadius: '8px',
                                                fontWeight: 600
                                            }
                                        }}
                                    />
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                </Grid>
            </Container>
            {/* Delete Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete User?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this user? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained" color="error"
                        sx={{ borderRadius: '10px', fontWeight: 600, boxShadow: 'none' }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Mobile Form Dialog */}
            <Dialog
                fullScreen
                open={mobileFormOpen}
                onClose={() => setMobileFormOpen(false)}
                TransitionComponent={Transition}
            >
                <AppBar sx={{ position: 'relative', bgcolor: '#0f172a' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => setMobileFormOpen(false)} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            {isEditing ? 'Edit Team Member' : 'New Team Member'}
                        </Typography>
                        <Button autoFocus color="inherit" onClick={() => { if (handleSubmit()) setMobileFormOpen(false); }}>
                            save
                        </Button>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                        <TextField fullWidth label="Full Name" name="name" value={formData.name} onChange={handleChange} variant="outlined" InputProps={{ sx: { borderRadius: '12px' } }} />
                        <TextField fullWidth label="Email" name="email" value={formData.email} onChange={handleChange} variant="outlined" InputProps={{ sx: { borderRadius: '12px' } }} error={!!errors.email} helperText={errors.email} />
                        <TextField fullWidth label="Mobile" name="mobile" value={formData.mobile} onChange={handleChange} variant="outlined" InputProps={{ sx: { borderRadius: '12px' } }} error={!!errors.mobile} helperText={errors.mobile} />
                        <TextField fullWidth label="Password" name="password" value={formData.password} onChange={handleChange} variant="outlined" InputProps={{ sx: { borderRadius: '12px' } }} error={!!errors.password} helperText={errors.password} />
                        <TextField fullWidth label="Job Title" name="jobTitle" value={formData.jobTitle} onChange={handleChange} variant="outlined" InputProps={{ sx: { borderRadius: '12px' } }} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField select fullWidth label="Role" name="role" value={formData.role} onChange={handleChange} InputProps={{ sx: { borderRadius: '12px' } }}>
                                <MenuItem value="Admin">Admin</MenuItem>
                                <MenuItem value="User">Developer</MenuItem>
                                <MenuItem value="Sales Executive">Sales Executive</MenuItem>
                                <MenuItem value="HR">HR</MenuItem>
                                <MenuItem value="CEO Founder">CEO Founder</MenuItem>
                            </TextField>
                            <TextField select fullWidth label="Work Type" name="workType" value={formData.workType} onChange={handleChange} InputProps={{ sx: { borderRadius: '12px' } }}>
                                <MenuItem value="Onsite">Onsite</MenuItem>
                                <MenuItem value="Remote">Remote</MenuItem>
                            </TextField>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Mobile FAB */}
            {isMobile && !mobileFormOpen && (
                <Fab
                    color="primary"
                    aria-label="add"
                    sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: '#0f172a' }}
                    onClick={() => { handleReset(); setMobileFormOpen(true); }}
                >
                    <IoPersonAddOutline size={24} />
                </Fab>
            )}

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
        </Box>
    );
};

export default Users;
