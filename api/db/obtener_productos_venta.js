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
            SELECT id, nombre, es_leche, precio_venta FROM productos WHERE activo = 1 ORDER BY nombre
        `);
        
        const productosConPrecio = productos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            es_leche: p.es_leche,
            precio: parseFloat(p.precio_venta || 0)
        }));
        
        sendJSON(res, { success: true, productos: productosConPrecio });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
