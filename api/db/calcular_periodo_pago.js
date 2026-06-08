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
        
        const trabajadores = await query(
            "SELECT dia_corte, ultimo_pago_fecha FROM trabajadores WHERE id = ?",
            [trabajador_id]
        );
        
        if (trabajadores.length === 0) {
            sendJSON(res, { success: false, error: 'Trabajador no encontrado' });
            return;
        }
        
        let diaCorte = trabajadores[0].dia_corte || 4;
        let ultimoPago = trabajadores[0].ultimo_pago_fecha;
        
        const diasMap = {
            1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
            5: 'Friday', 6: 'Saturday', 7: 'Sunday'
        };
        
        let inicio;
        if (!ultimoPago || ultimoPago === '0000-00-00') {
            const hoy = new Date();
            const nombreDiaCorte = diasMap[diaCorte];
            
            let primerCorte = new Date(hoy);
            while (primerCorte.toLocaleDateString('en-US', { weekday: 'long' }) !== nombreDiaCorte) {
                primerCorte.setDate(primerCorte.getDate() - 1);
            }
            
            if (primerCorte.toISOString().split('T')[0] === hoy.toISOString().split('T')[0]) {
                inicio = new Date(hoy);
            } else {
                inicio = new Date(primerCorte);
                inicio.setDate(inicio.getDate() + 1);
            }
        } else {
            inicio = new Date(ultimoPago);
            inicio.setDate(inicio.getDate() + 1);
        }
        
        const nombreDiaCorte = diasMap[diaCorte];
        const fin = new Date(inicio);
        while (fin.toLocaleDateString('en-US', { weekday: 'long' }) !== nombreDiaCorte) {
            fin.setDate(fin.getDate() + 1);
        }
        
        sendJSON(res, {
            success: true,
            inicio: inicio.toISOString().split('T')[0],
            fin: fin.toISOString().split('T')[0],
            dia_corte: diaCorte,
            dia_corte_nombre: diasMap[diaCorte]
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
