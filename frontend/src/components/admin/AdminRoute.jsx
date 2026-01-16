import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';

const AdminRoute = ({ children }) => {
    const { isAuthenticated, role } = useUserStore();

    if (!isAuthenticated) {
        // If not authenticated, redirect to the admin/hr login page
        return <Navigate to="/app/admin/login" replace />;
    }

    // If authenticated but the role is neither 'admin' nor 'hr',
    // redirect to the general user dashboard.
    if (role !== 'admin' && role !== 'hr') {
        // If logged in as user but trying to access admin, redirect to user dashboard
        // OR show "Access Denied". Redirecting is friendlier.
        return <Navigate to="/app/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
