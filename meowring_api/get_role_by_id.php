<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $get = $method === 'GET' ? $_GET : $_POST;
    
    $roleId = $get['roleId'] ?? '';

    if (empty($roleId)) {
        echo json_encode(['code' => -1, 'msg' => '参数不全', 'role' => null]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM roles WHERE roleId = ? LIMIT 1");
    $stmt->execute([$roleId]);
    $role = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$role) {
        echo json_encode(['code' => -2, 'msg' => '角色不存在', 'role' => null]);
        exit;
    }

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'role' => $role]);
} catch (Exception $e) {
    echo json_encode(['code' => -99, 'msg' => $e->getMessage(), 'role' => null]);
}
