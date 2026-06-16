import pkg from 'pg';
const { Pool } = pkg;
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const dbConfig = {
    host: process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543'),
    user: process.env.DB_USER || 'postgres.manhnummghvgumgrivzl',
    password: process.env.DB_PASSWORD || 'Negroyamarill1(',
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000  // Aumentado para evitar timeout
};

let pool = null;

async function getConnection() {
    if (!pool) {
        pool = new Pool(dbConfig);
        pool.on('error', (err) => {
            console.error('Pool error:', err);
        });
        // Test connection
        try {
            const client = await pool.connect();
            console.log('✅ Conectado a Supabase PostgreSQL');
            client.release();
        } catch (err) {
            console.error('❌ Error conectando a Supabase:', err.message);
        }
    }
    return pool;
}

async function query(sql, params = []) {
    const pool = await getConnection();
    try {
        // Convertir ? a $1, $2, ... para PostgreSQL
        let pgSql = sql;
        let paramIndex = 1;
        // Esta es una conversión básica. Para casos complejos, usa directamente $1, $2 en tu SQL
        const result = await pool.query(pgSql, params);
        return result.rows;
    } catch (error) {
        console.error('Database error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

async function queryMultiple(sql, params = []) {
    const pool = await getConnection();
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

async function transaction(callback) {
    const pool = await getConnection();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function columnExists(tableName, columnName) {
    const result = await query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    );
    return result.length > 0;
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
