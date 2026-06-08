import { query, sendJSON, requireAuth } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'GET') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    requireAuth(req, res, async () => {
        try {
            const user_id = req.user.user_id;
            
            const usuarios = await query(`
                SELECT id, nombre, email, rol FROM usuarios WHERE id = ?
            `, [user_id]);
            
            if (usuarios.length > 0) {
                sendJSON(res, { success: true, user: usuarios[0] });
            } else {
                sendJSON(res, { success: false, error: 'Usuario no encontrado' });
            }
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}
