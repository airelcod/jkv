import { query, sendJSON, requireAuth, requireAdmin } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'GET') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const usuarios = await query("SELECT id, nombre, email, rol FROM usuarios ORDER BY id");
                sendJSON(res, { success: true, usuarios });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}
