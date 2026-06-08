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
        obtenerMateriaPrima($conn);
        break;
    case 'guardar':
        guardarMateriaPrima($conn);
        break;
    case 'eliminar':
        eliminarMateriaPrima($conn);
        break;
    case 'obtener_proveedores':
        obtenerProveedores($conn);
        break;
    case 'guardar_proveedor':
        guardarProveedor($conn);
        break;
    case 'eliminar_proveedor':
        eliminarProveedor($conn);
        break;
	case 'obtener_adelantos':
        obtenerAdelantos($conn);
        break;
    case 'guardar_adelanto':
        guardarAdelanto($conn);
        break;
    case 'eliminar_adelanto':
        eliminarAdelanto($conn);
        break;
    case 'obtener_deuda_adelantos':
        obtenerDeudaAdelantos($conn);
        break;
    case 'actualizar_adelanto':
        actualizarAdelanto($conn);
        break;
	case 'obtener_proveedor':
        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID de proveedor requerido']);
            exit;
        }
        $query = "SELECT * FROM proveedores WHERE id = $id AND activo = 1";
        $result = $conn->query($query);
        if ($result && $result->num_rows > 0) {
            $proveedor = $result->fetch_assoc();
            echo json_encode(['success' => true, 'proveedor' => $proveedor]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Proveedor no encontrado']);
        }
        break;
        
    case 'obtener_recepciones_por_periodo':
        $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
        $inicio = $_GET['inicio'] ?? '';
        $fin = $_GET['fin'] ?? '';
        if (!$proveedor_id || !$inicio || !$fin) {
            echo json_encode(['success' => false, 'error' => 'Faltan parámetros']);
            exit;
        }
        $query = "SELECT * FROM materia_prima 
                  WHERE proveedor_id = $proveedor_id 
                  AND fecha BETWEEN '$inicio' AND '$fin'
                  AND pagado = 1
                  ORDER BY fecha ASC";
        $result = $conn->query($query);
        $recepciones = [];
        while ($row = $result->fetch_assoc()) {
            if (empty($row['total_costo']) || $row['total_costo'] == 0) {
                $row['total_costo'] = $row['cantidad_litros'] * $row['costo_por_litro'];
            }
            $recepciones[] = $row;
        }
        echo json_encode(['success' => true, 'recepciones' => $recepciones]);
        break;

    case 'actualizar_proveedor':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = intval($input['id'] ?? 0);
        $nombre = $conn->real_escape_string($input['nombre'] ?? '');
        $contacto = $conn->real_escape_string($input['contacto'] ?? '');
        $telefono = $conn->real_escape_string($input['telefono'] ?? '');
        $email = $conn->real_escape_string($input['email'] ?? '');
        $direccion = $conn->real_escape_string($input['direccion'] ?? '');
        $dia_corte = isset($input['dia_corte']) ? intval($input['dia_corte']) : 2;

        if (!$id || !$nombre) {
            echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
            exit;
        }

        $query = "UPDATE proveedores SET 
                  nombre = '$nombre', 
                  contacto = '$contacto', 
                  telefono = '$telefono', 
                  email = '$email', 
                  direccion = '$direccion',
                  dia_corte = $dia_corte
                  WHERE id = $id";
        if ($conn->query($query)) {
            echo json_encode(['success' => true, 'message' => 'Proveedor actualizado']);
        } else {
            echo json_encode(['success' => false, 'error' => $conn->error]);
        }
        break;

    case 'obtener_detalle_recepcion':
        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'ID de recepción requerido']);
            exit;
        }
        $query = "SELECT mp.*, p.contacto, p.telefono, p.email, p.direccion, p.dia_corte
                  FROM materia_prima mp
                  LEFT JOIN proveedores p ON mp.proveedor_id = p.id
                  WHERE mp.id = $id";
        $result = $conn->query($query);
        if ($result && $result->num_rows > 0) {
            $recepcion = $result->fetch_assoc();
            echo json_encode(['success' => true, 'recepcion' => $recepcion]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Recepción no encontrada']);
        }
        break;
        
    case 'obtener_resumen_semanal':
        $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
        $inicio = $_GET['inicio'] ?? '';
        $fin = $_GET['fin'] ?? '';
        if (!$proveedor_id || !$inicio || !$fin) {
            echo json_encode(['success' => false, 'error' => 'Faltan parámetros']);
            exit;
        }
        $query = "SELECT 
                    COALESCE(SUM(cantidad_litros), 0) as total_leche,
                    COALESCE(SUM(total_costo), 0) as total_costo
                  FROM materia_prima 
                  WHERE proveedor_id = $proveedor_id 
                  AND fecha BETWEEN '$inicio' AND '$fin'
                  AND (pagado = 0 OR pagado IS NULL)";
        $result = $conn->query($query);
        if (!$result) {
            echo json_encode(['success' => false, 'error' => $conn->error]);
            exit;
        }
        $row = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'total_leche' => floatval($row['total_leche']),
            'total_costo' => floatval($row['total_costo'])
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

function obtenerMateriaPrima($conn) {
    $modo = $_GET['modo'] ?? 'tabla';
    $proveedor_id = isset($_GET['proveedor_id']) && $_GET['proveedor_id'] !== '' ? intval($_GET['proveedor_id']) : null;
    
    if ($modo === 'tabla') {
        $whereProveedor = "";
        if ($proveedor_id !== null && $proveedor_id > 0) {
            $whereProveedor = "AND mp.proveedor_id = $proveedor_id";
        }
        
        // ========== 1. OBTENER RECEPCIONES NO PAGADAS (DEUDAS PENDIENTES) ==========
        $queryNoPagadas = "SELECT mp.*, 
                                  p.nombre as proveedor_nombre, 
                                  p.contacto, 
                                  p.telefono,
                                  (mp.cantidad_litros * mp.costo_por_litro) as total_calculado,
                                  0 as es_cabecera
                           FROM materia_prima mp
                           LEFT JOIN proveedores p ON mp.proveedor_id = p.id
                           WHERE (mp.pagado = 0 OR mp.pagado IS NULL) $whereProveedor
                           ORDER BY mp.fecha DESC, mp.hora DESC";
        
        $resultNoPagadas = $conn->query($queryNoPagadas);
        
        if (!$resultNoPagadas) {
            echo json_encode(['success' => false, 'error' => 'Error en consulta: ' . $conn->error]);
            return;
        }
        
        $datos = [];
        
        // Agregar recepciones no pagadas
        while ($row = $resultNoPagadas->fetch_assoc()) {
            if (empty($row['total_costo']) || $row['total_costo'] == 0) {
                $row['total_costo'] = $row['total_calculado'];
            }
            unset($row['total_calculado']);
            $row['es_cabecera'] = false;
            $datos[] = $row;
        }
        
        // ========== 2. OBTENER PAGOS REALIZADOS (AGRUPADOS POR PAGO) ==========
        $wherePagos = "";
        if ($proveedor_id !== null && $proveedor_id > 0) {
            $wherePagos = "AND pp.proveedor_id = $proveedor_id";
        }
        
        $queryPagos = "SELECT pp.*, p.nombre as proveedor_nombre 
                       FROM pagos_proveedores pp
                       LEFT JOIN proveedores p ON pp.proveedor_id = p.id
                       WHERE 1=1 $wherePagos
                       ORDER BY pp.fecha_pago DESC";
        
        $resultPagos = $conn->query($queryPagos);
        
        if ($resultPagos && $resultPagos->num_rows > 0) {
            while ($pago = $resultPagos->fetch_assoc()) {
                // Obtener las recepciones que pertenecen a este pago
                $queryRecepciones = "SELECT mp.*, p.contacto, p.telefono,
                                            (mp.cantidad_litros * mp.costo_por_litro) as total_calculado
                                     FROM materia_prima mp
                                     LEFT JOIN proveedores p ON mp.proveedor_id = p.id
                                     WHERE mp.proveedor_id = {$pago['proveedor_id']}
                                     AND mp.fecha BETWEEN '{$pago['semana_inicio']}' AND '{$pago['semana_fin']}'
                                     AND mp.pagado = 1
                                     ORDER BY mp.fecha ASC, mp.hora ASC";
                
                $resultRecepciones = $conn->query($queryRecepciones);
                $recepciones = [];
                $totalLitros = 0;
                $totalCosto = 0;
                
                while ($recepcion = $resultRecepciones->fetch_assoc()) {
                    if (empty($recepcion['total_costo']) || $recepcion['total_costo'] == 0) {
                        $recepcion['total_costo'] = $recepcion['total_calculado'];
                    }
                    unset($recepcion['total_calculado']);
                    $totalLitros += $recepcion['cantidad_litros'];
                    $totalCosto += $recepcion['total_costo'];
                    $recepciones[] = $recepcion;
                }
                
                if (count($recepciones) > 0) {
                    $datos[] = [
                        'es_cabecera' => true,
                        'pago_id' => $pago['id'],
                        'proveedor_id' => $pago['proveedor_id'],
                        'proveedor_nombre' => $pago['proveedor_nombre'],
                        'semana_inicio' => $pago['semana_inicio'],
                        'semana_fin' => $pago['semana_fin'],
                        'total_litros' => $totalLitros,
                        'total_costo' => $pago['costo_total'],
                        'monto_pagado' => $pago['monto_pagado'],
                        'deducciones' => $pago['deducciones'],
                        'fecha_pago' => $pago['fecha_pago'],
                        'metodo_pago' => $pago['metodo_pago'],
                        'observaciones' => $pago['observaciones'],
                        'recepciones' => $recepciones
                    ];
                }
            }
        }
        
        // Ordenar: primero las no pagadas (deudas), luego los pagos agrupados (más recientes primero)
        usort($datos, function($a, $b) {
            if ($a['es_cabecera'] != $b['es_cabecera']) {
                return $a['es_cabecera'] ? 1 : -1;
            }
            if (!$a['es_cabecera'] && !$b['es_cabecera']) {
                return strtotime($b['fecha']) - strtotime($a['fecha']);
            }
            if ($a['es_cabecera'] && $b['es_cabecera']) {
                return strtotime($b['fecha_pago']) - strtotime($a['fecha_pago']);
            }
            return 0;
        });
        
        echo json_encode(['success' => true, 'datos' => $datos]);
    }
}

function guardarMateriaPrima($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fecha = $conn->real_escape_string($input['fecha']);
    $hora = $conn->real_escape_string($input['hora'] ?? date('H:i:s'));
    $proveedor_id = intval($input['proveedor_id']);
    $proveedor_nombre = $conn->real_escape_string($input['proveedor_nombre']);
    $tipo_leche = $conn->real_escape_string($input['tipo_leche'] ?? 'normal');
    $cantidad_litros = floatval($input['cantidad_litros']);
    $costo_por_litro = floatval($input['costo_por_litro'] ?? 0);
    $costo_total = $cantidad_litros * $costo_por_litro;
    $guardar_en_cuentas = isset($input['guardar_en_cuentas']) ? intval($input['guardar_en_cuentas']) : 0;
    $pago_con_producto = isset($input['pago_con_producto']) ? intval($input['pago_con_producto']) : 0;
    $producto_entregado = isset($input['producto_entregado']) && !empty($input['producto_entregado']) 
                          ? $conn->real_escape_string($input['producto_entregado']) : null;
    $cantidad_producto = isset($input['cantidad_producto']) && !empty($input['cantidad_producto']) 
                         ? floatval($input['cantidad_producto']) : null;
    $observaciones = isset($input['observaciones']) && !empty($input['observaciones']) 
                    ? $conn->real_escape_string($input['observaciones']) : null;
    
    // Insertar la recepción
    $query = "INSERT INTO materia_prima (fecha, hora, proveedor_id, proveedor_nombre, tipo_leche,
              cantidad_litros, costo_por_litro, total_costo, guardar_en_cuentas, 
              pago_con_producto, producto_entregado, cantidad_producto, observaciones) 
              VALUES ('$fecha', '$hora', $proveedor_id, '$proveedor_nombre', '$tipo_leche',
              $cantidad_litros, $costo_por_litro, $costo_total, $guardar_en_cuentas, 
              $pago_con_producto, " . ($producto_entregado ? "'$producto_entregado'" : "NULL") . ", 
              " . ($cantidad_producto ? $cantidad_producto : "NULL") . ", 
              " . ($observaciones ? "'$observaciones'" : "NULL") . ")";
    
    if ($conn->query($query)) {
        $id = $conn->insert_id;
        echo json_encode(['success' => true, 'message' => 'Registro guardado', 'id' => $id]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarMateriaPrima($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    $query = "DELETE FROM materia_prima WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Registro eliminado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function obtenerProveedores($conn) {
    $query = "SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre";
    $result = $conn->query($query);
    $proveedores = [];
    while ($row = $result->fetch_assoc()) {
        $proveedores[] = $row;
    }
    echo json_encode(['success' => true, 'proveedores' => $proveedores]);
}

function guardarProveedor($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = $conn->real_escape_string($input['nombre']);
    $contacto = $conn->real_escape_string($input['contacto'] ?? '');
    $telefono = $conn->real_escape_string($input['telefono'] ?? '');
    $email = $conn->real_escape_string($input['email'] ?? '');
    $direccion = $conn->real_escape_string($input['direccion'] ?? '');
    $dia_corte = isset($input['dia_corte']) ? intval($input['dia_corte']) : 2;
    
    $query = "INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, dia_corte) 
              VALUES ('$nombre', '$contacto', '$telefono', '$email', '$direccion', $dia_corte)";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Proveedor agregado', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarProveedor($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    $query = "UPDATE proveedores SET activo = 0 WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Proveedor eliminado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

// ========== FUNCIONES PARA ADELANTOS DE PROVEEDORES ==========

function obtenerAdelantos($conn) {
    $proveedor_id = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : 0;
    
    $where = "";
    if ($proveedor_id > 0) {
        $where = "WHERE proveedor_id = $proveedor_id";
    }
    
    $query = "SELECT a.*, p.nombre as proveedor_nombre 
              FROM adelantos_proveedores a
              LEFT JOIN proveedores p ON a.proveedor_id = p.id
              $where
              ORDER BY a.fecha DESC";
    
    $result = $conn->query($query);
    $adelantos = [];
    while ($row = $result->fetch_assoc()) {
        $adelantos[] = $row;
    }
    echo json_encode(['success' => true, 'adelantos' => $adelantos]);
}

function obtenerDeudaAdelantos($conn) {
    $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
    if (!$proveedor_id) {
        echo json_encode(['success' => false, 'error' => 'ID de proveedor requerido']);
        return;
    }
    
    $query = "SELECT COALESCE(SUM(monto), 0) as deuda 
              FROM adelantos_proveedores 
              WHERE proveedor_id = $proveedor_id AND estado = 'pendiente'";
    $result = $conn->query($query);
    $deuda = 0;
    if ($result && $row = $result->fetch_assoc()) {
        $deuda = floatval($row['deuda']);
    }
    
    echo json_encode(['success' => true, 'deuda' => $deuda]);
}

function guardarAdelanto($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $proveedor_id = intval($input['proveedor_id']);
    $monto = floatval($input['monto']);
    $fecha = $conn->real_escape_string($input['fecha']);
    $descripcion = $conn->real_escape_string($input['descripcion'] ?? '');
    $metodo_pago = $conn->real_escape_string($input['metodo_pago'] ?? 'efectivo');
    $referencia = $conn->real_escape_string($input['referencia'] ?? '');
    
    $query = "INSERT INTO adelantos_proveedores (proveedor_id, monto, fecha, descripcion, metodo_pago, referencia, estado) 
              VALUES ($proveedor_id, $monto, '$fecha', '$descripcion', '$metodo_pago', '$referencia', 'pendiente')";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Adelanto registrado', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarAdelanto($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    // Verificar si el adelanto ya fue aplicado a algún pago
    $checkQuery = "SELECT id FROM pagos_proveedores WHERE adelantos_deducidos LIKE '%\"$id\"%' LIMIT 1";
    $checkResult = $conn->query($checkQuery);
    
    if ($checkResult && $checkResult->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'No se puede eliminar porque este adelanto ya fue aplicado en un pago']);
        return;
    }
    
    $query = "DELETE FROM adelantos_proveedores WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Adelanto eliminado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function actualizarAdelanto($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    $monto = floatval($input['monto']);
    $fecha = $conn->real_escape_string($input['fecha']);
    $descripcion = $conn->real_escape_string($input['descripcion'] ?? '');
    $metodo_pago = $conn->real_escape_string($input['metodo_pago'] ?? 'efectivo');
    $referencia = $conn->real_escape_string($input['referencia'] ?? '');
    
    $query = "UPDATE adelantos_proveedores SET 
              monto = $monto, 
              fecha = '$fecha', 
              descripcion = '$descripcion',
              metodo_pago = '$metodo_pago',
              referencia = '$referencia'
              WHERE id = $id";
    
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Adelanto actualizado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

?>