<?php
header('Content-Type: application/json');
require_once 'config.php';

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
          AND pagado = 0";

$result = $conn->query($query);
$row = $result->fetch_assoc();

echo json_encode([
    'success' => true,
    'total_leche' => floatval($row['total_leche']),
    'total_costo' => floatval($row['total_costo'])
]);
?>