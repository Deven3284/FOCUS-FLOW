import React, { useState } from 'react';
import { useSOPStore } from '../store/useSOPStore';
import { useUserStore } from '../store/useUserStore';
import { useMasterStore } from '../store/useMasterStore';
import { useNotificationStore } from '../store/useNotificationStore';
import {
    Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Chip, Stack, Fade, FormControl, InputLabel,
    Select, MenuItem, Autocomplete, Snackbar, Alert, Slide
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Close as CloseIcon,
    CloudUpload as UploadIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const SOPDocument = () => {
    const { sopDocuments, addSOPDocument, updateSOPDocument, deleteSOPDocument } = useSOPStore();
    const { role, currentUser } = useUserStore();
    const { users } = useMasterStore();

    // Check if user has admin/HR privileges
    const canManageSOP = role === 'admin' || role === 'hr' || role === 'HR';
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        date: dayjs(),
        pdfFile: null,
        pdfName: '',
        visibilityType: 'ALL',
        allowedRoles: [],
        allowedUsers: []
    });
    const [errors, setErrors] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [viewPDF, setViewPDF] = useState(null); // State for PDF viewer
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setShowToast(false);
    };

    const handleOpenDialog = (doc = null) => {
        if (doc) {
            setEditingDoc(doc);
            setFormData({
                title: doc.title,
                date: dayjs(doc.date),
                pdfFile: null,
                pdfName: doc.pdfName || '',
                visibilityType: doc.visibilityType || 'ALL',
                allowedRoles: doc.allowedRoles || [],
                allowedUsers: doc.allowedUsers || []
            });
        } else {
            setEditingDoc(null);
            setFormData({
                title: '',
                date: dayjs(),
                pdfFile: null,
                pdfName: '',
                visibilityType: 'ALL',
                allowedRoles: [],
                allowedUsers: []
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingDoc(null);
        setFormData({
            title: '',
            date: dayjs(),
            pdfFile: null,
            pdfName: '',
            visibilityType: 'ALL',
            allowedRoles: [],
            allowedUsers: []
        });
        setErrors({});
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setErrors({ ...errors, pdf: 'Please upload only PDF files' });
                e.target.value = '';
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setErrors({ ...errors, pdf: 'File size must be less than 5MB' });
                e.target.value = '';
                return;
            }

            // Convert file to base64 for storage
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({
                    ...formData,
                    pdfFile: reader.result,
                    pdfName: file.name
                });
                if (errors.pdf) setErrors({ ...errors, pdf: null });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!editingDoc && !formData.pdfFile) {
            newErrors.pdf = 'PDF file is required';
        }

        if (formData.visibilityType === 'ROLE' && formData.allowedRoles.length === 0) {
            newErrors.roles = 'Please select at least one role';
        }

        if (formData.visibilityType === 'USER' && formData.allowedUsers.length === 0) {
            newErrors.users = 'Please select at least one user';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const docData = {
            title: formData.title,
            date: formData.date.format('DD MMM YYYY'),
            pdfUrl: formData.pdfFile || (editingDoc?.pdfUrl || ''),
            pdfName: formData.pdfName || (editingDoc?.pdfName || ''),

            visibilityType: formData.visibilityType,
            allowedRoles: formData.allowedRoles,
            allowedUsers: formData.allowedUsers,
            createdBy: editingDoc?.createdBy || currentUser?.name || 'Admin',
            // Default role of creator is their current role, unless it's an edit and we want to preserve it?
            // Usually simpler to just say 'Admin' or use their role.
            createdByRole: editingDoc?.createdByRole || role || 'Admin'
        };

        try {
            if (editingDoc) {
                updateSOPDocument(editingDoc.id, docData);
                setToastMessage('SOP Document updated successfully');

                // Trigger Notification for Update
                useNotificationStore.getState().addNotification({
                    title: 'SOP Document Updated',
                    message: `The SOP document "${docData.title}" has been updated by ${docData.createdBy}.`,
                    type: 'SOP_UPDATE',
                    targetType: docData.visibilityType,
                    targetRoles: docData.allowedRoles,
                    targetUsers: docData.allowedUsers,
                    link: '/app/sop-documents',
                    actionUser: currentUser?.name || 'Admin'
                });

            } else {
                addSOPDocument(docData);
                setToastMessage('SOP Document added successfully');

                // Trigger Notification for New SOP
                useNotificationStore.getState().addNotification({
                    title: 'New SOP Document',
                    message: `A new SOP document "${docData.title}" has been added by ${docData.createdBy}.`,
                    type: 'SOP_NEW',
                    targetType: docData.visibilityType,
                    targetRoles: docData.allowedRoles,
                    targetUsers: docData.allowedUsers,
                    link: '/app/sop-documents',
                    actionUser: currentUser?.name || 'Admin'
                });
            }
            setShowToast(true);
            handleCloseDialog();
        } catch (error) {
            console.error("Error saving SOP:", error);
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                alert("Failed to save: The PDF file is too large for local storage. Please try a smaller file.");
            } else {
                alert("Failed to save SOP Document: " + error.message);
            }
        }
    };

    const handleDelete = (id) => {
        deleteSOPDocument(id);
        setDeleteConfirm(null);
    };

    const handleDownloadPDF = (pdfUrl, pdfName) => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = pdfName;
        link.click();
    };

    // Filter SOPs based on visibility rules
    const filteredSOPs = sopDocuments.filter(doc => {
        // Admin and HR see all SOPs
        if (canManageSOP) return true;

        // Ensure visibilityType exists
        if (!doc.visibilityType) return true; // Default to ALL if undefined

        // Check visibility type
        if (doc.visibilityType === 'ALL') return true;

        if (doc.visibilityType === 'ROLE') {
            // Check if user's role is in allowed roles (case-insensitive)
            const userRole = (currentUser?.role || 'developer').toLowerCase();
            return doc.allowedRoles?.some(r => r.toLowerCase() === userRole);
        }

        if (doc.visibilityType === 'USER') {
            // Check if user's ID is in allowed users
            return doc.allowedUsers?.includes(currentUser?.id);
        }

        return false;
    });

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f8fafc',
            overflowY: 'auto',
            width: '100%',
            pl: { xs: 2, md: 10 },
            pr: { xs: 2, md: 10 },
            py: { xs: 2, md: 4 }
        }}>
            {/* Header */}
            <Box sx={{
                mb: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a', letterSpacing: '-1px' }}>
                        SOP Documents
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                        {canManageSOP ? 'Manage Standard Operating Procedure documents' : 'View Standard Operating Procedure documents'}
                    </Typography>
                </Box>
                {canManageSOP && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            bgcolor: '#0f172a',
                            color: 'white',
                            px: 3,
                            py: 1.5,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                            '&:hover': { bgcolor: '#334155' }
                        }}
                    >
                        Add SOP Document
                    </Button>
                )}
            </Box>

            {/* Desktop Table View */}
            <Fade in timeout={500}>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <TableContainer component={Paper} elevation={0} sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Sr No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Title</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Created By</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Create Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Update Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>PDF File</TableCell>

                                    {canManageSOP && (
                                        <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>Visibility</TableCell>
                                    )}
                                    <TableCell sx={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }} align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredSOPs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canManageSOP ? 7 : 6} align="center" sx={{ py: 8 }}>
                                            <Box sx={{ color: '#94a3b8' }}>
                                                <PdfIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                                <Typography fontWeight="500">No SOP documents yet</Typography>
                                                <Typography variant="caption">
                                                    {canManageSOP ? 'Click "Add SOP Document" to get started' : 'No documents available at the moment'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSOPs.map((doc, index) => (
                                        <TableRow
                                            key={doc.id}
                                            sx={{
                                                '&:hover': { bgcolor: '#f8fafc' },
                                                transition: 'background-color 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setViewPDF(doc)}
                                        >
                                            <TableCell sx={{ color: '#64748b', fontWeight: 500 }}>{index + 1}</TableCell>
                                            <TableCell sx={{ color: '#1e293b', fontWeight: 600 }}>
                                                {doc.title}
                                            </TableCell>
                                            <TableCell sx={{ color: '#64748b', textTransform: 'capitalize' }}>{doc.createdBy || 'Admin'}</TableCell>
                                            <TableCell sx={{ color: '#64748b' }}>{doc.date}</TableCell>
                                            <TableCell sx={{ color: '#64748b' }}>{doc.updatedAt || '-'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={<PdfIcon />}
                                                    label={doc.pdfName}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadPDF(doc.pdfUrl, doc.pdfName);
                                                    }}
                                                    sx={{
                                                        bgcolor: '#fef3c7',
                                                        color: '#92400e',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: '#fde68a' }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadPDF(doc.pdfUrl, doc.pdfName);
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Visibility Type Column - Admin/HR Only */}
                                            {canManageSOP && (
                                                <TableCell>
                                                    <Chip
                                                        label={
                                                            doc.visibilityType === 'ALL' ? 'All Users' :
                                                                doc.visibilityType === 'ROLE' ? `Roles: ${doc.allowedRoles?.join(', ')}` :
                                                                    `Users: ${doc.allowedUsers?.length || 0} selected`
                                                        }
                                                        size="small"
                                                        sx={{
                                                            bgcolor: doc.visibilityType === 'ALL' ? '#dcfce7' :
                                                                doc.visibilityType === 'ROLE' ? '#dbeafe' : '#fef3c7',
                                                            color: doc.visibilityType === 'ALL' ? '#166534' :
                                                                doc.visibilityType === 'ROLE' ? '#1e40af' : '#92400e',
                                                            fontWeight: 600
                                                        }}
                                                    />
                                                </TableCell>
                                            )}

                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    {/* View Button - Available for all users */}
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewPDF(doc);
                                                        }}
                                                        sx={{
                                                            bgcolor: '#dcfce7',
                                                            color: '#166534',
                                                            '&:hover': { bgcolor: '#bbf7d0' }
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>

                                                    {/* Edit and Delete - Admin/HR only */}
                                                    {canManageSOP && (
                                                        <>
                                                            <IconButton
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: '#dbeafe',
                                                                    color: '#1e40af',
                                                                    '&:hover': { bgcolor: '#bfdbfe' }
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenDialog(doc);
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: '#fee2e2',
                                                                    color: '#991b1b',
                                                                    '&:hover': { bgcolor: '#fecaca' }
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteConfirm(doc.id);
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Fade >

            {/* Mobile Card View */}
            < Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
                {
                    filteredSOPs.map((doc) => (
                        <Paper
                            key={doc.id}
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                bgcolor: 'white'
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight="600" sx={{ color: '#0f172a', fontSize: '1rem' }}>
                                        {doc.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        {doc.date}
                                    </Typography>
                                </Box>
                            </Box>

                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                <Chip
                                    icon={<PdfIcon />}
                                    label={doc.pdfName}
                                    onClick={() => handleDownloadPDF(doc.pdfUrl, doc.pdfName)}
                                    size="small"
                                    sx={{
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 600,
                                        maxWidth: '100%'
                                    }}
                                />
                            </Stack>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <IconButton
                                    size="small"
                                    onClick={() => setViewPDF(doc)}
                                    sx={{ bgcolor: '#dcfce7', color: '#166534', '&:hover': { bgcolor: '#bbf7d0' } }}
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>

                                {canManageSOP && (
                                    <Stack direction="row" spacing={1}>
                                        {(() => {
                                            const docRole = (doc.createdByRole || 'ADMIN').toUpperCase();
                                            const userRole = (currentUser?.role || '').toUpperCase();
                                            const isOwner = docRole === userRole;

                                            return isOwner ? (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(doc)}
                                                        sx={{ bgcolor: '#dbeafe', color: '#1e40af' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setDeleteConfirm(doc.id)}
                                                        sx={{ bgcolor: '#fee2e2', color: '#991b1b' }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            ) : null;
                                        })()}
                                    </Stack>
                                )}
                            </Box>
                        </Paper>
                    ))
                }
                {
                    filteredSOPs.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
                            <PdfIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                            <Typography>No documents found</Typography>
                        </Box>
                    )
                }
            </Box >

            {/* Add/Edit Dialog */}
            < Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Slide}
                TransitionProps={{ direction: "up" }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 3,
                    pb: 1,
                }}>
                    <Typography variant="h6" fontWeight="700" sx={{ color: '#1e293b' }}>
                        {editingDoc ? 'Edit SOP Document' : 'Add SOP Document'}
                    </Typography>
                    <IconButton
                        onClick={handleCloseDialog}
                        size="small"
                        sx={{ color: '#94a3b8' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent sx={{ p: 3, pt: 1 }}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            required
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value });
                                if (errors.title) setErrors({ ...errors, title: null });
                            }}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Type here"
                            error={!!errors.title}
                            helperText={errors.title}
                        />

                        <DatePicker
                            label="Create Date"
                            value={formData.date}
                            onChange={(newDate) => setFormData({ ...formData, date: newDate })}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    InputLabelProps: { shrink: true }
                                }
                            }}
                        />

                        <Box sx={{
                            border: '1px dashed',
                            borderColor: errors.pdf ? '#ef4444' : '#cbd5e1',
                            borderRadius: '8px',
                            p: 2,
                            textAlign: 'center',
                            bgcolor: errors.pdf ? '#fef2f2' : '#f8fafc',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: errors.pdf ? '#dc2626' : '#94a3b8',
                                bgcolor: errors.pdf ? '#fee2e2' : '#f1f5f9'
                            }
                        }}>
                            <input
                                type="file"
                                id="pdf-upload-input"
                                hidden
                                accept="application/pdf"
                                onChange={(e) => {
                                    handleFileChange(e);
                                    if (errors.pdf) setErrors({ ...errors, pdf: null });
                                }}
                            />
                            <label htmlFor="pdf-upload-input" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                                    <UploadIcon sx={{ color: errors.pdf ? '#ef4444' : '#64748b' }} />
                                    <Typography color={errors.pdf ? '#ef4444' : '#64748b'} fontWeight="500">
                                        {formData.pdfName ? formData.pdfName : 'Upload PDF File'}
                                    </Typography>
                                </Stack>
                            </label>
                        </Box>
                        {errors.pdf && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                                {errors.pdf}
                            </Typography>
                        )}

                        <FormControl fullWidth>
                            <InputLabel id="visibility-label">Visibility Type</InputLabel>
                            <Select
                                labelId="visibility-label"
                                label="Visibility Type"
                                value={formData.visibilityType}
                                onChange={(e) => setFormData({ ...formData, visibilityType: e.target.value, allowedRoles: [], allowedUsers: [] })}
                            >
                                <MenuItem value="ALL">All Users</MenuItem>
                                <MenuItem value="ROLE">Specific Roles</MenuItem>
                                <MenuItem value="USER">Specific Users</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Role Multi-Select */}
                        {formData.visibilityType === 'ROLE' && (
                            <Autocomplete
                                multiple
                                options={['Admin', 'Developer', 'Manager', 'HR', 'Employee']}
                                value={formData.allowedRoles}
                                onChange={(event, newValue) => {
                                    setFormData({ ...formData, allowedRoles: newValue });
                                    if (errors.roles) setErrors({ ...errors, roles: null });
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Roles"
                                        placeholder="Choose roles"
                                        error={!!errors.roles}
                                        helperText={errors.roles}
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option}
                                            {...getTagProps({ index })}
                                            size="small"
                                            sx={{ bgcolor: '#dbeafe', color: '#1e40af' }}
                                        />
                                    ))
                                }
                            />
                        )}

                        {/* User Multi-Select */}
                        {formData.visibilityType === 'USER' && (
                            <Autocomplete
                                multiple
                                options={users.filter(u => (u.role || '').toLowerCase() !== (currentUser?.role || '').toLowerCase())}
                                getOptionLabel={(option) => option.name}
                                value={users.filter(u => formData.allowedUsers.includes(u.id))}
                                onChange={(event, newValue) => {
                                    setFormData({ ...formData, allowedUsers: newValue.map(u => u.id) });
                                    if (errors.users) setErrors({ ...errors, users: null });
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Users"
                                        placeholder="Choose users"
                                        error={!!errors.users}
                                        helperText={errors.users}
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option.name}
                                            {...getTagProps({ index })}
                                            size="small"
                                            sx={{ bgcolor: '#dcfce7', color: '#166534' }}
                                        />
                                    ))
                                }
                            />
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{ color: '#64748b', fontWeight: 600, textTransform: 'capitalize' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        sx={{
                            bgcolor: '#0f172a',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 3,
                            '&:hover': { bgcolor: '#1e293b' }
                        }}
                    >
                        {editingDoc ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog >

            {/* Delete Confirmation Dialog */}
            < Dialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: '#991b1b', pb: 1 }}>
                    Delete SOP Document?
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete this document? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button
                        onClick={() => setDeleteConfirm(null)}
                        sx={{ color: '#64748b', fontWeight: 600, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleDelete(deleteConfirm)}
                        variant="contained"
                        sx={{
                            bgcolor: '#dc2626',
                            color: 'white',
                            fontWeight: 600,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#b91c1c' }
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog >

            {/* PDF Viewer Dialog */}
            < Dialog
                open={!!viewPDF}
                onClose={() => setViewPDF(null)}
                maxWidth="lg"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', height: '90vh', overflow: 'hidden' } }}
            >
                <DialogTitle sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <Typography fontWeight="700" color="#0f172a">SOP Document </Typography>
                    <IconButton onClick={() => setViewPDF(null)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Upper Section - PDF Preview (70%) */}
                    <Box sx={{ height: '70%', bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        {viewPDF && (
                            <iframe
                                src={viewPDF.pdfUrl}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title={viewPDF.title}
                            />
                        )}
                    </Box>

                    {/* Lower Section - Details (30%) */}
                    <Box sx={{ height: '30%', p: 3, bgcolor: 'white', overflowY: 'auto' }}>
                        <Stack spacing={3}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h5" fontWeight="700" color="#0f172a" gutterBottom>
                                        {viewPDF?.title}
                                    </Typography>
                                    <Stack direction="row" spacing={3} sx={{ color: '#64748b' }}>
                                        <Box>
                                            <Typography variant="caption" display="block" fontWeight="600">Create Date</Typography>
                                            <Typography variant="body2">{viewPDF?.date}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" display="block" fontWeight="600">Update Date</Typography>
                                            <Typography variant="body2">{viewPDF?.updatedAt || '-'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" display="block" fontWeight="600">Created By</Typography>
                                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                                {viewPDF?.createdBy || 'Admin'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<PdfIcon />}
                                    onClick={() => handleDownloadPDF(viewPDF?.pdfUrl, viewPDF?.pdfName)}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderColor: '#e2e8f0',
                                        color: '#0f172a',
                                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' }
                                    }}
                                >
                                    Download PDF
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </DialogContent>
            </Dialog >
            {/* Toast Notification */}
            < Snackbar
                open={showToast}
                autoHideDuration={3000}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                TransitionComponent={Slide}
            >
                <Alert onClose={handleCloseToast} severity="success" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {toastMessage}
                </Alert>
            </Snackbar >
        </Box >
    );
};

export default SOPDocument;
