<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch($action) {
    case 'obtener':
        obtenerTrabajadores($conn);
        break;
    case 'guardar':
        guardarTrabajador($conn);
        break;
    case 'actualizar':
        actualizarTrabajador($conn);
        break;
    case 'eliminar':
        eliminarTrabajador($conn);
        break;
    case 'guardar_prestamo':
        guardarPrestamo($conn);
        break;
    case 'obtener_prestamos':
        obtenerPrestamos($conn);
        break;
    case 'obtener_uno':
        obtenerTrabajador($conn);
        break;
    case 'obtener_deuda':
        obtenerDeudaTrabajador($conn);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

function obtenerTrabajador($conn) {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'error' => 'ID requerido']);
        return;
    }
    
    // ✅ INCLUIR tipo_pago y sueldo_fijo en la consulta
    $query = "SELECT t.*, s.nombre as sucursal_nombre 
              FROM trabajadores t
              LEFT JOIN sucursales s ON t.sucursal_id = s.id
              WHERE t.id = $id AND t.activo = 1";
    $result = $conn->query($query);
    
    if ($result && $result->num_rows > 0) {
        $trabajador = $result->fetch_assoc();
        // Asegurar que los campos existan con valores por defecto
        $trabajador['tipo_pago'] = $trabajador['tipo_pago'] ?? 'produccion';
        $trabajador['sueldo_fijo'] = floatval($trabajador['sueldo_fijo'] ?? 0);
        echo json_encode(['success' => true, 'trabajador' => $trabajador]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Trabajador no encontrado']);
    }
}

function obtenerDeudaTrabajador($conn) {
    $trabajador_id = intval($_GET['trabajador_id'] ?? 0);
    if (!$trabajador_id) {
        echo json_encode(['success' => false, 'error' => 'ID de trabajador requerido']);
        return;
    }
    
    $query = "SELECT COALESCE(SUM(monto), 0) as deuda 
              FROM prestamos 
              WHERE trabajador_id = $trabajador_id AND estado = 'pendiente'";
    $result = $conn->query($query);
    $deuda = 0;
    if ($result && $row = $result->fetch_assoc()) {
        $deuda = floatval($row['deuda']);
    }
    
    echo json_encode(['success' => true, 'deuda' => $deuda]);
}

function obtenerPrestamos($conn) {
    $trabajador_id = intval($_GET['trabajador_id'] ?? 0);
    
    if (!$trabajador_id) {
        echo json_encode(['success' => false, 'error' => 'ID de trabajador requerido']);
        return;
    }
    
    $query = "SELECT id, monto, fecha, descripcion, estado 
              FROM prestamos 
              WHERE trabajador_id = $trabajador_id 
              ORDER BY fecha DESC";
    $result = $conn->query($query);
    
    $prestamos = [];
    $deuda_total = 0;
    
    while ($row = $result->fetch_assoc()) {
        $prestamos[] = $row;
        if ($row['estado'] === 'pendiente') {
            $deuda_total += floatval($row['monto']);
        }
    }
    
    echo json_encode([
        'success' => true, 
        'prestamos' => $prestamos,
        'deuda_total' => $deuda_total
    ]);
}

function obtenerTrabajadores($conn) {
    // ✅ INCLUIR tipo_pago y sueldo_fijo
    $query = "SELECT id, nombre, cedula, cargo, telefono, sucursal_id, dia_corte, 
                     COALESCE(tipo_pago, 'produccion') as tipo_pago, 
                     COALESCE(sueldo_fijo, 0) as sueldo_fijo,
                     (SELECT COALESCE(SUM(monto), 0) FROM prestamos WHERE trabajador_id = trabajadores.id AND estado = 'pendiente') as deuda_pendiente 
              FROM trabajadores 
              WHERE activo = 1 
              ORDER BY nombre";
    $result = $conn->query($query);
    
    if (!$result) {
        echo json_encode(['success' => false, 'error' => 'Error en consulta: ' . $conn->error]);
        return;
    }
    
    $trabajadores = [];
    while ($row = $result->fetch_assoc()) {
        $trabajadores[] = $row;
    }
    echo json_encode(['success' => true, 'trabajadores' => $trabajadores]);
}

