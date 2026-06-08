<?php
header('Content-Type: application/json');
require_once 'config.php';

$pago_id = intval($_GET['id'] ?? 0);

if (!$pago_id) {
    echo json_encode(['success' => false, 'error' => 'ID de pago requerido']);
    exit;
}

// Obtener información del pago
$sql = "SELECT n.*, t.nombre as trabajador_nombre, t.cedula, t.cargo, t.sucursal_id, t.dia_corte,
               s.nombre as sucursal_nombre
        FROM nomina_pagos n
        JOIN trabajadores t ON n.trabajador_id = t.id
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        WHERE n.id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $pago_id);
$stmt->execute();
$result = $stmt->get_result();
$pago = $result->fetch_assoc();

if (!$pago) {
    echo json_encode(['success' => false, 'error' => 'Pago no encontrado']);
    exit;
}

// Días de la semana (1=Domingo, 2=Lunes, 3=Martes, 4=Miércoles, 5=Jueves, 6=Viernes, 7=Sábado)
$diasSemana = [
    1 => 'Domingo',
    2 => 'Lunes',
    3 => 'Martes',
    4 => 'Miércoles',
    5 => 'Jueves',
    6 => 'Viernes',
    7 => 'Sábado'
];

$diaCorte = $pago['dia_corte'] ?? 2; // Lunes por defecto
$fechaPago = new DateTime($pago['fecha_pago']);
$fechaPago->setTime(12, 0, 0);

// El período TERMINA en el día de corte (día de pago)
// Buscar el día de corte más cercano (puede ser hoy o una fecha anterior)
$finPeriodo = clone $fechaPago;

// Obtener el día de la semana de la fecha de pago (1=Lunes, 7=Domingo)
$diaSemanaPago = (int)$finPeriodo->format('N');
// Convertir a formato del sistema (1=Domingo...7=Sábado)
$diaSemanaPagoMapeado = $diaSemanaPago + 1;
if ($diaSemanaPagoMapeado == 8) $diaSemanaPagoMapeado = 1;

// Si la fecha de pago no es el día de corte, retroceder hasta encontrar el día de corte
while ($diaSemanaPagoMapeado != $diaCorte) {
    $finPeriodo->modify('-1 day');
    $diaSemanaPago = (int)$finPeriodo->format('N');
    $diaSemanaPagoMapeado = $diaSemanaPago + 1;
    if ($diaSemanaPagoMapeado == 8) $diaSemanaPagoMapeado = 1;
}

// El inicio del período es el día siguiente al día de corte anterior
$inicioPeriodo = clone $finPeriodo;
$inicioPeriodo->modify('-6 days'); // Retroceder 6 días para llegar al día después del corte anterior

// Ajustar por si el cálculo no es exacto
$diaInicio = (int)$inicioPeriodo->format('N');
$diaInicioMapeado = $diaInicio + 1;
if ($diaInicioMapeado == 8) $diaInicioMapeado = 1;

// El día de inicio debe ser el día siguiente al corte (corte+1)
$diaEsperado = $diaCorte + 1;
if ($diaEsperado == 8) $diaEsperado = 1;

if ($diaInicioMapeado != $diaEsperado) {
    // Ajustar manualmente
    $inicioPeriodo = clone $finPeriodo;
    $inicioPeriodo->modify('-7 days');
    $inicioPeriodo->modify('+1 day');
}

$periodo_inicio = $inicioPeriodo->format('Y-m-d');
$periodo_fin = $finPeriodo->format('Y-m-d');

// Obtener producción del trabajador en ese período
$sqlProd = "SELECT p.fecha, p.tipo_producto, 
                   SUM(p.peso_kg) as peso_kg, 
                   SUM(p.piezas) as piezas,
                   pr.es_leche
            FROM produccion_diaria p
            JOIN productos pr ON p.tipo_producto = pr.nombre
            WHERE p.trabajador_id = ? 
              AND p.fecha BETWEEN ? AND ?
            GROUP BY p.fecha, p.tipo_producto
            ORDER BY p.fecha, p.tipo_producto";
$stmtProd = $conn->prepare($sqlProd);
$stmtProd->bind_param('iss', $pago['trabajador_id'], $periodo_inicio, $periodo_fin);
$stmtProd->execute();
$resultProd = $stmtProd->get_result();

$produccion = [];
while ($row = $resultProd->fetch_assoc()) {
    $produccion[] = $row;
}

// Calcular totales por producto
$totalesProductos = [];
foreach ($produccion as $p) {
    $producto = $p['tipo_producto'];
    if (!isset($totalesProductos[$producto])) {
        $totalesProductos[$producto] = [
            'peso' => 0,
            'piezas' => 0,
            'es_leche' => $p['es_leche']
        ];
    }
    $totalesProductos[$producto]['peso'] += floatval($p['peso_kg'] ?? 0);
    $totalesProductos[$producto]['piezas'] += intval($p['piezas'] ?? 0);
}

// Obtener valores unitarios si existen
$sqlValores = "SELECT fecha, producto, cantidad, valor_unitario, subtotal 
               FROM pago_detalle_valores 
               WHERE pago_id = $pago_id 
               ORDER BY fecha, producto";
$resultValores = $conn->query($sqlValores);
$valores_unitarios = [];
while ($row = $resultValores->fetch_assoc()) {
    $valores_unitarios[] = $row;
}

echo json_encode([
    'success' => true,
    'pago' => $pago,
    'periodo_inicio' => $periodo_inicio,
    'periodo_fin' => $periodo_fin,
    'dia_corte_nombre' => $diasSemana[$diaCorte],
    'produccion' => $produccion,
    'totales_productos' => $totalesProductos,
    'valores_unitarios' => $valores_unitarios
]);
?>