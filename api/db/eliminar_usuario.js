import { query, sendJSON, parseBody, requireAuth, requireAdmin } from './config.js';

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
                const id = parseInt(data.id);
                
                if (id === req.user.user_id) {
                    sendJSON(res, { success: false, error: 'No puedes eliminar tu propio usuario' });
                    return;
                }
                
                await query("DELETE FROM usuarios WHERE id = ?", [id]);
                sendJSON(res, { success: true, message: 'Usuario eliminado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}
