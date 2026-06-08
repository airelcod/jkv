import { query, sendJSON, parseBody } from './config.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        const { email, password } = await parseBody(req);
        
        const users = await query("SELECT * FROM usuarios WHERE email = ?", [email]);
        
        if (users.length === 1) {
            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password);
            
            if (validPassword) {
                const token = jwt.sign(
                    { 
                        user_id: user.id, 
                        nombre: user.nombre, 
                        email: user.email, 
                        rol: user.rol 
                    },
                    process.env.JWT_SECRET || 'mi-secret-key-2024',
                    { expiresIn: '24h' }
                );
                
                sendJSON(res, {
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol
                    }
                });
            } else {
                sendJSON(res, { success: false, error: 'Contraseña incorrecta' });
            }
        } else {
            sendJSON(res, { success: false, error: 'Usuario no encontrado' });
        }
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
