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
        const { nombre } = data;
        
        await query("UPDATE productos SET activo = 0 WHERE nombre = ?", [nombre]);
        
        sendJSON(res, { success: true, message: 'Producto desactivado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
