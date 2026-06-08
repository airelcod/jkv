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
        const { fecha, tipo_producto, peso_kg, piezas } = data;
        
        // Validar fecha futura
        if (new Date(fecha) > new Date()) {
            sendJSON(res, { success: false, error: 'No se pueden agregar fechas futuras' });
            return;
        }
        
        await query(
            `INSERT INTO produccion_diaria (fecha, tipo_producto, peso_kg, piezas) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             peso_kg = VALUES(peso_kg), 
             piezas = VALUES(piezas)`,
            [fecha, tipo_producto, peso_kg || null, piezas || null]
        );
        
        sendJSON(res, { success: true, message: 'Registro guardado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
