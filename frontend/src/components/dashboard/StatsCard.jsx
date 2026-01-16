import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const StatsCard = ({ title, count, subtitle, icon, color, bgColor }) => {
    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 3 }, // Reduced padding on mobile
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on mobile
                alignItems: 'center',
                justifyContent: { xs: 'center', sm: 'flex-start' },
                gap: { xs: 1.5, sm: 2.5 },
                borderRadius: 4,
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                width: '100%',
                height: '100%', // Ensure full height fit
                aspectRatio: { xs: '1/1', sm: 'auto' }, // Square on mobile
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)'
                }
            }}
        >
            <Box
                sx={{
                    width: { xs: 48, sm: 60 }, // Smaller icon on mobile
                    height: { xs: 48, sm: 60 },
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: '1.5rem', sm: '1.75rem' },
                    color: color,
                    backgroundColor: bgColor,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ lineHeight: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {count}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mt: 0.5 }}>
                    {subtitle || title}
                </Typography>
            </Box>
        </Paper>
    );
};

export default StatsCard;
