<?php
header('Content-Type: application/json');
require_once 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_rol'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id']);

if ($id == $_SESSION['user_id']) {
    echo json_encode(['success' => false, 'error' => 'No puedes eliminar tu propio usuario']);
    exit;
}

$query = "DELETE FROM usuarios WHERE id = $id";

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Usuario eliminado']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>