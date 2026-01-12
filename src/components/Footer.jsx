import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box component="footer" sx={{ py: 2, textAlign: { xs: 'center', md: 'right' }, px: 3 }}>
      <Typography variant="body2" color="text.secondary">
        Copyright © 2025 ITFuturz. All rights reserved.
      </Typography>
    </Box>

  );
};

export default Footer;
