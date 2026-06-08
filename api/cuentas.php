<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ========== ACCIONES QUE NO REQUIEREN JSON INPUT ==========
if ($action === 'obtener_deudas_cliente') {
    $cliente_id = isset($_GET['cliente_id']) ? intval($_GET['cliente_id']) : 0;
    
    if ($cliente_id > 0) {
        $sql = "SELECT cc.*, v.fecha as fecha_venta 
                FROM cuentas_cobrar cc
                JOIN ventas v ON cc.venta_id = v.id
                WHERE v.cliente_id = $cliente_id AND cc.estado = 'pendiente'
                ORDER BY cc.fecha_vencimiento ASC";
        $result = $conn->query($sql);
        
        $deudas = [];
        while ($row = $result->fetch_assoc()) {
            $monto_pendiente = $row['monto'] - ($row['monto_cobrado'] ?? 0);
            $row['monto_pendiente'] = $monto_pendiente;
            $deudas[] = $row;
        }
        
        echo json_encode(['success' => true, 'deudas' => $deudas]);
    } else {
        echo json_encode(['success' => false, 'error' => 'ID de cliente inválido']);
    }
    exit;
}

// ========== NUEVA ACCIÓN PARA OBTENER CUENTAS PENDIENTES ==========
// ========== NUEVA ACCIÓN PARA OBTENER CUENTAS PENDIENTES ==========
if ($action === 'obtener_cobrar_pendientes') {
    $sql = "SELECT cc.*, 
                   (cc.monto - COALESCE(cc.monto_cobrado, 0)) as monto_pendiente,
                   CASE 
                       WHEN v.id IS NOT NULL THEN c.nombre
                       ELSE cc.descripcion
                   END as cliente_nombre
            FROM cuentas_cobrar cc
            LEFT JOIN ventas v ON cc.venta_id = v.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE cc.estado = 'pendiente' 
               OR (cc.monto - COALESCE(cc.monto_cobrado, 0)) > 0.01
            ORDER BY cliente_nombre ASC";

    $result = $conn->query($sql);
    
    if (!$result) {
        echo json_encode(['success' => false, 'error' => 'Error en consulta: ' . $conn->error]);
        exit;
    }
    
    $cuentas = [];
    while ($row = $result->fetch_assoc()) {
        $monto_pendiente = $row['monto'] - ($row['monto_cobrado'] ?? 0);
        if ($monto_pendiente > 0.01) {
            $row['monto_pendiente'] = $monto_pendiente;
            $cuentas[] = $row;
        }
    }

    echo json_encode(['success' => true, 'datos' => $cuentas]);
    exit;
}

