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
        const { nombre, es_leche } = data;
        
        const esLecheVal = (es_leche === true || es_leche === 1 || es_leche === 'true') ? 1 : 0;
        
        const result = await query(
            "INSERT INTO productos (nombre, es_leche) VALUES (?, ?)",
            [nombre, esLecheVal]
        );
        
        sendJSON(res, { success: true, message: 'Producto creado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
