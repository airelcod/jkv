import { sendJSON } from './config.js';

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
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        let diaCorte = parseInt(req.query.dia_corte || '2');
        
        if (diaCorte < 1 || diaCorte > 7) {
            diaCorte = 2;
        }
        
        const fechaObj = new Date(fecha);
        fechaObj.setHours(12, 0, 0, 0);
        
        // Mapeo de días: 1(Domingo)->7, 2(Lunes)->1, etc.
        const mapaDias = [0, 7, 1, 2, 3, 4, 5, 6];
        const diaCortePHP = mapaDias[diaCorte];
        
        let finPeriodo = new Date(fechaObj);
        let diaSemanaActual = finPeriodo.getDay() === 0 ? 7 : finPeriodo.getDay();
        
        while (diaSemanaActual !== diaCortePHP) {
            finPeriodo.setDate(finPeriodo.getDate() - 1);
            diaSemanaActual = finPeriodo.getDay() === 0 ? 7 : finPeriodo.getDay();
        }
        
        const inicioPeriodo = new Date(finPeriodo);
        inicioPeriodo.setDate(finPeriodo.getDate() - 6);
        
        sendJSON(res, {
            success: true,
            inicio: inicioPeriodo.toISOString().split('T')[0],
            fin: finPeriodo.toISOString().split('T')[0],
            dia_corte: diaCorte,
            fecha_actual: fecha
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
