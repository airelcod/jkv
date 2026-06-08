<?php
header('Content-Type: application/json');
require_once 'config.php';

// Asegurar que la sesión está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar si el usuario está autenticado
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'No autenticado', 'session_id' => session_id()]);
    exit;
}

$user_id = $_SESSION['user_id'];
$query = "SELECT id, nombre, email, rol FROM usuarios WHERE id = $user_id";
$result = $conn->query($query);

if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
}

$conn->close();
?>