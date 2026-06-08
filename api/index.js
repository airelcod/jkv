import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ========== CONFIGURACIÓN DE BASE DE DATOS ==========
const dbConfig = {
    host: process.env.DB_HOST || 'sql3.freesqldatabase.com',
    user: process.env.DB_USER || 'sql3829733',
    password: process.env.DB_PASSWORD || '7lYY4HAu23',
    database: process.env.DB_NAME || 'sql3829733',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;

async function getConnection() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return pool;
}

async function query(sql, params = []) {
    const conn = await getConnection();
    try {
        const [rows] = await conn.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

async function queryMultiple(sql, params = []) {
    const conn = await getConnection();
    try {
        const [rows] = await conn.query(sql, params);
        return rows;
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

async function transaction(callback) {
    const conn = await getConnection();
    const connection = await conn.getConnection();
    await connection.beginTransaction();
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function sendJSON(res, data, status = 200) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(status).json(data);
}

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return sendJSON(res, { success: false, error: 'No autenticado' }, 401);
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi-secret-key-2024');
        req.user = decoded;
        next();
    } catch (error) {
        return sendJSON(res, { success: false, error: 'Token inválido' }, 401);
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.rol !== 'admin') {
        return sendJSON(res, { success: false, error: 'No autorizado' }, 403);
    }
    next();
}

async function parseBody(req) {
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

function formatearFecha(fecha) {
    if (!fecha) return '';
    const partes = fecha.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearNombre(texto) {
    if (!texto) return '';
    return texto.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ========== MANEJADOR PRINCIPAL ==========
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    let endpoint = url.pathname.replace('/api/', '').replace('.js', '').split('/')[0];
    
    if (!endpoint || endpoint === 'db') {
        endpoint = url.searchParams.get('endpoint') || '';
    }
    
    console.log(`📡 Endpoint: ${endpoint}, Method: ${req.method}`);
    
    const handlers = {
        'login': () => handleLogin(req, res),
        'logout': () => handleLogout(req, res),
        'obtener_usuario': () => handleObtenerUsuario(req, res),
        'actualizar_usuario': () => handleActualizarUsuario(req, res),
        'lista_usuarios': () => handleListaUsuarios(req, res),
        'crear_usuario': () => handleCrearUsuario(req, res),
        'actualizar_usuario_admin': () => handleActualizarUsuarioAdmin(req, res),
        'eliminar_usuario': () => handleEliminarUsuario(req, res),
        'clientes': () => handleClientes(req, res),
        'cuentas': () => handleCuentas(req, res),
        'egresos': () => handleEgresos(req, res),
        'materia_prima': () => handleMateriaPrima(req, res),
        'proveedores_pagos': () => handleProveedoresPagos(req, res),
        'nomina': () => handleNomina(req, res),
        'trabajadores': () => handleTrabajadores(req, res),
        'produccion_sucursal': () => handleProduccionSucursal(req, res),
        'guardar_produccion': () => handleGuardarProduccion(req, res),
        'obtener_detalle_produccion': () => handleObtenerDetalleProduccion(req, res),
        'obtener_produccion_por_periodo': () => handleObtenerProduccionPorPeriodo(req, res),
        'ventas': () => handleVentas(req, res),
        'obtener_productos': () => handleObtenerProductos(req, res),
        'obtener_productos_mp': () => handleObtenerProductosMP(req, res),
        'obtener_productos_venta': () => handleObtenerProductosVenta(req, res),
        'crear_producto': () => handleCrearProducto(req, res),
        'eliminar_producto': () => handleEliminarProducto(req, res),
        'obtener_sucursales': () => handleObtenerSucursales(req, res),
        'crear_sucursal': () => handleCrearSucursal(req, res),
        'eliminar_elemento': () => handleEliminarElemento(req, res),
        'obtener_trabajadores_select': () => handleObtenerTrabajadoresSelect(req, res),
        'obtener_trabajadores_por_sucursal': () => handleObtenerTrabajadoresPorSucursal(req, res),
        'calcular_periodo_por_corte': () => handleCalcularPeriodoPorCorte(req, res),
        'calcular_periodo_pago': () => handleCalcularPeriodoPago(req, res),
        'estadisticas': () => handleEstadisticas(req, res),
        'obtener_detalle_pago': () => handleObtenerDetallePago(req, res),
        'verificar_registros': () => handleVerificarRegistros(req, res),
        'exportar_registros': () => handleExportarRegistros(req, res),
        'obtener_tasa_dolar': () => handleObtenerTasaDolar(req, res),
        'obtener_resumen_semanal_proveedor': () => handleObtenerResumenSemanalProveedor(req, res),
    };
    
    if (handlers[endpoint]) {
        await handlers[endpoint]();
    } else {
        sendJSON(res, { success: false, error: `Endpoint no encontrado: ${endpoint}` }, 404);
    }
}

// ========== AUTENTICACIÓN ==========
async function handleLogin(req, res) {
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
                    { user_id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
                    process.env.JWT_SECRET || 'mi-secret-key-2024',
                    { expiresIn: '24h' }
                );
                sendJSON(res, { success: true, token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
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

async function handleLogout(req, res) {
    sendJSON(res, { success: true, message: 'Sesión cerrada' });
}

async function handleObtenerUsuario(req, res) {
    requireAuth(req, res, async () => {
        try {
            const users = await query("SELECT id, nombre, email, rol FROM usuarios WHERE id = ?", [req.user.user_id]);
            if (users.length > 0) {
                sendJSON(res, { success: true, user: users[0] });
            } else {
                sendJSON(res, { success: false, error: 'Usuario no encontrado' });
            }
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

async function handleActualizarUsuario(req, res) {
    if (req.method !== 'POST') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    requireAuth(req, res, async () => {
        try {
            const data = await parseBody(req);
            const user_id = req.user.user_id;
            const { nombre, email, password } = data;
            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                await query("UPDATE usuarios SET nombre = ?, email = ?, password = ? WHERE id = ?", [nombre, email, hashedPassword, user_id]);
            } else {
                await query("UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?", [nombre, email, user_id]);
            }
            sendJSON(res, { success: true, message: 'Perfil actualizado' });
        } catch (error) {
            sendJSON(res, { success: false, error: error.message }, 500);
        }
    });
}

// ========== USUARIOS (ADMIN) ==========
async function handleListaUsuarios(req, res) {
    if (req.method !== 'GET') return sendJSON(res, { success: false, error: 'Método no permitido' });
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const usuarios = await query("SELECT id, nombre, email, rol FROM usuarios ORDER BY id");
                sendJSON(res, { success: true, usuarios });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}

async function handleCrearUsuario(req, res) {
    if (req.method !== 'POST') return sendJSON(res, { success: false, error: 'Método no permitido' });
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const data = await parseBody(req);
                const { nombre, email, password, rol } = data;
                const hashedPassword = await bcrypt.hash(password, 10);
                await query("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)", [nombre, email, hashedPassword, rol]);
                sendJSON(res, { success: true, message: 'Usuario creado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}

async function handleActualizarUsuarioAdmin(req, res) {
    if (req.method !== 'POST') return sendJSON(res, { success: false, error: 'Método no permitido' });
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const data = await parseBody(req);
                const { id, nombre, email, rol, password } = data;
                if (password && password.trim() !== '') {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await query("UPDATE usuarios SET nombre = ?, email = ?, rol = ?, password = ? WHERE id = ?", [nombre, email, rol, hashedPassword, id]);
                } else {
                    await query("UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id = ?", [nombre, email, rol, id]);
                }
                sendJSON(res, { success: true, message: 'Usuario actualizado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}

async function handleEliminarUsuario(req, res) {
    if (req.method !== 'POST') return sendJSON(res, { success: false, error: 'Método no permitido' });
    requireAuth(req, res, () => {
        requireAdmin(req, res, async () => {
            try {
                const data = await parseBody(req);
                const id = parseInt(data.id);
                if (id === req.user.user_id) {
                    sendJSON(res, { success: false, error: 'No puedes eliminar tu propio usuario' });
                    return;
                }
                await query("DELETE FROM usuarios WHERE id = ?", [id]);
                sendJSON(res, { success: true, message: 'Usuario eliminado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
        });
    });
}

// ========== CLIENTES ==========
async function handleClientes(req, res) {
    const method = req.method;
    const { action, id } = req.query;
    if (method === 'GET') {
        if (action === 'obtener_todos') {
            try {
                const columns = await query("SHOW COLUMNS FROM clientes LIKE 'activo'");
                const hasActivo = columns.length > 0;
                const sql = hasActivo ? "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes WHERE activo = 1 ORDER BY nombre ASC" : "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes ORDER BY nombre ASC";
                const clientes = await query(sql);
                sendJSON(res, { success: true, clientes });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        if (action === 'obtener_uno' && id) {
            try {
                const columns = await query("SHOW COLUMNS FROM clientes LIKE 'activo'");
                const hasActivo = columns.length > 0;
                const sql = hasActivo ? "SELECT * FROM clientes WHERE id = ? AND activo = 1" : "SELECT * FROM clientes WHERE id = ?";
                const clientes = await query(sql, [id]);
                if (clientes.length > 0) sendJSON(res, { success: true, cliente: clientes[0] });
                else sendJSON(res, { success: false, error: 'Cliente no encontrado' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción GET no válida' });
        return;
    }
    if (method === 'POST') {
        const data = await parseBody(req);
        const { action } = data;
        if (action === 'guardar') {
            try {
                const { nombre, rif, telefono, contacto, email, direccion } = data;
                if (!nombre) { sendJSON(res, { success: false, error: 'El nombre del cliente es requerido' }); return; }
                const columns = await query("SHOW COLUMNS FROM clientes LIKE 'activo'");
                const hasActivo = columns.length > 0;
                let sql, params;
                if (hasActivo) {
                    sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion, activo) VALUES (?, ?, ?, ?, ?, ?, 1)";
                    params = [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || ''];
                } else {
                    sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion) VALUES (?, ?, ?, ?, ?, ?)";
                    params = [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || ''];
                }
                const result = await query(sql, params);
                sendJSON(res, { success: true, id: result.insertId, message: 'Cliente creado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        if (action === 'actualizar') {
            try {
                const { id, nombre, rif, telefono, contacto, email, direccion } = data;
                if (!id || id <= 0) { sendJSON(res, { success: false, error: 'ID de cliente inválido' }); return; }
                if (!nombre) { sendJSON(res, { success: false, error: 'El nombre del cliente es requerido' }); return; }
                await query("UPDATE clientes SET nombre = ?, rif = ?, telefono = ?, contacto = ?, email = ?, direccion = ? WHERE id = ?", [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || '', id]);
                sendJSON(res, { success: true, message: 'Cliente actualizado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        if (action === 'eliminar') {
            try {
                const { id } = data;
                if (!id || id <= 0) { sendJSON(res, { success: false, error: 'ID de cliente inválido' }); return; }
                const columns = await query("SHOW COLUMNS FROM clientes LIKE 'activo'");
                const hasActivo = columns.length > 0;
                if (hasActivo) {
                    await query("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);
                } else {
                    const ventas = await query("SELECT COUNT(*) as total FROM ventas WHERE cliente_id = ?", [id]);
                    if (ventas[0].total > 0) { sendJSON(res, { success: false, error: 'No se puede eliminar el cliente porque tiene ventas asociadas' }); return; }
                    await query("DELETE FROM clientes WHERE id = ?", [id]);
                }
                sendJSON(res, { success: true, message: 'Cliente eliminado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción POST no válida' });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== CUENTAS ==========
async function handleCuentas(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener_pagar') {
            try {
                const datos = await query(`SELECT cp.*, cp.monto as monto_original, COALESCE(cp.monto_pagado, 0) as monto_pagado, (cp.monto - COALESCE(cp.monto_pagado, 0)) as monto_pendiente, CASE WHEN cp.descripcion LIKE '% litros%' THEN 'proveedor' ELSE 'normal' END as tipo_cuenta FROM cuentas_pagar cp WHERE cp.oculto = 0 OR cp.oculto IS NULL ORDER BY cp.fecha_inicio DESC, cp.id DESC`);
                sendJSON(res, { success: true, datos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_cobrar') {
            try {
                const datos = await query(`SELECT *, (monto - COALESCE(monto_cobrado, 0)) as monto_pendiente, COALESCE(monto_cobrado, 0) as monto_pagado FROM cuentas_cobrar ORDER BY id DESC`);
                sendJSON(res, { success: true, datos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_deudas_cliente') {
            try {
                const cliente_id = parseInt(req.query.cliente_id || '0');
                if (cliente_id <= 0) { sendJSON(res, { success: false, error: 'ID de cliente inválido' }); return; }
                const deudas = await query(`SELECT cc.*, v.fecha as fecha_venta FROM cuentas_cobrar cc JOIN ventas v ON cc.venta_id = v.id WHERE v.cliente_id = ? AND cc.estado = 'pendiente' ORDER BY cc.fecha_vencimiento ASC`, [cliente_id]);
                sendJSON(res, { success: true, deudas: deudas.map(d => ({ ...d, monto_pendiente: d.monto - (d.monto_cobrado || 0) })) });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_historial_pagos') {
            try {
                const id = parseInt(req.query.id || '0');
                const tipo = req.query.tipo || '';
                const pagos = await query("SELECT * FROM pagos_cuentas WHERE cuenta_id = ? AND tipo_cuenta = ? ORDER BY fecha DESC", [id, tipo]);
                sendJSON(res, { success: true, pagos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_detalle_cobrar') {
            try {
                const id = parseInt(req.query.id || '0');
                if (id <= 0) { sendJSON(res, { success: false, error: 'ID inválido' }); return; }
                const cuentas = await query(`SELECT c.*, c.monto as monto_original, COALESCE(c.monto_cobrado, 0) as monto_cobrado, (c.monto - COALESCE(c.monto_cobrado, 0)) as monto_pendiente FROM cuentas_cobrar c WHERE c.id = ?`, [id]);
                if (cuentas.length === 0) { sendJSON(res, { success: false, error: 'Cuenta no encontrada' }); return; }
                let cuenta = cuentas[0];
                cuenta.cliente_nombre = '';
                if (cuenta.venta_id && cuenta.venta_id > 0) {
                    const venta = await query(`SELECT c.nombre as cliente_nombre, c.rif, c.telefono, c.direccion, c.email, c.contacto FROM ventas v JOIN clientes c ON v.cliente_id = c.id WHERE v.id = ?`, [cuenta.venta_id]);
                    if (venta.length > 0) {
                        cuenta.cliente_nombre = venta[0].cliente_nombre || '';
                        cuenta.rif = venta[0].rif || '';
                        cuenta.telefono = venta[0].telefono || '';
                        cuenta.direccion = venta[0].direccion || '';
                        cuenta.contacto = venta[0].contacto || '';
                        cuenta.email = venta[0].email || '';
                    }
                }
                if (!cuenta.cliente_nombre) {
                    const match = cuenta.descripcion.match(/Cliente:\s*(.+?)(?:\s*\-|\s*$|$)/);
                    cuenta.cliente_nombre = match ? match[1].trim() : 'Cliente no especificado';
                }
                sendJSON(res, { success: true, cuenta });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar_pagar') {
            try {
                const { descripcion, monto, fecha_inicio, fecha_vencimiento } = data;
                await query(`INSERT INTO cuentas_pagar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado, oculto) VALUES (?, ?, ?, ?, ?, 'pendiente', 0)`, [descripcion, monto, monto, fecha_inicio, fecha_vencimiento]);
                sendJSON(res, { success: true, message: 'Cuenta guardada' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'guardar_cobrar') {
            try {
                const { descripcion, monto, fecha_inicio, fecha_vencimiento } = data;
                await query(`INSERT INTO cuentas_cobrar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado) VALUES (?, ?, ?, ?, ?, 'pendiente')`, [descripcion, monto, monto, fecha_inicio, fecha_vencimiento]);
                sendJSON(res, { success: true, message: 'Cuenta guardada' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar_pagar') {
            try {
                await query("DELETE FROM cuentas_pagar WHERE id = ?", [data.id]);
                sendJSON(res, { success: true });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar_cobrar') {
            try {
                await query("DELETE FROM cuentas_cobrar WHERE id = ?", [data.id]);
                sendJSON(res, { success: true });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'registrar_pago_parcial') {
            try {
                const { id, tipo, monto_pago, metodo_pago, referencia, observaciones } = data;
                const fecha = new Date().toISOString().split('T')[0];
                const table = tipo === 'pagar' ? 'cuentas_pagar' : 'cuentas_cobrar';
                const montoPagadoCol = tipo === 'pagar' ? 'monto_pagado' : 'monto_cobrado';
                await transaction(async (conn) => {
                    const [cuenta] = await conn.execute(`SELECT monto, COALESCE(${montoPagadoCol}, 0) as pagado, estado FROM ${table} WHERE id = ?`, [id]);
                    const montoTotal = parseFloat(cuenta[0].monto);
                    const montoActualPagado = parseFloat(cuenta[0].pagado);
                    const nuevoPagado = montoActualPagado + monto_pago;
                    const nuevoEstado = nuevoPagado >= montoTotal ? (tipo === 'pagar' ? 'pagado' : 'cobrado') : 'pendiente';
                    await conn.execute(`UPDATE ${table} SET ${montoPagadoCol} = ?, estado = ? WHERE id = ?`, [nuevoPagado, nuevoEstado, id]);
                    await conn.execute(`INSERT INTO pagos_cuentas (cuenta_id, tipo_cuenta, monto, fecha, metodo_pago, referencia, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, tipo, monto_pago, fecha, metodo_pago, referencia || '', observaciones || '']);
                });
                sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar_pago_parcial') {
            try {
                const { pago_id, cuenta_id, tipo } = data;
                const table = tipo === 'pagar' ? 'cuentas_pagar' : 'cuentas_cobrar';
                const montoPagadoCol = tipo === 'pagar' ? 'monto_pagado' : 'monto_cobrado';
                await transaction(async (conn) => {
                    const [pago] = await conn.execute("SELECT * FROM pagos_cuentas WHERE id = ? AND cuenta_id = ? AND tipo_cuenta = ?", [pago_id, cuenta_id, tipo]);
                    if (pago.length === 0) throw new Error('Pago no encontrado');
                    const montoARestar = parseFloat(pago[0].monto);
                    const [cuenta] = await conn.execute(`SELECT monto, COALESCE(${montoPagadoCol}, 0) as pagado FROM ${table} WHERE id = ?`, [cuenta_id]);
                    const montoTotal = parseFloat(cuenta[0].monto);
                    let nuevoPagado = parseFloat(cuenta[0].pagado) - montoARestar;
                    if (nuevoPagado <= 0) nuevoPagado = 0;
                    const nuevoEstado = nuevoPagado >= montoTotal ? (tipo === 'pagar' ? 'pagado' : 'cobrado') : 'pendiente';
                    await conn.execute(`UPDATE ${table} SET ${montoPagadoCol} = ?, estado = ? WHERE id = ?`, [nuevoPagado, nuevoEstado, cuenta_id]);
                    await conn.execute("DELETE FROM pagos_cuentas WHERE id = ?", [pago_id]);
                });
                sendJSON(res, { success: true, message: 'Pago eliminado correctamente' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== EGRESOS ==========
async function handleEgresos(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener') {
            try {
                const { categoria, tipo } = req.query;
                let whereConditions = [], params = [];
                if (categoria) { whereConditions.push("categoria = ?"); params.push(categoria); }
                if (tipo === 'gasto' || tipo === 'costo') { whereConditions.push("tipo = ?"); params.push(tipo); }
                const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
                const egresos = await query(`SELECT * FROM egresos ${whereClause} ORDER BY fecha DESC, id DESC`, params);
                sendJSON(res, { success: true, datos: egresos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_categorias') {
            try {
                const { tipo } = req.query;
                const where = tipo ? "WHERE tipo = ? AND activo = 1" : "WHERE activo = 1";
                const params = tipo ? [tipo] : [];
                const categorias = await query(`SELECT * FROM categorias_egresos ${where} ORDER BY nombre`, params);
                sendJSON(res, { success: true, categorias });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar') {
            try {
                const { tipo, fecha, descripcion, monto, categoria, metodo_pago, referencia, observaciones } = data;
                const result = await query(`INSERT INTO egresos (tipo, fecha, descripcion, monto, categoria, metodo_pago, referencia, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [tipo, fecha, descripcion, monto, categoria || null, metodo_pago || 'efectivo', referencia || null, observaciones || null]);
                sendJSON(res, { success: true, message: 'Egreso registrado', id: result.insertId });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar') {
            try {
                await query("DELETE FROM egresos WHERE id = ?", [data.id]);
                sendJSON(res, { success: true, message: 'Egreso eliminado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'guardar_categoria') {
            try {
                const { nombre, tipo } = data;
                const result = await query("INSERT INTO categorias_egresos (nombre, tipo) VALUES (?, ?)", [nombre, tipo]);
                sendJSON(res, { success: true, message: 'Categoría creada', id: result.insertId });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'actualizar_categoria') {
            try {
                const { id, nombre } = data;
                await query("UPDATE categorias_egresos SET nombre = ? WHERE id = ?", [nombre, id]);
                sendJSON(res, { success: true, message: 'Categoría actualizada' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar_categoria') {
            try {
                const { id } = data;
                const check = await query("SELECT id FROM egresos WHERE categoria = (SELECT nombre FROM categorias_egresos WHERE id = ?) LIMIT 1", [id]);
                if (check.length > 0) { sendJSON(res, { success: false, error: 'No se puede eliminar la categoría porque tiene egresos asociados' }); return; }
                await query("DELETE FROM categorias_egresos WHERE id = ?", [id]);
                sendJSON(res, { success: true, message: 'Categoría eliminada' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== MATERIA PRIMA ==========
async function handleMateriaPrima(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener') {
            try {
                const { proveedor_id } = req.query;
                let whereProveedor = '', params = [];
                if (proveedor_id && proveedor_id > 0) { whereProveedor = 'AND mp.proveedor_id = ?'; params.push(proveedor_id); }
                const noPagadas = await query(`SELECT mp.*, p.nombre as proveedor_nombre, p.contacto, p.telefono, (mp.cantidad_litros * mp.costo_por_litro) as total_calculado, 0 as es_cabecera FROM materia_prima mp LEFT JOIN proveedores p ON mp.proveedor_id = p.id WHERE (mp.pagado = 0 OR mp.pagado IS NULL) ${whereProveedor} ORDER BY mp.fecha DESC, mp.hora DESC`, params);
                const datos = noPagadas.map(row => ({ ...row, total_costo: row.total_costo || row.total_calculado, es_cabecera: false }));
                const pagos = await query(`SELECT pp.*, p.nombre as proveedor_nombre FROM pagos_proveedores pp LEFT JOIN proveedores p ON pp.proveedor_id = p.id WHERE 1=1 ORDER BY pp.fecha_pago DESC`);
                for (const pago of pagos) {
                    const recepciones = await query(`SELECT mp.*, p.contacto, p.telefono, (mp.cantidad_litros * mp.costo_por_litro) as total_calculado FROM materia_prima mp LEFT JOIN proveedores p ON mp.proveedor_id = p.id WHERE mp.proveedor_id = ? AND mp.fecha BETWEEN ? AND ? AND mp.pagado = 1 ORDER BY mp.fecha ASC, mp.hora ASC`, [pago.proveedor_id, pago.semana_inicio, pago.semana_fin]);
                    if (recepciones.length > 0) {
                        let totalLitros = 0, totalCosto = 0;
                        const recepcionesProc = recepciones.map(r => { const costo = r.total_costo || r.total_calculado; totalLitros += r.cantidad_litros; totalCosto += costo; return { ...r, total_costo: costo }; });
                        datos.push({ es_cabecera: true, pago_id: pago.id, proveedor_id: pago.proveedor_id, proveedor_nombre: pago.proveedor_nombre, semana_inicio: pago.semana_inicio, semana_fin: pago.semana_fin, total_litros: totalLitros, total_costo: pago.costo_total, monto_pagado: pago.monto_pagado, deducciones: pago.deducciones, fecha_pago: pago.fecha_pago, metodo_pago: pago.metodo_pago, observaciones: pago.observaciones, recepciones: recepcionesProc });
                    }
                }
                datos.sort((a, b) => { if (a.es_cabecera !== b.es_cabecera) return a.es_cabecera ? 1 : -1; if (!a.es_cabecera && !b.es_cabecera) return new Date(b.fecha) - new Date(a.fecha); if (a.es_cabecera && b.es_cabecera) return new Date(b.fecha_pago) - new Date(a.fecha_pago); return 0; });
                sendJSON(res, { success: true, datos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_proveedores') {
            try {
                const proveedores = await query("SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre");
                sendJSON(res, { success: true, proveedores });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_proveedor') {
            try {
                const { id } = req.query;
                if (!id) { sendJSON(res, { success: false, error: 'ID de proveedor requerido' }); return; }
                const proveedores = await query("SELECT * FROM proveedores WHERE id = ? AND activo = 1", [id]);
                if (proveedores.length > 0) sendJSON(res, { success: true, proveedor: proveedores[0] });
                else sendJSON(res, { success: false, error: 'Proveedor no encontrado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_detalle_recepcion') {
            try {
                const { id } = req.query;
                if (!id) { sendJSON(res, { success: false, error: 'ID de recepción requerido' }); return; }
                const recepciones = await query(`SELECT mp.*, p.contacto, p.telefono, p.email, p.direccion, p.dia_corte FROM materia_prima mp LEFT JOIN proveedores p ON mp.proveedor_id = p.id WHERE mp.id = ?`, [id]);
                if (recepciones.length > 0) sendJSON(res, { success: true, recepcion: recepciones[0] });
                else sendJSON(res, { success: false, error: 'Recepción no encontrada' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_resumen_semanal') {
            try {
                const { proveedor_id, inicio, fin } = req.query;
                if (!proveedor_id || !inicio || !fin) { sendJSON(res, { success: false, error: 'Faltan parámetros' }); return; }
                const resumen = await query(`SELECT COALESCE(SUM(cantidad_litros), 0) as total_leche, COALESCE(SUM(total_costo), 0) as total_costo FROM materia_prima WHERE proveedor_id = ? AND fecha BETWEEN ? AND ? AND (pagado = 0 OR pagado IS NULL)`, [proveedor_id, inicio, fin]);
                sendJSON(res, { success: true, total_leche: parseFloat(resumen[0].total_leche), total_costo: parseFloat(resumen[0].total_costo) });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_recepciones_por_periodo') {
            try {
                const { proveedor_id, inicio, fin } = req.query;
                if (!proveedor_id || !inicio || !fin) { sendJSON(res, { success: false, error: 'Faltan parámetros' }); return; }
                const recepciones = await query(`SELECT * FROM materia_prima WHERE proveedor_id = ? AND fecha BETWEEN ? AND ? AND pagado = 1 ORDER BY fecha ASC`, [proveedor_id, inicio, fin]);
                const recepcionesConCosto = recepciones.map(row => { if (!row.total_costo || row.total_costo === 0) row.total_costo = row.cantidad_litros * row.costo_por_litro; return row; });
                sendJSON(res, { success: true, recepciones: recepcionesConCosto });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar') {
            try {
                const { fecha, hora, proveedor_id, proveedor_nombre, tipo_leche, cantidad_litros, costo_por_litro, guardar_en_cuentas, pago_con_producto, producto_entregado, cantidad_producto, observaciones } = data;
                const costo_total = cantidad_litros * (costo_por_litro || 0);
                const result = await query(`INSERT INTO materia_prima (fecha, hora, proveedor_id, proveedor_nombre, tipo_leche, cantidad_litros, costo_por_litro, total_costo, guardar_en_cuentas, pago_con_producto, producto_entregado, cantidad_producto, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [fecha, hora || new Date().toTimeString().slice(0,8), proveedor_id, proveedor_nombre, tipo_leche || 'normal', cantidad_litros, costo_por_litro || 0, costo_total, guardar_en_cuentas || 0, pago_con_producto || 0, producto_entregado || null, cantidad_producto || null, observaciones || null]);
                sendJSON(res, { success: true, message: 'Registro guardado', id: result.insertId });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar') {
            try {
                await query("DELETE FROM materia_prima WHERE id = ?", [data.id]);
                sendJSON(res, { success: true, message: 'Registro eliminado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'guardar_proveedor') {
            try {
                const { nombre, contacto, telefono, email, direccion, dia_corte = 2 } = data;
                const result = await query(`INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, dia_corte) VALUES (?, ?, ?, ?, ?, ?)`, [nombre, contacto || '', telefono || '', email || '', direccion || '', dia_corte]);
                sendJSON(res, { success: true, message: 'Proveedor agregado', id: result.insertId });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'actualizar_proveedor') {
            try {
                const { id, nombre, contacto, telefono, email, direccion, dia_corte } = data;
                await query(`UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, dia_corte = ? WHERE id = ?`, [nombre, contacto || '', telefono || '', email || '', direccion || '', dia_corte || 2, id]);
                sendJSON(res, { success: true, message: 'Proveedor actualizado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== PROVEEDORES PAGOS ==========
async function handleProveedoresPagos(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener_historial') {
            try {
                const proveedor_id = parseInt(req.query.proveedor_id || '0');
                if (!proveedor_id) { sendJSON(res, { success: false, error: 'ID de proveedor requerido' }); return; }
                const pagos = await query(`SELECT * FROM pagos_proveedores WHERE proveedor_id = ? ORDER BY fecha_pago DESC`, [proveedor_id]);
                sendJSON(res, { success: true, pagos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'registrar_pago') {
            try {
                const { proveedor_id, semana_inicio, semana_fin, total_leche, costo_total, deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids } = data;
                const proveedorInfo = await query("SELECT nombre FROM proveedores WHERE id = ?", [proveedor_id]);
                const proveedor_nombre = proveedorInfo.length > 0 ? proveedorInfo[0].nombre : '';
                await transaction(async (conn) => {
                    await conn.execute(`INSERT INTO pagos_proveedores (proveedor_id, semana_inicio, semana_fin, total_leche, costo_total, deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [proveedor_id, semana_inicio, semana_fin, total_leche, costo_total, deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids || null]);
                    await conn.execute(`UPDATE materia_prima SET pagado = 1 WHERE proveedor_id = ? AND fecha BETWEEN ? AND ? AND (pagado = 0 OR pagado IS NULL)`, [proveedor_id, semana_inicio, semana_fin]);
                    await conn.execute(`UPDATE cuentas_pagar SET monto_pagado = ?, estado = 'pagado' WHERE descripcion LIKE ? AND fecha_inicio = ? AND oculto = 0`, [costo_total, `%${proveedor_nombre}%`, semana_inicio]);
                    if (adelantos_ids) {
                        const ids = adelantos_ids.split(',');
                        for (const id of ids) { const numId = parseInt(id); if (numId > 0) await conn.execute("UPDATE adelantos_proveedores SET estado = 'aplicado' WHERE id = ?", [numId]); }
                    }
                });
                sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== NÓMINA ==========
async function handleNomina(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener_dias_con_pagos') {
            try {
                const dias = await query(`SELECT DATE(fecha_pago) as fecha_pago, DAYOFWEEK(fecha_pago) as dia_semana, CASE DAYOFWEEK(fecha_pago) WHEN 1 THEN 'Domingo' WHEN 2 THEN 'Lunes' WHEN 3 THEN 'Martes' WHEN 4 THEN 'Miércoles' WHEN 5 THEN 'Jueves' WHEN 6 THEN 'Viernes' WHEN 7 THEN 'Sábado' END as nombre_dia FROM nomina_pagos GROUP BY DATE(fecha_pago) ORDER BY fecha_pago DESC`);
                for (const dia of dias) {
                    const pagos = await query(`SELECT n.*, t.nombre as trabajador_nombre, t.cargo FROM nomina_pagos n JOIN trabajadores t ON n.trabajador_id = t.id WHERE DATE(n.fecha_pago) = ? ORDER BY t.nombre`, [dia.fecha_pago]);
                    dia.pagos = pagos;
                }
                sendJSON(res, { success: true, dias });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_pagos_por_dia') {
            try {
                const { fecha } = req.query;
                const pagos = await query(`SELECT n.*, t.nombre as trabajador_nombre, t.cargo FROM nomina_pagos n JOIN trabajadores t ON n.trabajador_id = t.id WHERE DATE(n.fecha_pago) = ? ORDER BY t.nombre`, [fecha]);
                sendJSON(res, { success: true, pagos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_historial_completo') {
            try {
                const pagos = await query(`SELECT n.*, t.nombre as trabajador_nombre, t.cargo FROM nomina_pagos n JOIN trabajadores t ON n.trabajador_id = t.id ORDER BY n.fecha_pago DESC, t.nombre`);
                sendJSON(res, { success: true, pagos });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar_pago') {
            try {
                const { trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones } = data;
                const check = await query(`SELECT id FROM nomina_pagos WHERE trabajador_id = ? AND semana_inicio = ?`, [trabajador_id, semana_inicio]);
                if (check.length > 0) { sendJSON(res, { success: false, error: 'Esta semana ya tiene registro de pago para este trabajador' }); return; }
                await transaction(async (conn) => {
                    await conn.execute(`INSERT INTO nomina_pagos (trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, prestamos_pagados, total_pagado, fecha_pago, metodo_pago, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones]);
                    if (deducciones > 0) {
                        let restante = deducciones;
                        const prestamos = await conn.execute(`SELECT id, monto FROM prestamos WHERE trabajador_id = ? AND estado = 'pendiente' ORDER BY fecha ASC`, [trabajador_id]);
                        for (const prestamo of prestamos[0]) {
                            if (restante <= 0) break;
                            if (restante >= prestamo.monto) { await conn.execute("UPDATE prestamos SET estado = 'pagado' WHERE id = ?", [prestamo.id]); restante -= prestamo.monto; }
                            else { const nuevo_monto = prestamo.monto - restante; await conn.execute("UPDATE prestamos SET monto = ? WHERE id = ?", [nuevo_monto, prestamo.id]); restante = 0; }
                        }
                    }
                });
                sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar_pago') {
            try {
                await transaction(async (conn) => {
                    const [pago] = await conn.execute("SELECT * FROM nomina_pagos WHERE id = ?", [data.id]);
                    if (pago.length === 0) throw new Error('Pago no encontrado');
                    await conn.execute("DELETE FROM pago_detalle_valores WHERE pago_id = ?", [data.id]);
                    await conn.execute("DELETE FROM nomina_pagos WHERE id = ?", [data.id]);
                });
                sendJSON(res, { success: true, message: 'Pago eliminado correctamente' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== TRABAJADORES ==========
async function handleTrabajadores(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener') {
            try {
                const trabajadores = await query(`SELECT id, nombre, cedula, cargo, telefono, sucursal_id, dia_corte, COALESCE(tipo_pago, 'produccion') as tipo_pago, COALESCE(sueldo_fijo, 0) as sueldo_fijo, (SELECT COALESCE(SUM(monto), 0) FROM prestamos WHERE trabajador_id = trabajadores.id AND estado = 'pendiente') as deuda_pendiente FROM trabajadores WHERE activo = 1 ORDER BY nombre`);
                sendJSON(res, { success: true, trabajadores });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_uno') {
            try {
                const id = parseInt(req.query.id || '0');
                if (!id) { sendJSON(res, { success: false, error: 'ID requerido' }); return; }
                const trabajadores = await query(`SELECT t.*, s.nombre as sucursal_nombre FROM trabajadores t LEFT JOIN sucursales s ON t.sucursal_id = s.id WHERE t.id = ? AND t.activo = 1`, [id]);
                if (trabajadores.length > 0) sendJSON(res, { success: true, trabajador: trabajadores[0] });
                else sendJSON(res, { success: false, error: 'Trabajador no encontrado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_prestamos') {
            try {
                const trabajador_id = parseInt(req.query.trabajador_id || '0');
                if (!trabajador_id) { sendJSON(res, { success: false, error: 'ID de trabajador requerido' }); return; }
                const prestamos = await query(`SELECT id, monto, fecha, descripcion, estado FROM prestamos WHERE trabajador_id = ? ORDER BY fecha DESC`, [trabajador_id]);
                let deuda_total = 0;
                for (const p of prestamos) if (p.estado === 'pendiente') deuda_total += parseFloat(p.monto);
                sendJSON(res, { success: true, prestamos, deuda_total });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_deuda') {
            try {
                const trabajador_id = parseInt(req.query.trabajador_id || '0');
                if (!trabajador_id) { sendJSON(res, { success: false, error: 'ID de trabajador requerido' }); return; }
                const deuda = await query(`SELECT COALESCE(SUM(monto), 0) as deuda FROM prestamos WHERE trabajador_id = ? AND estado = 'pendiente'`, [trabajador_id]);
                sendJSON(res, { success: true, deuda: parseFloat(deuda[0].deuda) });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar') {
            try {
                const { nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo } = data;
                const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
                const result = await query(`INSERT INTO trabajadores (nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [nombre, cedula, cargo || '', telefono || '', sucursalValue, dia_corte || 2, tipo_pago || 'produccion', sueldo_fijo || 0]);
                sendJSON(res, { success: true, message: 'Trabajador agregado', id: result.insertId });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'actualizar') {
            try {
                const { id, nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo } = data;
                const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
                await query(`UPDATE trabajadores SET nombre = ?, cedula = ?, cargo = ?, telefono = ?, sucursal_id = ?, dia_corte = ?, tipo_pago = ?, sueldo_fijo = ? WHERE id = ?`, [nombre, cedula, cargo || '', telefono || '', sucursalValue, dia_corte || 2, tipo_pago || 'produccion', sueldo_fijo || 0, id]);
                sendJSON(res, { success: true, message: 'Trabajador actualizado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar') {
            try {
                const { id } = data;
                await transaction(async (conn) => {
                    await conn.execute("DELETE FROM nomina_pagos WHERE trabajador_id = ?", [id]);
                    await conn.execute("DELETE FROM prestamos WHERE trabajador_id = ?", [id]);
                    await conn.execute("UPDATE trabajadores SET activo = 0 WHERE id = ?", [id]);
                });
                sendJSON(res, { success: true, message: 'Trabajador y sus registros asociados eliminados' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'guardar_prestamo') {
            try {
                const { trabajador_id, monto, fecha, descripcion } = data;
                await query(`INSERT INTO prestamos (trabajador_id, monto, fecha, descripcion) VALUES (?, ?, ?, ?)`, [trabajador_id, monto, fecha, descripcion || '']);
                sendJSON(res, { success: true, message: 'Préstamo registrado' });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== PRODUCCIÓN SUCURSAL ==========
function obtenerSemanaActual() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    let inicio = new Date(hoy);
    if (diaSemana === 3) inicio = hoy;
    else if (diaSemana === 4) inicio.setDate(hoy.getDate() - 1);
    else if (diaSemana === 5) inicio.setDate(hoy.getDate() - 2);
    else if (diaSemana === 6) inicio.setDate(hoy.getDate() - 3);
    else if (diaSemana === 0) inicio.setDate(hoy.getDate() - 4);
    else if (diaSemana === 1) inicio.setDate(hoy.getDate() - 5);
    else if (diaSemana === 2) inicio.setDate(hoy.getDate() - 6);
    return inicio;
}

async function handleProduccionSucursal(req, res) {
    const { action } = req.query;
    if (action === 'obtener_tabla') {
        try {
            const trabajador_id = parseInt(req.query.trabajador_id || '0');
            const sucursal_id = parseInt(req.query.sucursal_id || '0');
            const inicioSemana = obtenerSemanaActual();
            const fechaInicio = inicioSemana.toISOString().split('T')[0];
            const fechaFin = new Date(inicioSemana);
            fechaFin.setDate(inicioSemana.getDate() + 6);
            const fechaFinStr = fechaFin.toISOString().split('T')[0];
            const productos = await query(`SELECT nombre, es_leche, id FROM productos WHERE activo = 1 ORDER BY CASE WHEN es_leche = 1 THEN 0 ELSE 1 END, nombre`);
            const listaProductos = productos.map(p => p.nombre);
            let querySQL, params;
            if (trabajador_id > 0) {
                querySQL = `SELECT fecha, tipo_producto, peso_kg, piezas FROM produccion_diaria WHERE fecha BETWEEN ? AND ? AND trabajador_id = ? ORDER BY fecha, tipo_producto`;
                params = [fechaInicio, fechaFinStr, trabajador_id];
            } else if (sucursal_id > 0) {
                querySQL = `SELECT p.fecha, p.tipo_producto, SUM(p.peso_kg) as peso_kg, SUM(p.piezas) as piezas FROM produccion_diaria p JOIN trabajadores t ON p.trabajador_id = t.id WHERE p.fecha BETWEEN ? AND ? AND t.sucursal_id = ? GROUP BY p.fecha, p.tipo_producto ORDER BY p.fecha, p.tipo_producto`;
                params = [fechaInicio, fechaFinStr, sucursal_id];
            } else {
                querySQL = `SELECT fecha, tipo_producto, SUM(peso_kg) as peso_kg, SUM(piezas) as piezas FROM produccion_diaria WHERE fecha BETWEEN ? AND ? GROUP BY fecha, tipo_producto ORDER BY fecha, tipo_producto`;
                params = [fechaInicio, fechaFinStr];
            }
            const datosRaw = await query(querySQL, params);
            const datos = {};
            for (const row of datosRaw) { if (!datos[row.fecha]) datos[row.fecha] = {}; datos[row.fecha][row.tipo_producto] = { peso: row.peso_kg, piezas: row.piezas }; }
            const nombresDias = ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'];
            const fechas = [];
            for (let i = 0; i < 7; i++) { const fecha = new Date(inicioSemana); fecha.setDate(inicioSemana.getDate() + i); fechas.push(fecha); }
            const hoyStr = new Date().toISOString().split('T')[0];
            let html = '<div style="overflow-x: auto; width: 100%; margin-top:12px"><table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(0,0,0,0.4); background: white;"><thead><tr style="background: #278233; color: white;"><th style="padding: 8px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.4);">Fecha</th>';
            for (const producto of listaProductos) {
                const nombreFormateado = producto.replace(/_/g, ' ');
                html += `<th style='position: relative; padding: 12px 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.4);'><span style='cursor: pointer; text-decoration: underline; text-decoration-style: dotted;' onclick="verProduccionProducto('${producto}')">${nombreFormateado}</span><span class='delete-producto-th' data-producto='${producto}' style='cursor: pointer; margin-left: 8px; font-size: 14px;' onclick="event.stopPropagation(); eliminarProductoTH('${producto}')">×</span></th>`;
            }
            html += '</tr></thead><tbody>';
            for (let i = 0; i < fechas.length; i++) {
                const fecha = fechas[i];
                const fechaStr = fecha.toISOString().split('T')[0];
                const fechaMostrar = `${fecha.getDate().toString().padStart(2,'0')}/${(fecha.getMonth()+1).toString().padStart(2,'0')}/${fecha.getFullYear()}`;
                const nombreDia = nombresDias[i];
                const esHoy = fechaStr === hoyStr;
                const bgColor = esHoy ? 'background-color: #fff3cd;' : '';
                html += `<tr style="${bgColor} border-bottom: 1px solid rgba(0,0,0,0.05);"><td style="padding: 10px 8px; vertical-align: top;"><strong>${fechaMostrar}</strong><br><small>${nombreDia}</small></td>`;
                for (const producto of listaProductos) {
                    const prod = datos[fechaStr]?.[producto];
                    const prodInfo = productos.find(p => p.nombre === producto);
                    const esLeche = prodInfo?.es_leche || false;
                    html += "<td style='padding: 8px; text-align:center; white-space: nowrap;'>";
                    if (prod && ((prod.peso && prod.peso > 0) || (prod.piezas && prod.piezas > 0))) {
                        if (esLeche) {
                            html += `<div style='display: inline-block; padding: 3px; border-radius: 3px; cursor: pointer; justify-content:center' class='producto-leche' data-fecha='${fechaStr}' data-producto='${producto}' data-tipo='leche' onclick='eliminarRegistroProduccion(this)'>🥛 ${parseFloat(prod.peso).toFixed(2)} L</div>`;
                        } else {
                            html += '<div style="display: flex; gap: 6px; align-items: center; flex-wrap: nowrap;justify-content:center;">';
                            if (prod.peso && prod.peso > 0) html += `<div style='display: inline-block; padding: 3px; border-right: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-peso' data-fecha='${fechaStr}' data-producto='${producto}' data-tipo='peso' onclick='eliminarRegistroProduccion(this)'>⚖️ ${parseFloat(prod.peso).toFixed(2)} kg</div>`;
                            if (prod.piezas && prod.piezas > 0) html += `<div style='display: inline-block; padding: 3px; border-left: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-piezas' data-fecha='${fechaStr}' data-producto='${producto}' data-tipo='piezas' onclick='eliminarRegistroProduccion(this)'>📦 ${prod.piezas} pz</div>`;
                            html += '</div>';
                        }
                    } else { html += '<span style="color:#ccc;">-</span>'; }
                    html += '</td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table></div>';
            html += `<div id="filtroProduccion" class="filtros-container" style="margin-bottom: 15px; justify-content: space-between;"><div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;"><div class="filtro-grupo"><label>Fecha Desde</label><input type="date" id="fechaDesdeProduccion" style="min-width: 160px;"></div><div class="filtro-grupo"><label>Fecha Hasta</label><input type="date" id="fechaHastaProduccion" style="min-width: 160px;"></div><div class="filtro-grupo"><button class="btn-filtro" id="btnFiltrarProduccion">Filtrar</button><button class="btn-limpiar-filtros" id="btnLimpiarProduccion">Limpiar</button></div></div><div style="display: flex; gap: 8px;"><button class="btn-agregar" id="btnExportarProduccion" style="font-size: 14px; padding: 8px 16px; background: white; box-shadow: none; color: #278233;">Exportar</button><div style="background: rgba(0,0,0,.7); border-radius: 4px; width: 3px; height: 100%;"></div><button class="btn-agregar" onclick="abrirModalNuevoProducto()" style="font-size: 14px; padding: 8px 16px;">+ Producto</button><button class="btn-agregar" onclick="abrirFormularioSucursal()" style="font-size: 24px; padding: 8px 16px;">+</button></div></div>`;
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
        } catch (error) { res.status(500).send(`<div style="color:red">Error: ${error.message}</div>`); }
        return;
    }
    if (action === 'obtener_produccion_producto') {
        try {
            const { producto, fecha_inicio, fecha_fin, sucursal_id } = req.query;
            if (!producto) { sendJSON(res, { success: false, error: 'Producto no especificado' }); return; }
            let fechaInicio = fecha_inicio;
            let fechaFin = fecha_fin;
            if (!fechaInicio && !fechaFin) { fechaFin = new Date().toISOString().split('T')[0]; const fechaObj = new Date(); fechaObj.setDate(fechaObj.getDate() - 30); fechaInicio = fechaObj.toISOString().split('T')[0]; }
            let querySQL = `SELECT p.fecha, COALESCE(SUM(p.peso_kg), 0) as total_peso, COALESCE(SUM(p.piezas), 0) as total_piezas, t.nombre as trabajador_nombre, t.id as trabajador_id, s.nombre as sucursal_nombre FROM produccion_diaria p JOIN trabajadores t ON p.trabajador_id = t.id LEFT JOIN sucursales s ON t.sucursal_id = s.id WHERE p.tipo_producto = ? AND p.fecha BETWEEN ? AND ?`;
            let params = [producto, fechaInicio, fechaFin];
            if (sucursal_id && sucursal_id > 0) { querySQL += " AND t.sucursal_id = ?"; params.push(sucursal_id); }
            querySQL += " GROUP BY p.fecha, t.id ORDER BY p.fecha DESC, t.nombre ASC";
            const datosRaw = await query(querySQL, params);
            const trabajadores = [], fechas = [], datos = {};
            for (const row of datosRaw) {
                const fecha = row.fecha, trabajador = row.trabajador_nombre;
                if (!fechas.includes(fecha)) fechas.push(fecha);
                if (!trabajadores.includes(trabajador)) trabajadores.push(trabajador);
                if (!datos[fecha]) datos[fecha] = {};
                datos[fecha][trabajador] = { peso: parseFloat(row.total_peso), piezas: parseInt(row.total_piezas), sucursal: row.sucursal_nombre };
            }
            const prodInfo = await query("SELECT nombre, es_leche FROM productos WHERE nombre = ?", [producto]);
            const esLeche = prodInfo.length > 0 ? prodInfo[0].es_leche === 1 : false;
            sendJSON(res, { success: true, producto, es_leche: esLeche, fechas, trabajadores, datos, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
        } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
        return;
    }
    if (action === 'eliminar_registro' && req.method === 'POST') {
        try {
            const data = await parseBody(req);
            const { fecha, producto, tipo, sucursal_id } = data;
            if (!fecha || !producto) { sendJSON(res, { success: false, error: 'Datos incompletos' }); return; }
            if (tipo === 'leche') {
                let sql = "DELETE FROM produccion_diaria WHERE fecha = ? AND tipo_producto = ?";
                if (sucursal_id && sucursal_id > 0) { sql += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)"; await query(sql, [fecha, producto, sucursal_id]); }
                else { await query(sql, [fecha, producto]); }
            } else if (tipo === 'peso') {
                let sql = "UPDATE produccion_diaria SET peso_kg = NULL WHERE fecha = ? AND tipo_producto = ?";
                if (sucursal_id && sucursal_id > 0) { sql += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)"; await query(sql, [fecha, producto, sucursal_id]); }
                else { await query(sql, [fecha, producto]); }
            } else if (tipo === 'piezas') {
                let sql = "UPDATE produccion_diaria SET piezas = NULL WHERE fecha = ? AND tipo_producto = ?";
                if (sucursal_id && sucursal_id > 0) { sql += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)"; await query(sql, [fecha, producto, sucursal_id]); }
                else { await query(sql, [fecha, producto]); }
            } else { sendJSON(res, { success: false, error: 'Tipo de eliminación no válido' }); return; }
            if (tipo === 'peso' || tipo === 'piezas') {
                let deleteSQL = "DELETE FROM produccion_diaria WHERE fecha = ? AND tipo_producto = ? AND (peso_kg IS NULL OR peso_kg = 0) AND (piezas IS NULL OR piezas = 0)";
                if (sucursal_id && sucursal_id > 0) { deleteSQL += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)"; await query(deleteSQL, [fecha, producto, sucursal_id]); }
                else { await query(deleteSQL, [fecha, producto]); }
            }
            sendJSON(res, { success: true, message: 'Registro eliminado correctamente' });
        } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
        return;
    }
    if (action === 'guardar' && req.method === 'POST') {
        try {
            const data = await parseBody(req);
            const { fecha, trabajador_id, tipo_producto, peso_kg, piezas } = data;
            if (!fecha || !tipo_producto) { sendJSON(res, { success: false, error: 'La fecha y el producto son requeridos' }); return; }
            if (new Date(fecha) > new Date()) { sendJSON(res, { success: false, error: 'No se pueden agregar fechas futuras' }); return; }
            const prodInfo = await query("SELECT es_leche FROM productos WHERE nombre = ?", [tipo_producto]);
            const esLeche = prodInfo.length > 0 ? prodInfo[0].es_leche === 1 : false;
            if (esLeche && (!peso_kg || peso_kg <= 0)) { sendJSON(res, { success: false, error: 'Debe ingresar la cantidad de litros de leche' }); return; }
            if (!esLeche && (!peso_kg || peso_kg <= 0) && (!piezas || piezas <= 0)) { sendJSON(res, { success: false, error: 'Debe ingresar peso o cantidad de piezas' }); return; }
            const existe = await query(`SELECT id FROM produccion_diaria WHERE fecha = ? AND trabajador_id = ? AND tipo_producto = ?`, [fecha, trabajador_id || 0, tipo_producto]);
            const pesoValue = peso_kg && peso_kg > 0 ? parseFloat(peso_kg) : null;
            const piezasValue = piezas && piezas > 0 ? parseInt(piezas) : null;
            if (existe.length > 0) {
                await query(`UPDATE produccion_diaria SET peso_kg = ?, piezas = ? WHERE fecha = ? AND trabajador_id = ? AND tipo_producto = ?`, [pesoValue, piezasValue, fecha, trabajador_id || 0, tipo_producto]);
                sendJSON(res, { success: true, message: 'Registro actualizado correctamente' });
            } else {
                await query(`INSERT INTO produccion_diaria (fecha, trabajador_id, tipo_producto, peso_kg, piezas) VALUES (?, ?, ?, ?, ?)`, [fecha, trabajador_id || 0, tipo_producto, pesoValue, piezasValue]);
                sendJSON(res, { success: true, message: 'Registro guardado correctamente' });
            }
        } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
        return;
    }
    sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
}

async function handleGuardarProduccion(req, res) {
    if (req.method !== 'POST') { sendJSON(res, { success: false, error: 'Método no permitido' }); return; }
    try {
        const data = await parseBody(req);
        const { fecha, tipo_producto, peso_kg, piezas } = data;
        if (!fecha || !tipo_producto) { sendJSON(res, { success: false, error: 'La fecha y el producto son requeridos' }); return; }
        if (new Date(fecha) > new Date()) { sendJSON(res, { success: false, error: 'No se pueden agregar fechas futuras' }); return; }
        const prodInfo = await query("SELECT es_leche FROM productos WHERE nombre = ?", [tipo_producto]);
        const esLeche = prodInfo.length > 0 ? prodInfo[0].es_leche === 1 : false;
        if (esLeche && (!peso_kg || peso_kg <= 0)) { sendJSON(res, { success: false, error: 'Debe ingresar la cantidad de litros de leche' }); return; }
        if (!esLeche && (!peso_kg || peso_kg <= 0) && (!piezas || piezas <= 0)) { sendJSON(res, { success: false, error: 'Debe ingresar peso o cantidad de piezas' }); return; }
        await query(`INSERT INTO produccion_diaria (fecha, tipo_producto, peso_kg, piezas) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE peso_kg = VALUES(peso_kg), piezas = VALUES(piezas)`, [fecha, tipo_producto, peso_kg || null, piezas || null]);
        sendJSON(res, { success: true, message: 'Registro guardado correctamente' });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerDetalleProduccion(req, res) {
    try {
        const { fecha, producto, sucursal_id } = req.query;
        let sql, params;
        if (sucursal_id && sucursal_id > 0) {
            sql = `SELECT t.nombre as trabajador, s.nombre as sucursal, p.peso_kg as cantidad_peso, p.piezas as cantidad_piezas, pr.es_leche, pr.nombre as producto_nombre FROM produccion_diaria p JOIN trabajadores t ON p.trabajador_id = t.id JOIN sucursales s ON t.sucursal_id = s.id JOIN productos pr ON p.tipo_producto = pr.nombre WHERE p.fecha = ? AND p.tipo_producto = ? AND t.sucursal_id = ? ORDER BY t.nombre`;
            params = [fecha, producto, sucursal_id];
        } else {
            sql = `SELECT t.nombre as trabajador, s.nombre as sucursal, p.peso_kg as cantidad_peso, p.piezas as cantidad_piezas, pr.es_leche, pr.nombre as producto_nombre FROM produccion_diaria p JOIN trabajadores t ON p.trabajador_id = t.id JOIN sucursales s ON t.sucursal_id = s.id JOIN productos pr ON p.tipo_producto = pr.nombre WHERE p.fecha = ? AND p.tipo_producto = ? ORDER BY s.nombre, t.nombre`;
            params = [fecha, producto];
        }
        const detalle = await query(sql, params);
        sendJSON(res, { success: true, detalle });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerProduccionPorPeriodo(req, res) {
    try {
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        const inicio = req.query.inicio;
        const fin = req.query.fin;
        if (!trabajador_id || !inicio || !fin) { sendJSON(res, { success: false, error: 'Parámetros incompletos' }); return; }
        const produccion = await query(`SELECT p.fecha, p.tipo_producto, SUM(p.peso_kg) as peso_kg, SUM(p.piezas) as piezas, pr.es_leche FROM produccion_diaria p JOIN productos pr ON p.tipo_producto = pr.nombre WHERE p.trabajador_id = ? AND p.fecha BETWEEN ? AND ? GROUP BY p.fecha, p.tipo_producto ORDER BY p.fecha, p.tipo_producto`, [trabajador_id, inicio, fin]);
        sendJSON(res, { success: true, produccion });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== VENTAS ==========
async function handleVentas(req, res) {
    const { action } = req.query;
    if (req.method === 'GET') {
        if (action === 'obtener') {
            try {
                const ventasRaw = await query(`SELECT v.*, c.nombre as cliente_nombre, c.rif as cliente_rif, c.telefono as cliente_telefono, c.contacto as cliente_contacto, c.email as cliente_email, c.direccion as cliente_direccion, s.id as sucursal_id, s.nombre as sucursal_nombre, (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado FROM ventas v JOIN clientes c ON v.cliente_id = c.id LEFT JOIN sucursales s ON v.sucursal_id = s.id ORDER BY v.fecha DESC, v.id DESC`);
                const ventas = ventasRaw.map(row => ({ id: row.id, cliente: row.cliente_nombre, rif: row.cliente_rif, telefono: row.cliente_telefono, contacto: row.cliente_contacto, email: row.cliente_email, direccion: row.cliente_direccion, fecha: row.fecha, metodo_pago: row.metodo_pago, tiene_descuento: row.tiene_descuento, descuento_porcentaje: row.descuento_porcentaje, descuento_monto: row.descuento_monto, es_credito: row.es_credito, subtotal: row.subtotal, total: row.total, observaciones: row.observaciones, created_at: row.created_at, sucursal_id: row.sucursal_id, sucursal_nombre: row.sucursal_nombre }));
                sendJSON(res, { success: true, ventas });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_por_cliente') {
            try {
                const cliente_id = parseInt(req.query.cliente_id || '0');
                if (cliente_id <= 0) { sendJSON(res, { success: false, error: 'ID de cliente inválido' }); return; }
                const ventas = await query(`SELECT v.*, s.nombre as sucursal_nombre, (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado FROM ventas v LEFT JOIN sucursales s ON v.sucursal_id = s.id WHERE v.cliente_id = ? ORDER BY v.fecha DESC, v.id DESC`, [cliente_id]);
                sendJSON(res, { success: true, ventas });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (action === 'obtener_detalle') {
            try {
                const id = parseInt(req.query.id || '0');
                if (id <= 0) { sendJSON(res, { success: false, error: 'ID inválido' }); return; }
                const detallesRaw = await query(`SELECT v.*, c.nombre as cliente_nombre, c.rif as cliente_rif, c.telefono as cliente_telefono, c.contacto as cliente_contacto, c.email as cliente_email, c.direccion as cliente_direccion, s.id as sucursal_id, s.nombre as sucursal_nombre, vd.*, p.nombre as producto_nombre, p.es_leche FROM ventas v JOIN clientes c ON v.cliente_id = c.id LEFT JOIN sucursales s ON v.sucursal_id = s.id JOIN ventas_detalle vd ON v.id = vd.venta_id LEFT JOIN productos p ON vd.producto_id = p.id WHERE v.id = ?`, [id]);
                if (detallesRaw.length === 0) { sendJSON(res, { success: false, error: 'Venta no encontrada' }); return; }
                const ventaData = { venta_id: detallesRaw[0].id, cliente: detallesRaw[0].cliente_nombre, rif: detallesRaw[0].cliente_rif, telefono: detallesRaw[0].cliente_telefono, contacto: detallesRaw[0].cliente_contacto, email: detallesRaw[0].cliente_email, direccion: detallesRaw[0].cliente_direccion, fecha: detallesRaw[0].fecha, metodo_pago: detallesRaw[0].metodo_pago, tiene_descuento: detallesRaw[0].tiene_descuento, descuento_porcentaje: detallesRaw[0].descuento_porcentaje, descuento_monto: detallesRaw[0].descuento_monto, es_credito: detallesRaw[0].es_credito, subtotal: detallesRaw[0].subtotal, total: detallesRaw[0].total, observaciones: detallesRaw[0].observaciones, sucursal_id: detallesRaw[0].sucursal_id, sucursal_nombre: detallesRaw[0].sucursal_nombre };
                const detalles = detallesRaw.map(row => ({ id: row.id, venta_id: row.venta_id, producto_id: row.producto_id, producto_nombre: row.producto_nombre, es_leche: row.es_leche, cantidad: row.cantidad, piezas: row.piezas, precio_unitario: row.precio_unitario }));
                sendJSON(res, { success: true, venta: ventaData, detalles });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        return;
    }
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        if (postAction === 'guardar') {
            try {
                const { cliente_id, sucursal_id, fecha, metodo_pago, tiene_descuento, descuento_porcentaje, descuento_monto, es_credito, observaciones, subtotal, total, productos } = data;
                if (!cliente_id || !productos || productos.length === 0) { sendJSON(res, { success: false, error: 'Datos incompletos' }); return; }
                let venta_id;
                await transaction(async (conn) => {
                    const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
                    const [result] = await conn.execute(`INSERT INTO ventas (cliente_id, sucursal_id, fecha, metodo_pago, tiene_descuento, descuento_porcentaje, descuento_monto, es_credito, subtotal, total, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cliente_id, sucursalValue, fecha, metodo_pago, tiene_descuento ? 1 : 0, descuento_porcentaje || 0, descuento_monto || 0, es_credito ? 1 : 0, subtotal, total, observaciones || '']);
                    venta_id = result.insertId;
                    for (const producto of productos) { await conn.execute(`INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, piezas, precio_unitario) VALUES (?, ?, ?, ?, ?)`, [venta_id, producto.id, producto.cantidad, producto.piezas || 0, producto.precio_unitario]); }
                    if (es_credito) {
                        const clienteInfo = await conn.execute("SELECT nombre FROM clientes WHERE id = ?", [cliente_id]);
                        const clienteNombre = clienteInfo[0].length > 0 ? clienteInfo[0][0].nombre : '';
                        const fechaVencimiento = new Date(fecha); fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
                        const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
                        await conn.execute(`INSERT INTO cuentas_cobrar (descripcion, monto, fecha_inicio, fecha_vencimiento, estado, venta_id, monto_original, monto_cobrado) VALUES (?, ?, ?, ?, 'pendiente', ?, ?, 0)`, [`Venta a crédito - Cliente: ${clienteNombre}`, total, fecha, fechaVencimientoStr, venta_id, total]);
                    }
                });
                const ventaInfo = await query(`SELECT v.*, c.nombre as cliente_nombre, c.rif, c.telefono, c.contacto, c.email, c.direccion, s.nombre as sucursal_nombre FROM ventas v JOIN clientes c ON v.cliente_id = c.id LEFT JOIN sucursales s ON v.sucursal_id = s.id WHERE v.id = ?`, [venta_id]);
                const venta = ventaInfo[0];
                venta.cliente = venta.cliente_nombre;
                delete venta.cliente_nombre;
                const detallesVenta = await query(`SELECT vd.*, COALESCE(p.nombre, 'Producto') as producto_nombre, COALESCE(p.es_leche, 0) as es_leche FROM ventas_detalle vd LEFT JOIN productos p ON vd.producto_id = p.id WHERE vd.venta_id = ?`, [venta_id]);
                sendJSON(res, { success: true, venta_id, venta, detalles: detallesVenta });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        if (postAction === 'eliminar') {
            try {
                const id = data.id;
                if (!id || id <= 0) { sendJSON(res, { success: false, error: 'ID inválido' }); return; }
                await transaction(async (conn) => {
                    await conn.execute("DELETE FROM cuentas_cobrar WHERE venta_id = ?", [id]);
                    await conn.execute("DELETE FROM ventas_detalle WHERE venta_id = ?", [id]);
                    await conn.execute("DELETE FROM ventas WHERE id = ?", [id]);
                });
                sendJSON(res, { success: true });
            } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
            return;
        }
        sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        return;
    }
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

// ========== PRODUCTOS ==========
async function handleObtenerProductos(req, res) {
    try {
        const productos = await query("SELECT id, nombre, es_leche FROM productos WHERE activo = 1 ORDER BY nombre");
        sendJSON(res, { success: true, productos });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerProductosMP(req, res) {
    try {
        const productos = await query("SELECT id, nombre, es_leche, activo FROM productos ORDER BY nombre");
        sendJSON(res, { success: true, productos: productos.map(p => ({ ...p, activo: p.activo !== undefined ? p.activo : 1 })) });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerProductosVenta(req, res) {
    try {
        const productos = await query("SELECT id, nombre, es_leche, precio_venta FROM productos WHERE activo = 1 ORDER BY nombre");
        sendJSON(res, { success: true, productos: productos.map(p => ({ id: p.id, nombre: p.nombre, es_leche: p.es_leche, precio: parseFloat(p.precio_venta || 0) })) });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleCrearProducto(req, res) {
    if (req.method !== 'POST') { sendJSON(res, { success: false, error: 'Método no permitido' }); return; }
    try {
        const data = await parseBody(req);
        const nombre = data.nombre.toLowerCase().replace(/\s/g, '_');
        const es_leche = (data.es_leche === true || data.es_leche === 1 || data.es_leche === 'true') ? 1 : 0;
        const result = await query("INSERT INTO productos (nombre, es_leche) VALUES (?, ?)", [nombre, es_leche]);
        sendJSON(res, { success: true, message: 'Producto creado', id: result.insertId });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleEliminarProducto(req, res) {
    if (req.method !== 'POST') { sendJSON(res, { success: false, error: 'Método no permitido' }); return; }
    try {
        const data = await parseBody(req);
        const { nombre } = data;
        await query("UPDATE productos SET activo = 0 WHERE nombre = ?", [nombre]);
        sendJSON(res, { success: true, message: 'Producto desactivado' });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== SUCURSALES ==========
async function handleObtenerSucursales(req, res) {
    try {
        const sucursales = await query("SELECT id, nombre, ubicacion FROM sucursales WHERE activo = 1 ORDER BY nombre");
        sendJSON(res, { success: true, sucursales });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleCrearSucursal(req, res) {
    if (req.method !== 'POST') { sendJSON(res, { success: false, error: 'Método no permitido' }); return; }
    try {
        const data = await parseBody(req);
        const nombre = data.nombre.toLowerCase().replace(/\s/g, '_');
        const ubicacion = data.ubicacion || '';
        const result = await query("INSERT INTO sucursales (nombre, ubicacion) VALUES (?, ?)", [nombre, ubicacion]);
        sendJSON(res, { success: true, message: 'Sucursal creada', id: result.insertId });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleEliminarElemento(req, res) {
    if (req.method !== 'POST') { sendJSON(res, { success: false, error: 'Método no permitido' }); return; }
    try {
        const data = await parseBody(req);
        const { action, nombre } = data;
        if (action === 'eliminar_sucursal') { await query("DELETE FROM sucursales WHERE nombre = ?", [nombre]); }
        else if (action === 'eliminar_producto') { await query("DELETE FROM productos WHERE nombre = ?", [nombre]); }
        else { sendJSON(res, { success: false, error: 'Acción no válida' }); return; }
        sendJSON(res, { success: true, message: 'Eliminado correctamente' });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== TRABAJADORES SELECT ==========
async function handleObtenerTrabajadoresSelect(req, res) {
    try {
        const trabajadores = await query("SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 ORDER BY nombre");
        sendJSON(res, { success: true, trabajadores });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerTrabajadoresPorSucursal(req, res) {
    try {
        const sucursal_id = parseInt(req.query.sucursal_id || '0');
        let trabajadores;
        if (sucursal_id > 0) { trabajadores = await query("SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 AND sucursal_id = ? ORDER BY nombre", [sucursal_id]); }
        else { trabajadores = await query("SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 ORDER BY nombre"); }
        sendJSON(res, { success: true, trabajadores });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== CÁLCULOS ==========
async function handleCalcularPeriodoPorCorte(req, res) {
    try {
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        let diaCorte = parseInt(req.query.dia_corte || '2');
        if (diaCorte < 1 || diaCorte > 7) diaCorte = 2;
        const fechaObj = new Date(fecha);
        const mapaDias = [0, 7, 1, 2, 3, 4, 5, 6];
        const diaCortePHP = mapaDias[diaCorte];
        let finPeriodo = new Date(fechaObj);
        let diaSemanaActual = finPeriodo.getDay() === 0 ? 7 : finPeriodo.getDay();
        while (diaSemanaActual !== diaCortePHP) { finPeriodo.setDate(finPeriodo.getDate() - 1); diaSemanaActual = finPeriodo.getDay() === 0 ? 7 : finPeriodo.getDay(); }
        const inicioPeriodo = new Date(finPeriodo);
        inicioPeriodo.setDate(finPeriodo.getDate() - 6);
        sendJSON(res, { success: true, inicio: inicioPeriodo.toISOString().split('T')[0], fin: finPeriodo.toISOString().split('T')[0], dia_corte: diaCorte, fecha_actual: fecha });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleCalcularPeriodoPago(req, res) {
    try {
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        const trabajadores = await query("SELECT dia_corte, ultimo_pago_fecha FROM trabajadores WHERE id = ?", [trabajador_id]);
        if (trabajadores.length === 0) { sendJSON(res, { success: false, error: 'Trabajador no encontrado' }); return; }
        let diaCorte = trabajadores[0].dia_corte || 4;
        let ultimoPago = trabajadores[0].ultimo_pago_fecha;
        const diasMap = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
        let inicio;
        if (!ultimoPago || ultimoPago === '0000-00-00') {
            const hoy = new Date();
            const nombreDiaCorte = diasMap[diaCorte];
            let primerCorte = new Date(hoy);
            while (primerCorte.toLocaleDateString('en-US', { weekday: 'long' }) !== nombreDiaCorte) { primerCorte.setDate(primerCorte.getDate() - 1); }
            if (primerCorte.toISOString().split('T')[0] === hoy.toISOString().split('T')[0]) { inicio = new Date(hoy); }
            else { inicio = new Date(primerCorte); inicio.setDate(inicio.getDate() + 1); }
        } else { inicio = new Date(ultimoPago); inicio.setDate(inicio.getDate() + 1); }
        const nombreDiaCorte = diasMap[diaCorte];
        const fin = new Date(inicio);
        while (fin.toLocaleDateString('en-US', { weekday: 'long' }) !== nombreDiaCorte) { fin.setDate(fin.getDate() + 1); }
        sendJSON(res, { success: true, inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0], dia_corte: diaCorte, dia_corte_nombre: diasMap[diaCorte] });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== ESTADÍSTICAS ==========
async function handleEstadisticas(req, res) {
    try {
        const response = { success: true, cuentas: { pagar: 0, cobrar: 0 }, egresos: { total: 0, por_categoria: [] }, trabajadores: { total_deuda: 0, lista_deudas: [] }, produccion: { dias: ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'], diaria: [0,0,0,0,0,0,0], por_producto: [] } };
        const cuentasPagar = await query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_pagar WHERE estado = 'pendiente'");
        response.cuentas.pagar = parseFloat(cuentasPagar[0].total);
        const cuentasCobrar = await query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_cobrar WHERE estado = 'pendiente'");
        response.cuentas.cobrar = parseFloat(cuentasCobrar[0].total);
        const egresosTotal = await query("SELECT IFNULL(SUM(monto), 0) as total FROM egresos");
        response.egresos.total = parseFloat(egresosTotal[0].total);
        const egresosCat = await query("SELECT IFNULL(categoria, 'Sin categoría') as categoria, SUM(monto) as total FROM egresos GROUP BY categoria");
        response.egresos.por_categoria = egresosCat.map(row => ({ categoria: row.categoria, total: parseFloat(row.total) }));
        const deudasTrabajadores = await query(`SELECT t.id, t.nombre, IFNULL(SUM(p.monto), 0) as deuda FROM trabajadores t LEFT JOIN prestamos p ON t.id = p.trabajador_id AND p.estado = 'pendiente' WHERE t.activo = 1 GROUP BY t.id HAVING deuda > 0`);
        let totalDeuda = 0;
        response.trabajadores.lista_deudas = deudasTrabajadores.map(row => { totalDeuda += parseFloat(row.deuda); return { nombre: row.nombre, deuda: parseFloat(row.deuda) }; });
        response.trabajadores.total_deuda = totalDeuda;
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        let diasARetroceder = (diaSemana + 4) % 7;
        let inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diasARetroceder);
        const fechaInicio = inicioSemana.toISOString().split('T')[0];
        const fechaFin = new Date(inicioSemana);
        fechaFin.setDate(inicioSemana.getDate() + 6);
        const fechaFinStr = fechaFin.toISOString().split('T')[0];
        const produccionDiaria = await query("SELECT fecha, IFNULL(SUM(peso_kg), 0) as total FROM produccion_diaria WHERE fecha BETWEEN ? AND ? GROUP BY fecha", [fechaInicio, fechaFinStr]);
        produccionDiaria.forEach(row => { const fechaObj = new Date(row.fecha); let idx = (fechaObj.getDay() + 3) % 7; if (idx >= 0 && idx < 7) response.produccion.diaria[idx] = parseFloat(row.total); });
        const produccionProductos = await query("SELECT tipo_producto, IFNULL(SUM(peso_kg), 0) as total_kg, IFNULL(SUM(piezas), 0) as total_piezas FROM produccion_diaria WHERE fecha BETWEEN ? AND ? GROUP BY tipo_producto", [fechaInicio, fechaFinStr]);
        for (const row of produccionProductos) {
            const productoInfo = await query("SELECT es_leche FROM productos WHERE nombre = ?", [row.tipo_producto]);
            const esLeche = productoInfo.length > 0 ? productoInfo[0].es_leche : 0;
            const nombre = row.tipo_producto.replace(/_/g, ' ');
            const kg = parseFloat(row.total_kg);
            const piezas = parseInt(row.total_piezas);
            if (kg > 0) response.produccion.por_producto.push({ nombre, total: kg, unidad: esLeche === 1 ? 'litros' : 'kg' });
            if (piezas > 0) response.produccion.por_producto.push({ nombre: nombre + ' (piezas)', total: piezas, unidad: 'pz' });
        }
        sendJSON(res, response);
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

// ========== OTRAS FUNCIONES ==========
async function handleObtenerDetallePago(req, res) {
    try {
        const pago_id = parseInt(req.query.id || '0');
        if (!pago_id) { sendJSON(res, { success: false, error: 'ID de pago requerido' }); return; }
        const pagos = await query(`SELECT n.*, t.nombre as trabajador_nombre, t.cedula, t.cargo, t.sucursal_id, t.dia_corte, s.nombre as sucursal_nombre FROM nomina_pagos n JOIN trabajadores t ON n.trabajador_id = t.id LEFT JOIN sucursales s ON t.sucursal_id = s.id WHERE n.id = ?`, [pago_id]);
        if (pagos.length === 0) { sendJSON(res, { success: false, error: 'Pago no encontrado' }); return; }
        sendJSON(res, { success: true, pago: pagos[0] });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleVerificarRegistros(req, res) {
    try {
        const { tipo, nombre } = req.query;
        let sql;
        if (tipo === 'sucursal') sql = "SELECT COUNT(*) as total FROM produccion_diaria WHERE sucursal = ?";
        else if (tipo === 'producto') sql = "SELECT COUNT(*) as total FROM produccion_diaria WHERE tipo_producto = ?";
        else { sendJSON(res, { success: false, error: 'Tipo no válido' }); return; }
        const result = await query(sql, [nombre]);
        sendJSON(res, { success: true, total: result[0].total });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleExportarRegistros(req, res) {
    try {
        const { tipo, nombre } = req.query;
        if (tipo !== 'sucursal') { sendJSON(res, { success: false, error: 'Tipo no soportado' }); return; }
        const registros = await query("SELECT * FROM produccion_diaria WHERE sucursal = ? ORDER BY fecha", [nombre]);
        const filename = `export_sucursal_${nombre}_${new Date().toISOString().split('T')[0]}.csv`;
        const columns = ['id', 'fecha', 'sucursal', 'tipo_producto', 'peso_kg', 'piezas', 'created_at'];
        let csv = columns.join(',') + '\n';
        for (const row of registros) {
            const values = columns.map(col => { let val = row[col]; if (val === null || val === undefined) return ''; if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) val = `"${val.replace(/"/g, '""')}"`; return val; });
            csv += values.join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}

async function handleObtenerTasaDolar(req, res) {
    try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares');
        if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0].promedio) { sendJSON(res, { success: true, tasa: parseFloat(data[0].promedio), fuente: 'dolarapi.com', fecha: new Date().toISOString() }); return; }
        }
        sendJSON(res, { success: true, tasa: 400.00, fuente: 'manual (fallback)', fecha: new Date().toISOString() });
    } catch (error) { sendJSON(res, { success: true, tasa: 400.00, fuente: 'manual (fallback)', fecha: new Date().toISOString() }); }
}

async function handleObtenerResumenSemanalProveedor(req, res) {
    try {
        const proveedor_id = parseInt(req.query.proveedor_id || '0');
        const inicio = req.query.inicio;
        const fin = req.query.fin;
        if (!proveedor_id || !inicio || !fin) { sendJSON(res, { success: false, error: 'Faltan parámetros' }); return; }
        const resumen = await query(`SELECT COALESCE(SUM(cantidad_litros), 0) as total_leche, COALESCE(SUM(total_costo), 0) as total_costo FROM materia_prima WHERE proveedor_id = ? AND fecha BETWEEN ? AND ? AND pagado = 0`, [proveedor_id, inicio, fin]);
        sendJSON(res, { success: true, total_leche: parseFloat(resumen[0].total_leche), total_costo: parseFloat(resumen[0].total_costo) });
    } catch (error) { sendJSON(res, { success: false, error: error.message }, 500); }
}
