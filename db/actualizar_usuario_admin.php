<?php
header('Content-Type: application/json');
require_once 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_rol'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['id']);
$nombre = $conn->real_escape_string($data['nombre']);
$email = $conn->real_escape_string($data['email']);
$rol = $conn->real_escape_string($data['rol']);

if (isset($data['password']) && !empty($data['password'])) {
    $password = password_hash($data['password'], PASSWORD_DEFAULT);
    $query = "UPDATE usuarios SET nombre = '$nombre', email = '$email', rol = '$rol', password = '$password' WHERE id = $id";
} else {
    $query = "UPDATE usuarios SET nombre = '$nombre', email = '$email', rol = '$rol' WHERE id = $id";
}

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>
