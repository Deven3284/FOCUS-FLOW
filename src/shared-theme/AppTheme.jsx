
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export default function AppTheme({ children, mode = 'light', ...props }) {
    const theme = React.useMemo(() => {
        return createTheme({
            palette: {
                mode,
            }
        });
    }, [mode]);

    return (
        <ThemeProvider theme={theme} {...props}>
            {children}
        </ThemeProvider>
    );
}