// ========== PROCESAR INPUT JSON PARA OTRAS ACCIONES ==========
if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch($action) {
    case 'obtener_pagar':
        obtenerPagar($conn);
        break;
    case 'obtener_cobrar':
        obtenerCobrar($conn);
        break;
    case 'guardar_pagar':
        guardarPagar($conn);
        break;
    case 'guardar_cobrar':
        guardarCobrar($conn);
        break;
    case 'cambiar_estado_pagar':
        cambiarEstadoPagar($conn);
        break;
    case 'cambiar_estado_cobrar':
        cambiarEstadoCobrar($conn);
        break;
    case 'eliminar_pagar':
        eliminarPagar($conn);
        break;
    case 'eliminar_cobrar':
        eliminarCobrar($conn);
        break;
    case 'registrar_pago_parcial':
        registrarPagoParcial($conn);
        break;
    case 'eliminar_pago_parcial':
        eliminarPagoParcial($conn);
        break;
    case 'obtener_historial_pagos':
        obtenerHistorialPagos($conn);
        break;
    case 'obtener_detalle_cobrar':
        obtenerDetalleCobrar($conn);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

$conn->close();

// ========== FUNCIONES ==========

function obtenerPagar($conn) {
    $query = "SELECT cp.*, 
                     cp.monto as monto_original,
                     COALESCE(cp.monto_pagado, 0) as monto_pagado,
                     (cp.monto - COALESCE(cp.monto_pagado, 0)) as monto_pendiente,
                     CASE 
                         WHEN cp.descripcion LIKE '% litros%' THEN 'proveedor'
                         ELSE 'normal'
                     END as tipo_cuenta
              FROM cuentas_pagar cp 
              WHERE cp.oculto = 0 OR cp.oculto IS NULL
              ORDER BY cp.fecha_inicio DESC, cp.id DESC";
    
    $result = $conn->query($query);
    $datos = [];
    
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    
    echo json_encode(['success' => true, 'datos' => $datos]);
}

function obtenerCobrar($conn) {
    $query = "SELECT *, (monto - COALESCE(monto_cobrado, 0)) as monto_pendiente,
                     COALESCE(monto_cobrado, 0) as monto_pagado
              FROM cuentas_cobrar 
              ORDER BY id DESC";
    $result = $conn->query($query);
    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    echo json_encode(['success' => true, 'datos' => $datos]);
}

function guardarPagar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $descripcion = $conn->real_escape_string($input['descripcion']);
    $monto = floatval($input['monto']);
    $fecha_inicio = $conn->real_escape_string($input['fecha_inicio']);
    $fecha_vencimiento = $conn->real_escape_string($input['fecha_vencimiento']);
    
    $query = "INSERT INTO cuentas_pagar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado, oculto) 
              VALUES ('$descripcion', $monto, $monto, '$fecha_inicio', '$fecha_vencimiento', 'pendiente', 0)";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Cuenta guardada']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function guardarCobrar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $descripcion = $conn->real_escape_string($input['descripcion']);
    $monto = floatval($input['monto']);
    $fecha_inicio = $conn->real_escape_string($input['fecha_inicio']);
    $fecha_vencimiento = $conn->real_escape_string($input['fecha_vencimiento']);
    
    $query = "INSERT INTO cuentas_cobrar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado) 
              VALUES ('$descripcion', $monto, $monto, '$fecha_inicio', '$fecha_vencimiento', 'pendiente')";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Cuenta guardada']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function cambiarEstadoPagar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    $query = "UPDATE cuentas_pagar SET estado = 'pagado', monto_pagado = monto WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function cambiarEstadoCobrar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    $query = "UPDATE cuentas_cobrar SET estado = 'cobrado', monto_cobrado = monto WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarPagar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    $query = "DELETE FROM cuentas_pagar WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarCobrar($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    $query = "DELETE FROM cuentas_cobrar WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function registrarPagoParcial($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = intval($input['id']);
    $tipo = $input['tipo'];
    $monto_pago = floatval($input['monto_pago']);
    $metodo_pago = $conn->real_escape_string($input['metodo_pago']);
    $referencia = $conn->real_escape_string($input['referencia'] ?? '');
    $observaciones = $conn->real_escape_string($input['observaciones'] ?? '');
    $fecha = date('Y-m-d');
    
    if ($tipo === 'pagar') {
        $table = 'cuentas_pagar';
        $monto_pagado_col = 'monto_pagado';
    } else {
        $table = 'cuentas_cobrar';
        $monto_pagado_col = 'monto_cobrado';
    }
    
    $conn->begin_transaction();
    
    try {
        $query = "SELECT monto, COALESCE($monto_pagado_col, 0) as pagado, estado FROM $table WHERE id = $id";
        $result = $conn->query($query);
        $row = $result->fetch_assoc();
        
        $monto_total = floatval($row['monto']);
        $monto_actual_pagado = floatval($row['pagado']);
        $nuevo_pagado = $monto_actual_pagado + $monto_pago;
        
        $nuevo_estado = $nuevo_pagado >= $monto_total ? ($tipo === 'pagar' ? 'pagado' : 'cobrado') : 'pendiente';
        
        $query = "UPDATE $table SET $monto_pagado_col = $nuevo_pagado, estado = '$nuevo_estado' WHERE id = $id";
        $conn->query($query);
        
        $query = "INSERT INTO pagos_cuentas (cuenta_id, tipo_cuenta, monto, fecha, metodo_pago, referencia, observaciones) 
                  VALUES ($id, '$tipo', $monto_pago, '$fecha', '$metodo_pago', '$referencia', '$observaciones')";
        $conn->query($query);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago registrado correctamente']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function eliminarPagoParcial($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $pago_id = intval($input['pago_id']);
    $cuenta_id = intval($input['cuenta_id']);
    $tipo = $input['tipo'];
    
    if ($tipo === 'pagar') {
        $table = 'cuentas_pagar';
        $monto_pagado_col = 'monto_pagado';
    } else {
        $table = 'cuentas_cobrar';
        $monto_pagado_col = 'monto_cobrado';
    }
    
    $conn->begin_transaction();
    
    try {
        $pagoQuery = "SELECT * FROM pagos_cuentas WHERE id = $pago_id AND cuenta_id = $cuenta_id AND tipo_cuenta = '$tipo'";
        $pagoResult = $conn->query($pagoQuery);
        
        if (!$pagoResult || $pagoResult->num_rows === 0) {
            throw new Exception('Pago no encontrado');
        }
        
        $pago = $pagoResult->fetch_assoc();
        $monto_a_restar = floatval($pago['monto']);
        
        $cuentaQuery = "SELECT monto, COALESCE($monto_pagado_col, 0) as pagado FROM $table WHERE id = $cuenta_id";
        $cuentaResult = $conn->query($cuentaQuery);
        $cuenta = $cuentaResult->fetch_assoc();
        
        $monto_total = floatval($cuenta['monto']);
        $monto_pagado_actual = floatval($cuenta['pagado']);
        $nuevo_pagado = $monto_pagado_actual - $monto_a_restar;
        
        if ($nuevo_pagado <= 0) {
            $nuevo_estado = 'pendiente';
            $nuevo_pagado = 0;
        } else if ($nuevo_pagado >= $monto_total) {
            $nuevo_estado = ($tipo === 'pagar') ? 'pagado' : 'cobrado';
        } else {
            $nuevo_estado = 'pendiente';
        }
        
        $updateQuery = "UPDATE $table SET $monto_pagado_col = $nuevo_pagado, estado = '$nuevo_estado' WHERE id = $cuenta_id";
        $conn->query($updateQuery);
        
        $deleteQuery = "DELETE FROM pagos_cuentas WHERE id = $pago_id";
        $conn->query($deleteQuery);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago eliminado correctamente']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function obtenerHistorialPagos($conn) {
    $id = intval($_GET['id'] ?? 0);
    $tipo = $_GET['tipo'] ?? '';
    
    $query = "SELECT * FROM pagos_cuentas WHERE cuenta_id = $id AND tipo_cuenta = '$tipo' ORDER BY fecha DESC";
    $result = $conn->query($query);
    $pagos = [];
    while ($row = $result->fetch_assoc()) {
        $pagos[] = $row;
    }
    
    echo json_encode(['success' => true, 'pagos' => $pagos]);
}

function obtenerDetalleCobrar($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        echo json_encode(['success' => false, 'error' => 'ID inválido']);
        return;
    }
    
    $query = "SELECT c.*, 
                     c.monto as monto_original,
                     COALESCE(c.monto_cobrado, 0) as monto_cobrado,
                     (c.monto - COALESCE(c.monto_cobrado, 0)) as monto_pendiente
              FROM cuentas_cobrar c 
              WHERE c.id = $id";
    
    $result = $conn->query($query);
    
    if (!$result || $result->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Cuenta no encontrada']);
        return;
    }
    
    $cuenta = $result->fetch_assoc();
    
    // Inicializar datos del cliente
    $cuenta['cliente_nombre'] = '';
    $cuenta['rif'] = '';
    $cuenta['telefono'] = '';
    $cuenta['direccion'] = '';
    $cuenta['contacto'] = '';
    $cuenta['email'] = '';
    
    // Obtener cliente a través de la venta
    if (!empty($cuenta['venta_id']) && $cuenta['venta_id'] > 0) {
        $ventaQuery = "SELECT c.nombre as cliente_nombre, c.rif, c.telefono, c.direccion, c.email, c.contacto 
                       FROM ventas v
                       JOIN clientes c ON v.cliente_id = c.id
                       WHERE v.id = " . intval($cuenta['venta_id']);
        $ventaResult = $conn->query($ventaQuery);
        if ($ventaResult && $ventaResult->num_rows > 0) {
            $venta = $ventaResult->fetch_assoc();
            $cuenta['cliente_nombre'] = $venta['cliente_nombre'] ?? '';
            $cuenta['rif'] = $venta['rif'] ?? '';
            $cuenta['telefono'] = $venta['telefono'] ?? '';
            $cuenta['direccion'] = $venta['direccion'] ?? '';
            $cuenta['contacto'] = $venta['contacto'] ?? '';
            $cuenta['email'] = $venta['email'] ?? '';
        }
    }
    
    // Fallback: extraer de descripción si no hay venta asociada
    if (empty($cuenta['cliente_nombre'])) {
        if (preg_match('/Cliente:\s*(.+?)(?:\s*\-|\s*$|$)/', $cuenta['descripcion'], $matches)) {
            $cuenta['cliente_nombre'] = trim($matches[1]);
        } else {
            $cuenta['cliente_nombre'] = 'Cliente no especificado';
        }
    }
    
    echo json_encode(['success' => true, 'cuenta' => $cuenta]);
}
?>