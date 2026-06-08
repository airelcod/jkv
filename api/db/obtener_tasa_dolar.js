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
    
    async function obtenerTasaDolar() {
        try {
            const url = 'https://ve.dolarapi.com/v1/dolares';
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0].promedio) {
                    return {
                        success: true,
                        tasa: parseFloat(data[0].promedio),
                        fuente: 'dolarapi.com',
                        fecha: new Date().toISOString()
                    };
                }
            }
        } catch (error) {
            console.error('Error fetching dolar rate:', error);
        }
        
        return {
            success: true,
            tasa: 400.00,
            fuente: 'manual (fallback)',
            fecha: new Date().toISOString()
        };
    }
    
    const resultado = await obtenerTasaDolar();
    sendJSON(res, resultado);
}
