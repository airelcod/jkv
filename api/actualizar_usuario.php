<?php
header('Content-Type: application/json');
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$user_id = $_SESSION['user_id'];
$nombre = $conn->real_escape_string($data['nombre']);
$email = $conn->real_escape_string($data['email']);

$query = "UPDATE usuarios SET nombre = '$nombre', email = '$email' WHERE id = $user_id";

if (isset($data['password']) && !empty($data['password'])) {
    $password = password_hash($data['password'], PASSWORD_DEFAULT);
    $query = "UPDATE usuarios SET nombre = '$nombre', email = '$email', password = '$password' WHERE id = $user_id";
}

if ($conn->query($query)) {
    $_SESSION['user_nombre'] = $nombre;
    $_SESSION['user_email'] = $email;
    echo json_encode(['success' => true, 'message' => 'Perfil actualizado']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>