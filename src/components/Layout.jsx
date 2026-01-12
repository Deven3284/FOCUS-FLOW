import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import SubNav from './SubNav';
// import Sidebar from './Sidebar'; // Sidebar is not in the design requirement for now, using Header/SubNav
import { Box } from '@mui/material';

import Footer from './Footer';

const Layout = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f3f4f6' }}>
            <Header />
            <SubNav />
            <Box component="main" sx={{ flexGrow: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </Box>
            <Footer />
        </Box>
    );
};

export default Layout;
