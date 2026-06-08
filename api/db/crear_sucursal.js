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
        const { nombre, ubicacion } = data;
        
        const result = await query(
            "INSERT INTO sucursales (nombre, ubicacion) VALUES (?, ?)",
            [nombre, ubicacion || '']
        );
        
        sendJSON(res, { success: true, message: 'Sucursal creada', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
