import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Fade from '@mui/material/Fade';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

// Animated FocusTask Logo Component
const FocusTaskLogo = () => (
    <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        mb: 2,
        animation: 'fadeInDown 0.6s ease-out'
    }}>
        <Box sx={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
                transform: 'scale(1.05) rotate(-2deg)',
                boxShadow: '0 12px 32px rgba(59, 130, 246, 0.45)',
            }
        }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2" />
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </Box>
        <Typography variant="h5" fontWeight="800" sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
            fontSize: '1.75rem'
        }}>
            FocusTask
        </Typography>
    </Box>
);

// Floating shapes for background animation
const FloatingShapes = () => (
    <>
        <Box sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)',
            animation: 'float 8s ease-in-out infinite',
            '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                '50%': { transform: 'translateY(-20px) rotate(5deg)' },
            }
        }} />
        <Box sx={{
            position: 'absolute',
            bottom: '15%',
            right: '8%',
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(96, 165, 250, 0.08) 100%)',
            animation: 'float2 6s ease-in-out infinite',
            '@keyframes float2': {
                '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                '50%': { transform: 'translateY(-15px) rotate(-5deg)' },
            }
        }} />
        <Box sx={{
            position: 'absolute',
            top: '40%',
            right: '15%',
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
            animation: 'float3 10s ease-in-out infinite',
            '@keyframes float3': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-25px)' },
            }
        }} />
    </>
);

