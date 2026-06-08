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
            SELECT id, nombre, es_leche, activo FROM productos ORDER BY nombre
        `);
        
        const productosConActivo = productos.map(p => ({
            ...p,
            activo: p.activo !== undefined ? p.activo : 1
        }));
        
        sendJSON(res, { success: true, productos: productosConActivo });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
