import { query, sendJSON, parseBody, requireAuth } from './config.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'POST') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    requireAuth(req, res, async () => {
        try {
            const data = await parseBody(req);
            const user_id = req.user.user_id;
            const { nombre, email, password } = data;
            
            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                await query(
                    "UPDATE usuarios SET nombre = ?, email = ?, password = ? WHERE id = ?",
                    [nombre, email, hashedPassword, user_id]
                );
            } else {
                await query(
                    "UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?",
                    [nombre, email, user_id]
                );
            }
            
            sendJSON(res, { success: true, message: 'Perfil actualizado' });
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}
