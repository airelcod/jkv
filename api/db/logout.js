import { sendJSON } from './config.js';

export default async function handler(req, res) {
    // No hay sesiones que cerrar en JWT, solo informar éxito
    sendJSON(res, { success: true, message: 'Sesión cerrada' });
}
