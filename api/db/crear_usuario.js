import { query, sendJSON, parseBody, requireAuth, requireAdmin } from './config.js';
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
    
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const data = await parseBody(req);
                const { nombre, email, password, rol } = data;
                
                const hashedPassword = await bcrypt.hash(password, 10);
                
                await query(
                    "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
                    [nombre, email, hashedPassword, rol]
                );
                
                sendJSON(res, { success: true, message: 'Usuario creado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}
