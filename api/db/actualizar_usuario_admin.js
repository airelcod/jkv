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
                const { id, nombre, email, rol, password } = data;
                
                if (password && password.trim() !== '') {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await query(
                        "UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id = ?",
                        [nombre, email, rol, hashedPassword, id]
                    );
                } else {
                    await query(
                        "UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?",
                        [nombre, email, rol, id]
                    );
                }
                
                sendJSON(res, { success: true, message: 'Usuario actualizado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}