export default function SignIn() {
    const navigate = useNavigate();
    const { login, checkCredentials } = useUserStore();

    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [rememberMe, setRememberMe] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);
    const [focusedField, setFocusedField] = React.useState(null);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        setIsLoading(true);

        if (checkCredentials(email, password)) {
            setShowToast(true);
            setTimeout(() => {
                login(email, password);
                const role = useUserStore.getState().role;
                if (role === 'admin' || role === 'hr') {
                    navigate('/app/admin/dashboard');
                } else {
                    navigate('/app/dashboard');
                }
            }, 1200);
        } else {
            setIsLoading(false);
            setEmailError(true);
            setEmailErrorMessage('Invalid email or password');
            setPasswordError(true);
            setPasswordErrorMessage('Invalid email or password');
        }
    };

    const validateInputs = () => {
        let isValid = true;

        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setEmailError(true);
            setEmailErrorMessage('Please enter a valid email address.');
            isValid = false;
        } else {
            setEmailError(false);
            setEmailErrorMessage('');
        }

        if (!password || password.length < 1) {
            setPasswordError(true);
            setPasswordErrorMessage('Password is required.');
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        return isValid;
    };

    // Input field styles with micro-interactions
    const getInputStyles = (fieldName) => ({
        '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            bgcolor: focusedField === fieldName ? '#ffffff' : '#f8fafc',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: focusedField === fieldName ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
            '& fieldset': {
                borderColor: focusedField === fieldName ? '#3b82f6' : '#e2e8f0',
                borderWidth: focusedField === fieldName ? '2px' : '1px',
                transition: 'all 0.3s ease'
            },
            '&:hover fieldset': { borderColor: '#94a3b8' },
            '&.Mui-focused fieldset': {
                borderColor: '#3b82f6',
                borderWidth: '2px'
            },
        },
        '& .MuiInputBase-input': {
            py: 1.75,
            fontSize: '0.95rem',
            // Override browser autofill background color
            '&:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                WebkitTextFillColor: '#0f172a !important',
                caretColor: '#0f172a',
                borderRadius: '14px',
            },
            '&:-webkit-autofill:hover': {
                WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
            },
            '&:-webkit-autofill:focus': {
                WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
            },
        }
    });

    return (
        <>
            <CssBaseline />

            {/* Success Toast with Animation */}
            <Snackbar
                open={showToast}
                autoHideDuration={4000}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                TransitionComponent={Fade}
            >
                <Alert
                    severity="success"
                    sx={{
                        width: '100%',
                        borderRadius: '14px',
                        boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)',
                        fontWeight: 600
                    }}
                >
                     Login Successful! 
                </Alert>
            </Snackbar>

            {/* Full Page Container */}
            <Box sx={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(145deg, #eff6ff 0%, #f0f9ff 30%, #f8fafc 70%, #ffffff 100%)',
                position: 'relative',
                overflow: 'hidden',
                '@keyframes fadeInDown': {
                    'from': { opacity: 0, transform: 'translateY(-20px)' },
                    'to': { opacity: 1, transform: 'translateY(0)' }
                },
                '@keyframes fadeInUp': {
                    'from': { opacity: 0, transform: 'translateY(20px)' },
                    'to': { opacity: 1, transform: 'translateY(0)' }
                }
            }}>
                {/* Animated Background Shapes */}
                <FloatingShapes />

                {/* Gradient Accent */}
                <Box sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(241, 245, 249, 0.8) 100%)',
                    zIndex: 0
                }} />

                {/* Login Card */}
                <Paper
                    elevation={0}
                    sx={{
                        width: '100%',
                        maxWidth: 440,
                        mx: 2,
                        p: { xs: 3, sm: 4 },
                        borderRadius: '28px',
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                        position: 'relative',
                        zIndex: 1,
                        animation: 'fadeInUp 0.8s ease-out',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 35px 100px -25px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                        }
                    }}
                >
                    {/* Logo */}
                    <FocusTaskLogo />

                    {/* Welcome Text */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography
                            variant="h4"
                            fontWeight="800"
                            sx={{
                                color: '#0f172a',
                                mb: 1,
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Welcome back
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 400 }}>
                            Sign in to your account
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        {/* Email Field */}
                        <FormControl fullWidth sx={{ mb: 2.5 }}>
                            <FormLabel
                                htmlFor="email"
                                sx={{
                                    mb: 1,
                                    fontWeight: 600,
                                    color: focusedField === 'email' ? '#3b82f6' : '#334155',
                                    fontSize: '0.9rem',
                                    transition: 'color 0.3s ease'
                                }}
                            >
                                Email Address
                            </FormLabel>
                            <TextField
                                error={emailError}
                                helperText={emailErrorMessage}
                                id="email"
                                type="email"
                                name="email"
                                placeholder="example@itfuturz.com"
                                autoComplete="email"
                                required
                                fullWidth
                                variant="outlined"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <MailOutlineIcon sx={{
                                                color: focusedField === 'email' ? '#3b82f6' : '#94a3b8',
                                                transition: 'color 0.3s ease'
                                            }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={getInputStyles('email')}
                            />
                        </FormControl>

                        {/* Password Field */}
                        <FormControl fullWidth sx={{ mb: 2.5 }}>
                            <FormLabel
                                htmlFor="password"
                                sx={{
                                    mb: 1,
                                    fontWeight: 600,
                                    color: focusedField === 'password' ? '#3b82f6' : '#334155',
                                    fontSize: '0.9rem',
                                    transition: 'color 0.3s ease'
                                }}
                            >
                                Password
                            </FormLabel>
                            <TextField
                                error={passwordError}
                                helperText={passwordErrorMessage}
                                name="password"
                                placeholder="Enter your password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                required
                                fullWidth
                                variant="outlined"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon sx={{
                                                color: focusedField === 'password' ? '#3b82f6' : '#94a3b8',
                                                transition: 'color 0.3s ease'
                                            }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                                sx={{
                                                    color: '#94a3b8',
                                                    transition: 'color 0.3s ease, transform 0.2s ease',
                                                    '&:hover': {
                                                        color: '#3b82f6',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={getInputStyles('password')}
                            />
                        </FormControl>

                        {/* Remember Me */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    sx={{
                                        color: '#cbd5e1',
                                        transition: 'all 0.2s ease',
                                        '&.Mui-checked': {
                                            color: '#3b82f6',
                                        },
                                        '&:hover': {
                                            bgcolor: 'rgba(59, 130, 246, 0.08)'
                                        }
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                                    Remember Me
                                </Typography>
                            }
                            sx={{ mb: 2.5 }}
                        />

                        {/* Sign In Button */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            sx={{
                                py: 1.75,
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    boxShadow: '0 12px 32px rgba(37, 99, 235, 0.5)',
                                    transform: 'translateY(-2px)'
                                },
                                '&:active': {
                                    transform: 'translateY(0)',
                                },
                                '&.Mui-disabled': {
                                    background: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
                                }
                            }}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>

                    </Box>

                    {/* Footer */}
                    <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            Powered by{' '}
                            <Link
                                href="https://itfuturz.in/#/home"
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="none"
                                sx={{
                                    color: '#64748b',
                                    fontWeight: 700,
                                    transition: 'color 0.2s ease',
                                    '&:hover': { color: '#3b82f6' }
                                }}
                            >
                                ITFuturz
                            </Link>
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </>
    );
}
