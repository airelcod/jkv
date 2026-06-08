<?php
header('Content-Type: application/json');
require_once 'config.php';  // O 'config.php' según tu estructura

$query = "SELECT id, nombre, es_leche, precio_venta FROM productos WHERE activo = 1 ORDER BY nombre";
$result = $conn->query($query);
$productos = [];

while ($row = $result->fetch_assoc()) {
    $productos[] = [
        'id' => $row['id'],
        'nombre' => $row['nombre'],
        'es_leche' => $row['es_leche'],
        'precio' => floatval($row['precio_venta'] ?? 0)
    ];
}

echo json_encode(['success' => true, 'productos' => $productos]);
$conn->close();
?>