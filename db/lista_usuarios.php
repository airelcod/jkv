<?php
header('Content-Type: application/json');
require_once 'config.php';  // ← Aquí tenías un paréntesis de más: config.php)

if (!isset($_SESSION['user_id']) || $_SESSION['user_rol'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$query = "SELECT id, nombre, email, rol FROM usuarios ORDER BY id";
$result = $conn->query($query);
$usuarios = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
} else {
    echo json_encode(['success' => false, 'error' => 'Error en la consulta: ' . $conn->error]);
}

$conn->close();
?>