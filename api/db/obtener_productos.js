import { query, sendJSON } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'GET') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    try {
        const productos = await query(`
            SELECT id, nombre, es_leche FROM productos WHERE activo = 1 ORDER BY nombre
        `);
        
        sendJSON(res, { success: true, productos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
