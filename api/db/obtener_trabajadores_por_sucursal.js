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
        const sucursal_id = parseInt(req.query.sucursal_id || '0');
        let trabajadores;
        
        if (sucursal_id > 0) {
            trabajadores = await query(`
                SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 AND sucursal_id = ? ORDER BY nombre
            `, [sucursal_id]);
        } else {
            trabajadores = await query(`
                SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 ORDER BY nombre
            `);
        }
        
        sendJSON(res, { success: true, trabajadores });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
