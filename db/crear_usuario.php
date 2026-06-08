<?php
header('Content-Type: application/json');
require_once 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_rol'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$nombre = $conn->real_escape_string($data['nombre']);
$email = $conn->real_escape_string($data['email']);
$password = password_hash($data['password'], PASSWORD_DEFAULT);
$rol = $conn->real_escape_string($data['rol']);

$query = "INSERT INTO usuarios (nombre, email, password, rol) VALUES ('$nombre', '$email', '$password', '$rol')";

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Usuario creado']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>