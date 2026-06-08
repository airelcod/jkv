<?php
header('Content-Type: application/json');
require_once 'config.php';

$sucursal_id = isset($_GET['sucursal_id']) ? intval($_GET['sucursal_id']) : 0;

if ($sucursal_id > 0) {
    $sql = "SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 AND sucursal_id = ? ORDER BY nombre";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $sucursal_id);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $sql = "SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 ORDER BY nombre";
    $result = $conn->query($sql);
}

$trabajadores = [];
while ($row = $result->fetch_assoc()) {
    $trabajadores[] = $row;
}

echo json_encode(['success' => true, 'trabajadores' => $trabajadores]);
?>