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
        const proveedor_id = parseInt(req.query.proveedor_id || '0');
        const inicio = req.query.inicio;
        const fin = req.query.fin;
        
        if (!proveedor_id || !inicio || !fin) {
            sendJSON(res, { success: false, error: 'Faltan parámetros' });
            return;
        }
        
        const resumen = await query(`
            SELECT 
                COALESCE(SUM(cantidad_litros), 0) as total_leche,
                COALESCE(SUM(total_costo), 0) as total_costo
            FROM materia_prima 
            WHERE proveedor_id = ? 
                AND fecha BETWEEN ? AND ?
                AND pagado = 0
        `, [proveedor_id, inicio, fin]);
        
        sendJSON(res, {
            success: true,
            total_leche: parseFloat(resumen[0].total_leche),
            total_costo: parseFloat(resumen[0].total_costo)
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