function guardarTrabajador($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Verificar que se recibieron datos
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
        return;
    }
    
    $nombre = $conn->real_escape_string($input['nombre']);
    $cedula = $conn->real_escape_string($input['cedula']);
    $cargo = $conn->real_escape_string($input['cargo'] ?? '');
    $telefono = $conn->real_escape_string($input['telefono'] ?? '');
    
    // Manejar sucursal_id - CORREGIDO
    $sucursal_id = 'NULL';
    if (isset($input['sucursal_id']) && $input['sucursal_id'] !== '' && $input['sucursal_id'] !== null) {
        $sucursal_id = intval($input['sucursal_id']);
    }
    
    $dia_corte = isset($input['dia_corte']) ? intval($input['dia_corte']) : 2;
    $tipo_pago = $conn->real_escape_string($input['tipo_pago'] ?? 'produccion');
    $sueldo_fijo = isset($input['sueldo_fijo']) ? floatval($input['sueldo_fijo']) : 0;
    
    // Construir consulta
    $query = "INSERT INTO trabajadores (nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo) 
              VALUES ('$nombre', '$cedula', '$cargo', '$telefono', $sucursal_id, $dia_corte, '$tipo_pago', $sueldo_fijo)";
    
    // Ejecutar y depurar si hay error
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Trabajador agregado', 'id' => $conn->insert_id]);
    } else {
        // Devolver el error específico de MySQL
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function actualizarTrabajador($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id']);
    $nombre = $conn->real_escape_string($data['nombre']);
    $cedula = $conn->real_escape_string($data['cedula']);
    $cargo = $conn->real_escape_string($data['cargo'] ?? '');
    $telefono = $conn->real_escape_string($data['telefono'] ?? '');
    $sucursal_id = isset($data['sucursal_id']) && $data['sucursal_id'] !== '' ? intval($data['sucursal_id']) : 'NULL';
    $dia_corte = isset($data['dia_corte']) && $data['dia_corte'] !== '' ? intval($data['dia_corte']) : 2;
    $tipo_pago = $conn->real_escape_string($data['tipo_pago'] ?? 'produccion');
    $sueldo_fijo = isset($data['sueldo_fijo']) ? floatval($data['sueldo_fijo']) : 0;
    
    $sucursal_value = ($sucursal_id === 'NULL') ? 'NULL' : $sucursal_id;
    
    $query = "UPDATE trabajadores SET 
              nombre = '$nombre', 
              cedula = '$cedula', 
              cargo = '$cargo', 
              telefono = '$telefono', 
              sucursal_id = $sucursal_value, 
              dia_corte = $dia_corte,
              tipo_pago = '$tipo_pago',
              sueldo_fijo = $sueldo_fijo
              WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Trabajador actualizado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarTrabajador($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id']);
    
    $conn->begin_transaction();
    
    try {
        // 1. Verificar si tiene pagos en nómina
        $checkPagos = $conn->query("SELECT id FROM nomina_pagos WHERE trabajador_id = $id LIMIT 1");
        
        if ($checkPagos && $checkPagos->num_rows > 0) {
            // Opcional: marcar pagos como "trabajador_eliminado" o simplemente eliminarlos
            // Por ahora, eliminamos los pagos (o puedes usar eliminación lógica)
            $conn->query("DELETE FROM nomina_pagos WHERE trabajador_id = $id");
        }
        
        // 2. Eliminar préstamos asociados (o marcarlos como eliminados)
        $conn->query("DELETE FROM prestamos WHERE trabajador_id = $id");
        
        // 3. Eliminar o desactivar el trabajador
        // Eliminación lógica (recomendada para conservar historial)
        $query = "UPDATE trabajadores SET activo = 0 WHERE id = $id";
        $conn->query($query);
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Trabajador y sus registros asociados eliminados']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function guardarPrestamo($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $trabajador_id = intval($data['trabajador_id']);
    $monto = floatval($data['monto']);
    $fecha = $data['fecha'];
    $descripcion = $conn->real_escape_string($data['descripcion'] ?? '');
    
    $query = "INSERT INTO prestamos (trabajador_id, monto, fecha, descripcion) 
              VALUES ($trabajador_id, $monto, '$fecha', '$descripcion')";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Préstamo registrado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}
?>