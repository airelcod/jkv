<?php
header('Content-Type: application/json');
require_once 'config.php';

$tipo = $_GET['tipo'] ?? '';
$nombre = $_GET['nombre'] ?? '';

if ($tipo === 'sucursal') {
    $query = "SELECT COUNT(*) as total FROM produccion_diaria WHERE sucursal = '$nombre'";
} elseif ($tipo === 'producto') {
    $query = "SELECT COUNT(*) as total FROM produccion_diaria WHERE tipo_producto = '$nombre'";
} else {
    echo json_encode(['success' => false, 'error' => 'Tipo no válido']);
    exit;
}

$result = $conn->query($query);
$row = $result->fetch_assoc();

echo json_encode(['success' => true, 'total' => $row['total']]);
?>