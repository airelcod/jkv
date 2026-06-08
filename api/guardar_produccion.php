<?php
// guardar_produccion.php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
    exit;
}

$fecha = $data['fecha'];
$tipo_producto = $data['tipo_producto'];
$peso_kg = !empty($data['peso_kg']) ? $data['peso_kg'] : null;
$piezas = !empty($data['piezas']) ? $data['piezas'] : null;

// Validar que la fecha no sea futura
if (strtotime($fecha) > strtotime(date('Y-m-d'))) {
    echo json_encode(['success' => false, 'error' => 'No se pueden agregar fechas futuras']);
    exit;
}

$query = "INSERT INTO produccion_diaria (fecha, tipo_producto, peso_kg, piezas) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          peso_kg = VALUES(peso_kg), 
          piezas = VALUES(piezas)";

$stmt = $conn->prepare($query);
$stmt->bind_param("ssdi", $fecha, $tipo_producto, $peso_kg, $piezas);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Registro guardado correctamente']);
} else {
    echo json_encode(['success' => false, 'error' => 'Error al guardar: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>