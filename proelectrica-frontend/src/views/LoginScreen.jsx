import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export const LoginScreen = ({ setSession, supabase }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault(); setLoading(true); setErrorMsg('');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setErrorMsg('Credenciales inválidas. Por favor, verifica tu correo y contraseña.'); setLoading(false); }
        else { setSession(data.session); }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={3} sx={{ p: 5, maxWidth: '400px', width: '100%', borderRadius: '12px', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}><img src="/logo.png" alt="Proeléctrica" style={{ height: '60px' }} onError={(e) => { e.target.style.display = 'none'; }} /></Box>
                <Typography variant="h5" fontWeight="bold" color="#1e293b" gutterBottom>Acceso al Sistema</Typography>
                <Typography variant="body2" color="textSecondary" mb={4}>Ingresa tus credenciales corporativas</Typography>
                {errorMsg && (<Box sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', p: 1.5, borderRadius: '6px', mb: 3 }}><Typography variant="body2" color="#e11d48">{errorMsg}</Typography></Box>)}
                <form onSubmit={handleLogin}>
                    <TextField fullWidth label="Correo Electrónico" variant="outlined" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
                    <TextField fullWidth label="Contraseña" variant="outlined" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" sx={{ mb: 3 }} />
                    <Button fullWidth type="submit" variant="contained" color="primary" size="large" disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />} sx={{ borderRadius: '8px', py: 1.2, fontWeight: 'bold', textTransform: 'none' }}>
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};