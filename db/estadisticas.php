<?php
header('Content-Type: application/json');
require_once 'config.php';  // ← Quita el paréntesis de más

error_reporting(E_ALL);
ini_set('display_errors', 0);  // ← Temporal: muestra errores para depurar

function obtenerSemanaActual() {
    $hoy = new DateTime();
    $diaSemana = (int)$hoy->format('N');
    $inicio = clone $hoy;
    if ($diaSemana == 3) $inicio = $hoy;
    elseif ($diaSemana == 4) $inicio->modify('-1 days');
    elseif ($diaSemana == 5) $inicio->modify('-2 days');
    elseif ($diaSemana == 6) $inicio->modify('-3 days');
    elseif ($diaSemana == 7) $inicio->modify('-4 days');
    elseif ($diaSemana == 1) $inicio->modify('-5 days');
    elseif ($diaSemana == 2) $inicio->modify('-6 days');
    return $inicio;
}

// Inicializar respuesta con valores por defecto
$response = [
    'success' => true,
    'cuentas' => ['pagar' => 0, 'cobrar' => 0],
    'egresos' => ['total' => 0, 'por_categoria' => []],
    'trabajadores' => ['total_deuda' => 0, 'lista_deudas' => []],
    'produccion' => [
        'dias' => ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'],
        'diaria' => [0, 0, 0, 0, 0, 0, 0],
        'por_producto' => []
    ]
];

// ========== CUENTAS ==========
$result = $conn->query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_pagar WHERE estado = 'pendiente'");
if ($result && $row = $result->fetch_assoc()) {
    $response['cuentas']['pagar'] = floatval($row['total']);
}

$result = $conn->query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_cobrar WHERE estado = 'pendiente'");
if ($result && $row = $result->fetch_assoc()) {
    $response['cuentas']['cobrar'] = floatval($row['total']);
}

// ========== EGRESOS ==========
$result = $conn->query("SELECT IFNULL(SUM(monto), 0) as total FROM egresos");
if ($result && $row = $result->fetch_assoc()) {
    $response['egresos']['total'] = floatval($row['total']);
}

$result = $conn->query("SELECT IFNULL(categoria, 'Sin categoría') as categoria, SUM(monto) as total FROM egresos GROUP BY categoria");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $response['egresos']['por_categoria'][] = [
            'categoria' => $row['categoria'],
            'total' => floatval($row['total'])
        ];
    }
}

// ========== TRABAJADORES ==========
$result = $conn->query("SELECT t.id, t.nombre, IFNULL(SUM(p.monto), 0) as deuda 
                        FROM trabajadores t
                        LEFT JOIN prestamos p ON t.id = p.trabajador_id AND p.estado = 'pendiente'
                        WHERE t.activo = 1
                        GROUP BY t.id
                        HAVING deuda > 0");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $response['trabajadores']['total_deuda'] += floatval($row['deuda']);
        $response['trabajadores']['lista_deudas'][] = [
            'nombre' => $row['nombre'],
            'deuda' => floatval($row['deuda'])
        ];
    }
}

// ========== PRODUCCIÓN ==========
$inicioSemana = obtenerSemanaActual();
$fechaInicio = $inicioSemana->format('Y-m-d');
$fechaFin = (clone $inicioSemana)->modify('+6 days')->format('Y-m-d');

$result = $conn->query("SELECT fecha, IFNULL(SUM(peso_kg), 0) as total 
                        FROM produccion_diaria 
                        WHERE fecha BETWEEN '$fechaInicio' AND '$fechaFin' 
                        GROUP BY fecha");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $fechaObj = new DateTime($row['fecha']);
        $diaNum = (int)$fechaObj->format('N');
        $idx = $diaNum - 3;
        if ($idx < 0) $idx += 7;
        if ($idx >= 0 && $idx < 7) {
            $response['produccion']['diaria'][$idx] = floatval($row['total']);
        }
    }
}

$result = $conn->query("SELECT tipo_producto, 
                        IFNULL(SUM(peso_kg), 0) as total_kg, 
                        IFNULL(SUM(piezas), 0) as total_piezas 
                        FROM produccion_diaria 
                        WHERE fecha BETWEEN '$fechaInicio' AND '$fechaFin' 
                        GROUP BY tipo_producto");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $producto = ucfirst(str_replace('_', ' ', $row['tipo_producto']));
        $total_kg = floatval($row['total_kg']);
        $total_piezas = intval($row['total_piezas']);
        
        // OBTENER si el producto es líquido desde la tabla productos
        $esLecheQuery = $conn->query("SELECT es_leche FROM productos WHERE nombre = '{$row['tipo_producto']}'");
        $esLeche = ($esLecheQuery && $esLecheQuery->num_rows > 0) ? $esLecheQuery->fetch_assoc()['es_leche'] : 0;
        
        // Mostrar solo si hay kilos registrados
        if ($total_kg > 0) {
            $response['produccion']['por_producto'][] = [
                'nombre' => $producto,
                'total' => $total_kg,
                'unidad' => ($esLeche == 1) ? 'litros' : 'kg'
            ];
        }
        
        // Mostrar solo si hay piezas registradas
        if ($total_piezas > 0) {
            $response['produccion']['por_producto'][] = [
                'nombre' => $producto . ' (piezas)',
                'total' => $total_piezas,
                'unidad' => 'pz'
            ];
        }
    }
}

echo json_encode($response);
?>