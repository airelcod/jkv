<?php
// Limpiar cualquier salida previa
ob_clean();

header('Content-Type: application/json');
require_once 'config.php';

// Capturar cualquier error fatal o warning
function manejarError($errno, $errstr, $errfile, $errline) {
    echo json_encode(['success' => false, 'error' => "Error PHP: $errstr en $errfile línea $errline"]);
    exit;
}
set_error_handler("manejarError");

// Obtener acción
$action = isset($_GET['action']) ? $_GET['action'] : '';
if (empty($action)) {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
}
if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';
}

function obtenerSemanaActual() {
    $hoy = new DateTime();
    $diaSemana = (int)$hoy->format('N');
    $inicio = clone $hoy;
    
    if ($diaSemana == 3) {
        $inicio = $hoy;
    } elseif ($diaSemana == 4) { 
        $inicio->modify('-1 days');
    } elseif ($diaSemana == 5) { 
        $inicio->modify('-2 days');
    } elseif ($diaSemana == 6) { 
        $inicio->modify('-3 days');
    } elseif ($diaSemana == 7) { 
        $inicio->modify('-4 days');
    } elseif ($diaSemana == 1) { 
        $inicio->modify('-5 days');
    } elseif ($diaSemana == 2) { 
        $inicio->modify('-6 days');
    }
    return $inicio;
}

