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
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        const inicio = req.query.inicio;
        const fin = req.query.fin;
        
        if (!trabajador_id || !inicio || !fin) {
            sendJSON(res, { success: false, error: 'Parámetros incompletos' });
            return;
        }
        
        const produccion = await query(`
            SELECT p.fecha, p.tipo_producto, 
                   SUM(p.peso_kg) as peso_kg, 
                   SUM(p.piezas) as piezas,
                   pr.es_leche
            FROM produccion_diaria p
            JOIN productos pr ON p.tipo_producto = pr.nombre
            WHERE p.trabajador_id = ? 
              AND p.fecha BETWEEN ? AND ?
            GROUP BY p.fecha, p.tipo_producto
            ORDER BY p.fecha, p.tipo_producto
        `, [trabajador_id, inicio, fin]);
        
        sendJSON(res, { success: true, produccion });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
