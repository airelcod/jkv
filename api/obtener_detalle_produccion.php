<?php
header('Content-Type: application/json');
require_once 'config.php';

$fecha = $_GET['fecha'];
$producto = $_GET['producto'];
$sucursal_id = isset($_GET['sucursal_id']) ? intval($_GET['sucursal_id']) : 0;

if ($sucursal_id > 0) {
    $sql = "SELECT t.nombre as trabajador, 
                   s.nombre as sucursal,
                   p.peso_kg as cantidad_peso,
                   p.piezas as cantidad_piezas,
                   pr.es_leche,
                   pr.nombre as producto_nombre
            FROM produccion_diaria p
            JOIN trabajadores t ON p.trabajador_id = t.id
            JOIN sucursales s ON t.sucursal_id = s.id
            JOIN productos pr ON p.tipo_producto = pr.nombre
            WHERE p.fecha = ? 
              AND p.tipo_producto = ?
              AND t.sucursal_id = ?
            ORDER BY t.nombre";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ssi', $fecha, $producto, $sucursal_id);
} else {
    $sql = "SELECT t.nombre as trabajador, 
                   s.nombre as sucursal,
                   p.peso_kg as cantidad_peso,
                   p.piezas as cantidad_piezas,
                   pr.es_leche,
                   pr.nombre as producto_nombre
            FROM produccion_diaria p
            JOIN trabajadores t ON p.trabajador_id = t.id
            JOIN sucursales s ON t.sucursal_id = s.id
            JOIN productos pr ON p.tipo_producto = pr.nombre
            WHERE p.fecha = ? AND p.tipo_producto = ?
            ORDER BY s.nombre, t.nombre";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $fecha, $producto);
}

$stmt->execute();
$result = $stmt->get_result();

$detalle = [];
while ($row = $result->fetch_assoc()) {
    $detalle[] = $row;
}

echo json_encode(['success' => true, 'detalle' => $detalle]);
?>