<?php
header('Content-Type: application/json');
require_once 'config.php';

$query = "SELECT id, nombre, ubicacion FROM sucursales WHERE activo = 1 ORDER BY nombre";
$result = $conn->query($query);
$sucursales = [];

while ($row = $result->fetch_assoc()) {
    $sucursales[] = $row;
}

echo json_encode(['success' => true, 'sucursales' => $sucursales]);
?>