if ($action === 'obtener_tabla') {
    // Limpiar buffer antes de HTML
    ob_clean();
    header('Content-Type: text/html; charset=utf-8');
    
    $trabajador_id = isset($_GET['trabajador_id']) ? intval($_GET['trabajador_id']) : 0;
    $sucursal_id = isset($_GET['sucursal_id']) ? intval($_GET['sucursal_id']) : 0;
    
    $inicioSemana = obtenerSemanaActual();
    $fechaInicio = $inicioSemana->format('Y-m-d');
    $fechaFin = (clone $inicioSemana)->modify('+6 days')->format('Y-m-d');
    
    // Obtener productos activos
    $queryProductos = "SELECT nombre, es_leche, id FROM productos WHERE activo = 1 ORDER BY 
                       CASE WHEN es_leche = 1 THEN 0 ELSE 1 END, nombre";
    $resultProductos = $conn->query($queryProductos);
    $productos = [];
    $productosData = [];
    while ($row = $resultProductos->fetch_assoc()) {
        $productos[] = $row['nombre'];
        $productosData[$row['nombre']] = [
            'nombre' => $row['nombre'],
            'es_leche' => $row['es_leche'],
            'id' => $row['id']
        ];
    }
    
    // Construir consulta según filtros
    if ($trabajador_id > 0) {
        $query = "SELECT fecha, tipo_producto, peso_kg, piezas 
                  FROM produccion_diaria 
                  WHERE fecha BETWEEN '$fechaInicio' AND '$fechaFin' 
                  AND trabajador_id = $trabajador_id
                  ORDER BY fecha, tipo_producto";
    } elseif ($sucursal_id > 0) {
        $query = "SELECT p.fecha, p.tipo_producto, SUM(p.peso_kg) as peso_kg, SUM(p.piezas) as piezas 
                  FROM produccion_diaria p
                  JOIN trabajadores t ON p.trabajador_id = t.id
                  WHERE p.fecha BETWEEN '$fechaInicio' AND '$fechaFin' 
                  AND t.sucursal_id = $sucursal_id
                  GROUP BY p.fecha, p.tipo_producto
                  ORDER BY p.fecha, p.tipo_producto";
    } else {
        $query = "SELECT fecha, tipo_producto, SUM(peso_kg) as peso_kg, SUM(piezas) as piezas 
                  FROM produccion_diaria 
                  WHERE fecha BETWEEN '$fechaInicio' AND '$fechaFin'
                  GROUP BY fecha, tipo_producto
                  ORDER BY fecha, tipo_producto";
    }
    
    $result = $conn->query($query);
    
    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[$row['fecha']][$row['tipo_producto']] = [
            'peso' => $row['peso_kg'],
            'piezas' => $row['piezas']
        ];
    }
    
    $nombresDias = ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'];
    $fechas = [];
    for ($i = 0; $i < 7; $i++) {
        $fecha = clone $inicioSemana;
        $fecha->modify("+$i days");
        $fechas[] = $fecha;
    }
    $hoyStr = (new DateTime())->format('Y-m-d');
    
    $html = '<div style="overflow-x: auto; width: 100%; margin-top:12px">';
    $html .= '<table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(0,0,0,0.4); background: white;">';
    $html .= '<thead>';
    $html .= '<tr style="background: #278233; color: white;">';
    $html .= '<th style="padding: 8px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.4);">Fecha</th>';
    foreach ($productos as $producto) {
        $nombreFormateado = ucfirst(str_replace('_', ' ', $producto));
        $idProducto = $productosData[$producto]['id'];
        $html .= "<th style='position: relative; padding: 12px 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.4);'>
            <span style='cursor: pointer; text-decoration: underline; text-decoration-style: dotted;' onclick=\"verProduccionProducto('{$producto}')\">{$nombreFormateado}</span>
            <span class='delete-producto-th' data-producto='{$producto}' data-id='{$idProducto}' style='cursor: pointer; margin-left: 8px; font-size: 14px;' onclick=\"event.stopPropagation(); eliminarProductoTH('{$producto}', {$idProducto})\">×</span>
          </th>";
    }
    $html .= '</tr>';
    $html .= '</thead>';
    $html .= '<tbody>';
    
    foreach ($fechas as $index => $fecha) {
        $fechaStr = $fecha->format('Y-m-d');
        $fechaMostrar = $fecha->format('d/m/Y');
        $nombreDia = $nombresDias[$index];
        $esHoy = ($fechaStr === $hoyStr);
        $bgColor = $esHoy ? 'background-color: #fff3cd;' : '';
        
        $html .= "<tr style='{$bgColor} border-bottom: 1px solid rgba(0,0,0,0.05);'>";
        $html .= "<td style='padding: 10px 8px; vertical-align: top;'><strong>{$fechaMostrar}</strong><br><small>{$nombreDia}</small></td>";
        
        foreach ($productos as $producto) {
            $prod = isset($datos[$fechaStr][$producto]) ? $datos[$fechaStr][$producto] : null;
            $esLeche = $productosData[$producto]['es_leche'];
            
            $html .= "<td style='padding: 8px; text-align:center; white-space: nowrap;'>";

            if ($prod && (($prod['peso'] && $prod['peso'] > 0) || ($prod['piezas'] && $prod['piezas'] > 0))) {
                if ($esLeche) {
                    // Para la leche, también permitimos eliminar
                    $html .= "<div style='display: inline-block; padding: 3px; border-radius: 3px; cursor: pointer; justify-content:center' class='producto-leche' data-fecha='{$fechaStr}' data-producto='{$producto}' data-sucursal-id='{$sucursal_id}' data-tipo='leche' onclick='eliminarRegistroProduccion(this)'>🥛 " . number_format($prod['peso'], 2) . " L</div>";
                } else {
                    $html .= '<div style="display: flex; gap: 6px; align-items: center; flex-wrap: nowrap;justify-content:center;">';
                    if ($prod['peso'] && $prod['peso'] > 0) {
                        $html .= "<div style='display: inline-block; padding: 3px; border-right: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-peso' data-fecha='{$fechaStr}' data-producto='{$producto}' data-sucursal-id='{$sucursal_id}' data-tipo='peso' onclick='eliminarRegistroProduccion(this)'>⚖️ " . number_format($prod['peso'], 2) . " kg</div>";
                    }
                    if ($prod['piezas'] && $prod['piezas'] > 0) {
                        $html .= "<div style='display: inline-block; padding: 3px; border-left: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-piezas' data-fecha='{$fechaStr}' data-producto='{$producto}' data-sucursal-id='{$sucursal_id}' data-tipo='piezas' onclick='eliminarRegistroProduccion(this)'>📦 " . $prod['piezas'] . " pz</div>";
                    }
                    $html .= '</div>';
                }
            } else {
                $html .= '<span style="color:#ccc;">-</span>';
            }
            $html .= '</td>';
        }
        $html .= '</tr>';
    }
    $html .= '</tbody>';
    $html .= '</table>';
    $html .= '</div>';
    
    echo $html;

} elseif ($action === 'obtener_produccion_producto') {
    ob_clean();
    header('Content-Type: application/json');
    
    $producto = isset($_GET['producto']) ? $conn->real_escape_string($_GET['producto']) : '';
    $fecha_inicio = isset($_GET['fecha_inicio']) ? $conn->real_escape_string($_GET['fecha_inicio']) : '';
    $fecha_fin = isset($_GET['fecha_fin']) ? $conn->real_escape_string($_GET['fecha_fin']) : '';
    $sucursal_id = isset($_GET['sucursal_id']) ? intval($_GET['sucursal_id']) : 0;
    
    if (empty($producto)) {
        echo json_encode(['success' => false, 'error' => 'Producto no especificado']);
        exit;
    }
    
    // Si no hay fechas, mostrar últimos 30 días
    if (empty($fecha_inicio) && empty($fecha_fin)) {
        $fecha_fin = date('Y-m-d');
        $fecha_inicio = date('Y-m-d', strtotime('-30 days'));
    }
    
    // Construir consulta
    $query = "SELECT p.fecha, 
                     COALESCE(SUM(p.peso_kg), 0) as total_peso,
                     COALESCE(SUM(p.piezas), 0) as total_piezas,
                     t.nombre as trabajador_nombre,
                     t.id as trabajador_id,
                     s.nombre as sucursal_nombre
              FROM produccion_diaria p
              JOIN trabajadores t ON p.trabajador_id = t.id
              LEFT JOIN sucursales s ON t.sucursal_id = s.id
              WHERE p.tipo_producto = '$producto'
              AND p.fecha BETWEEN '$fecha_inicio' AND '$fecha_fin'";
    
    if ($sucursal_id > 0) {
        $query .= " AND t.sucursal_id = $sucursal_id";
    }
    
    $query .= " GROUP BY p.fecha, t.id
                ORDER BY p.fecha DESC, t.nombre ASC";
    
    $result = $conn->query($query);
    
    $datos = [];
    $trabajadores = [];
    $fechas = [];
    
    while ($row = $result->fetch_assoc()) {
        $fecha = $row['fecha'];
        $trabajador = $row['trabajador_nombre'];
        
        if (!in_array($fecha, $fechas)) {
            $fechas[] = $fecha;
        }
        if (!in_array($trabajador, $trabajadores)) {
            $trabajadores[] = $trabajador;
        }
        
        $datos[$fecha][$trabajador] = [
            'peso' => floatval($row['total_peso']),
            'piezas' => intval($row['total_piezas']),
            'sucursal' => $row['sucursal_nombre']
        ];
    }
    
    // Obtener información del producto
    $prodQuery = "SELECT nombre, es_leche FROM productos WHERE nombre = '$producto'";
    $prodResult = $conn->query($prodQuery);
    $productoInfo = $prodResult->fetch_assoc();
    $esLeche = $productoInfo['es_leche'] == 1;
    
    echo json_encode([
        'success' => true,
        'producto' => $producto,
        'es_leche' => $esLeche,
        'fechas' => $fechas,
        'trabajadores' => $trabajadores,
        'datos' => $datos,
        'fecha_inicio' => $fecha_inicio,
        'fecha_fin' => $fecha_fin
    ]);
    exit;
} elseif ($action === 'eliminar_registro') {
    ob_clean();
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
        exit;
    }
    
    $fecha = $conn->real_escape_string($input['fecha']);
    $producto = $conn->real_escape_string($input['producto']);
    $tipo = $input['tipo']; // 'peso', 'piezas', o 'leche'
    $sucursal_id = isset($input['sucursal_id']) ? intval($input['sucursal_id']) : 0;
    
    // Validar campos requeridos
    if (empty($fecha) || empty($producto)) {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
        exit;
    }
    
    // Construir la consulta según el tipo
    if ($tipo === 'leche') {
        // Para leche, eliminar todo el registro (solo tiene peso)
        $query = "DELETE FROM produccion_diaria WHERE fecha = '$fecha' AND tipo_producto = '$producto'";
        
        // Si se especifica sucursal, también filtrar por trabajadores de esa sucursal
        if ($sucursal_id > 0) {
            $query .= " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = $sucursal_id)";
        }
        
    } elseif ($tipo === 'peso') {
        // Solo eliminar el peso, dejando las piezas intactas
        $query = "UPDATE produccion_diaria SET peso_kg = NULL 
                  WHERE fecha = '$fecha' AND tipo_producto = '$producto'";
        
        if ($sucursal_id > 0) {
            $query .= " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = $sucursal_id)";
        }
        
    } elseif ($tipo === 'piezas') {
        // Solo eliminar las piezas, dejando el peso intacto
        $query = "UPDATE produccion_diaria SET piezas = NULL 
                  WHERE fecha = '$fecha' AND tipo_producto = '$producto'";
        
        if ($sucursal_id > 0) {
            $query .= " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = $sucursal_id)";
        }
        
    } else {
        echo json_encode(['success' => false, 'error' => 'Tipo de eliminación no válido']);
        exit;
    }
    
    // Ejecutar la consulta
    if ($conn->query($query)) {
        // Verificar si después de la actualización quedó un registro vacío (sin peso ni piezas)
        if ($tipo === 'peso' || $tipo === 'piezas') {
            $checkQuery = "SELECT id FROM produccion_diaria 
                          WHERE fecha = '$fecha' 
                          AND tipo_producto = '$producto' 
                          AND (peso_kg IS NULL OR peso_kg = 0) 
                          AND (piezas IS NULL OR piezas = 0)";
            
            if ($sucursal_id > 0) {
                $checkQuery .= " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = $sucursal_id)";
            }
            
            $checkResult = $conn->query($checkQuery);
            if ($checkResult && $checkResult->num_rows > 0) {
                // Si el registro quedó vacío, eliminarlo completamente
                $deleteQuery = "DELETE FROM produccion_diaria 
                               WHERE fecha = '$fecha' 
                               AND tipo_producto = '$producto' 
                               AND (peso_kg IS NULL OR peso_kg = 0) 
                               AND (piezas IS NULL OR piezas = 0)";
                
                if ($sucursal_id > 0) {
                    $deleteQuery .= " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = $sucursal_id)";
                }
                
                $conn->query($deleteQuery);
            }
        }
        
        echo json_encode(['success' => true, 'message' => 'Registro eliminado correctamente']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al eliminar: ' . $conn->error]);
    }
} elseif ($action === 'guardar') {
    // Asegurar que la salida sea solo JSON
    ob_clean();
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'error' => 'No se recibieron datos']);
        exit;
    }
    
    // Validar campos requeridos
    if (empty($input['fecha'])) {
        echo json_encode(['success' => false, 'error' => 'La fecha es requerida']);
        exit;
    }
    /*if (empty($input['trabajador_id']) || $input['trabajador_id'] <= 0) {
        echo json_encode(['success' => false, 'error' => 'Debe seleccionar un trabajador']);
        exit;
    }*/
    if (empty($input['tipo_producto'])) {
        echo json_encode(['success' => false, 'error' => 'El tipo de producto es requerido']);
        exit;
    }
    
    $fecha = $conn->real_escape_string($input['fecha']);
    $trabajador_id = intval($input['trabajador_id']);
    $tipo_producto = $conn->real_escape_string($input['tipo_producto']);
    $peso_kg = (isset($input['peso_kg']) && $input['peso_kg'] !== '' && $input['peso_kg'] !== null) ? floatval($input['peso_kg']) : null;
    $piezas = (isset($input['piezas']) && $input['piezas'] !== '' && $input['piezas'] !== null) ? intval($input['piezas']) : null;
    
    // Validar fechas futuras
    if (strtotime($fecha) > strtotime(date('Y-m-d'))) {
        echo json_encode(['success' => false, 'error' => 'No se pueden agregar fechas futuras']);
        exit;
    }
    
    // Verificar si es leche
    $checkLeche = $conn->query("SELECT es_leche FROM productos WHERE nombre = '$tipo_producto'");
    if (!$checkLeche) {
        echo json_encode(['success' => false, 'error' => 'Error al verificar el producto']);
        exit;
    }
    $esLeche = ($checkLeche->num_rows > 0 && $checkLeche->fetch_assoc()['es_leche'] == 1);
    
    if ($esLeche && ($peso_kg === null || $peso_kg <= 0)) {
        echo json_encode(['success' => false, 'error' => 'Debe ingresar la cantidad de litros de leche']);
        exit;
    }
    if (!$esLeche && ($peso_kg === null || $peso_kg <= 0) && ($piezas === null || $piezas <= 0)) {
        echo json_encode(['success' => false, 'error' => 'Debe ingresar peso o cantidad de piezas']);
        exit;
    }
    
    // Verificar si ya existe
    $checkStmt = $conn->prepare("SELECT id FROM produccion_diaria WHERE fecha = ? AND trabajador_id = ? AND tipo_producto = ?");
    if (!$checkStmt) {
        echo json_encode(['success' => false, 'error' => 'Error interno del servidor: ' . $conn->error]);
        exit;
    }
    $checkStmt->bind_param("sis", $fecha, $trabajador_id, $tipo_producto);
    $checkStmt->execute();
    $checkStmt->store_result();
    $existe = $checkStmt->num_rows > 0;
    $checkStmt->close();
    
    if ($existe) {
        // UPDATE
        if ($peso_kg === null && $piezas === null) {
            $query = "UPDATE produccion_diaria SET peso_kg = NULL, piezas = NULL 
                      WHERE fecha = '$fecha' AND trabajador_id = $trabajador_id AND tipo_producto = '$tipo_producto'";
        } elseif ($peso_kg === null) {
            $query = "UPDATE produccion_diaria SET peso_kg = NULL, piezas = $piezas 
                      WHERE fecha = '$fecha' AND trabajador_id = $trabajador_id AND tipo_producto = '$tipo_producto'";
        } elseif ($piezas === null) {
            $query = "UPDATE produccion_diaria SET peso_kg = $peso_kg, piezas = NULL 
                      WHERE fecha = '$fecha' AND trabajador_id = $trabajador_id AND tipo_producto = '$tipo_producto'";
        } else {
            $query = "UPDATE produccion_diaria SET peso_kg = $peso_kg, piezas = $piezas 
                      WHERE fecha = '$fecha' AND trabajador_id = $trabajador_id AND tipo_producto = '$tipo_producto'";
        }
        
        if ($conn->query($query)) {
            echo json_encode(['success' => true, 'message' => 'Registro actualizado correctamente']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al actualizar: ' . $conn->error]);
        }
    } else {
        // INSERT
        $stmt = $conn->prepare("INSERT INTO produccion_diaria (fecha, trabajador_id, tipo_producto, peso_kg, piezas) VALUES (?, ?, ?, ?, ?)");
        if (!$stmt) {
            echo json_encode(['success' => false, 'error' => 'Error al preparar inserción: ' . $conn->error]);
            exit;
        }
        
        $stmt->bind_param("sissi", $fecha, $trabajador_id, $tipo_producto, $peso_kg, $piezas);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Registro guardado correctamente']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al insertar: ' . $stmt->error]);
        }
        $stmt->close();
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
}

$conn->close();
?>