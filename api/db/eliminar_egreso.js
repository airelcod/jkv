import { query, sendJSON, parseBody } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'POST') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    try {
        const data = await parseBody(req);
        const { action, nombre } = data;
        
        if (action === 'eliminar_sucursal') {
            await query("DELETE FROM sucursales WHERE nombre = ?", [nombre]);
        } else if (action === 'eliminar_producto') {
            await query("DELETE FROM productos WHERE nombre = ?", [nombre]);
        } else {
            sendJSON(res, { success: false, error: 'Acción no válida' });
            return;
        }
        
        sendJSON(res, { success: true, message: 'Eliminado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
