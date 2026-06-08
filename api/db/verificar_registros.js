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
        const { tipo, nombre } = req.query;
        let querySQL;
        
        if (tipo === 'sucursal') {
            querySQL = "SELECT COUNT(*) as total FROM produccion_diaria WHERE sucursal = ?";
        } else if (tipo === 'producto') {
            querySQL = "SELECT COUNT(*) as total FROM produccion_diaria WHERE tipo_producto = ?";
        } else {
            sendJSON(res, { success: false, error: 'Tipo no válido' });
            return;
        }
        
        const result = await query(querySQL, [nombre]);
        
        sendJSON(res, { success: true, total: result[0].total });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
