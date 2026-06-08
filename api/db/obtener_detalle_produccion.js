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
        const { fecha, producto, sucursal_id } = req.query;
        
        let sql, params;
        
        if (sucursal_id && sucursal_id > 0) {
            sql = `
                SELECT t.nombre as trabajador, 
                       s.nombre as sucursal,
                       p.peso_kg as cantidad_peso,
                       p.piezas as cantidad_piezas,
                       pr.es_leche,
                       pr.nombre as producto_nombre
                FROM produccion_diaria p
                JOIN trabajadores t ON p.trabajador_id = t.id
                JOIN sucursales s ON t.sucursal_id = s.id
                JOIN productos pr ON p.tipo_producto = pr.nombre
                WHERE p.fecha = ? 
                  AND p.tipo_producto = ?
                  AND t.sucursal_id = ?
                ORDER BY t.nombre
            `;
            params = [fecha, producto, sucursal_id];
        } else {
            sql = `
                SELECT t.nombre as trabajador, 
                       s.nombre as sucursal,
                       p.peso_kg as cantidad_peso,
                       p.piezas as cantidad_piezas,
                       pr.es_leche,
                       pr.nombre as producto_nombre
                FROM produccion_diaria p
                JOIN trabajadores t ON p.trabajador_id = t.id
                JOIN sucursales s ON t.sucursal_id = s.id
                JOIN productos pr ON p.tipo_producto = pr.nombre
                WHERE p.fecha = ? AND p.tipo_producto = ?
                ORDER BY s.nombre, t.nombre
            `;
            params = [fecha, producto];
        }
        
        const detalle = await query(sql, params);
        
        sendJSON(res, { success: true, detalle });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
