import { Box, Typography } from '@mui/material';

export const FilaDato = ({ etiqueta, valor, colorValor = 'textPrimary' }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ width: '180px', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color={colorValor} sx={{ fontWeight: colorValor === 'primary' ? 'bold' : 'normal', color: colorValor === 'textPrimary' ? '#334155' : undefined }}>{valor || '---'}</Typography>
        </Box>
    </Box>
);

export const FilaEditable = ({ etiqueta, children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: '180px', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography>
        </Box>
        <Box sx={{ flexGrow: 1, maxWidth: '500px' }}>{children}</Box>
    </Box>
);