<?php
header('Content-Type: application/json');
require_once 'config.php';

$trabajador_id = intval($_GET['trabajador_id'] ?? 0);
$inicio = $_GET['inicio'] ?? '';
$fin = $_GET['fin'] ?? '';

if (!$trabajador_id || !$inicio || !$fin) {
    echo json_encode(['success' => false, 'error' => 'Parámetros incompletos']);
    exit;
}

$sql = "SELECT p.fecha, p.tipo_producto, 
               SUM(p.peso_kg) as peso_kg, 
               SUM(p.piezas) as piezas,
               pr.es_leche
        FROM produccion_diaria p
        JOIN productos pr ON p.tipo_producto = pr.nombre
        WHERE p.trabajador_id = ? 
          AND p.fecha BETWEEN ? AND ?
        GROUP BY p.fecha, p.tipo_producto
        ORDER BY p.fecha, p.tipo_producto";

$stmt = $conn->prepare($sql);
$stmt->bind_param('iss', $trabajador_id, $inicio, $fin);
$stmt->execute();
$result = $stmt->get_result();

$produccion = [];
while ($row = $result->fetch_assoc()) {
    $produccion[] = $row;
}

echo json_encode(['success' => true, 'produccion' => $produccion]);
?>