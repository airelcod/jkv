import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const dbConfig = {
    host: process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
    user: process.env.DB_USER || 'postgres.manhnummghvgumgrivzl',
    password: process.env.DB_PASSWORD || 'Negroyamarill1(',
    database: process.env.DB_NAME || 'postgres',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;

export async function getConnection() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return pool;
}

export async function query(sql, params = []) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

export async function queryMultiple(sql, params = []) {
    const connection = await getConnection();
    try {
        const [rows] = await connection.query(sql, params);
        return rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

export async function transaction(callback) {
    const connection = await getConnection();
    const conn = await connection.getConnection();
    await conn.beginTransaction();
    try {
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi-secret-key-2024');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Token inválido' });
    }
}

export function requireAdmin(req, res, next) {
    if (req.user?.rol !== 'admin') {
        return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    next();
}

export function sendJSON(res, data, status = 200) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(status).json(data);
}

export async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}
