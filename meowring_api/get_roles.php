<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 获取用户所有角色
try {
    $userId = $_POST['userId'] ?? '';

    if (empty($userId)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'roles' => []]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM roles WHERE userId = :userId ORDER BY created_at DESC");
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'roles' => $roles]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '查询失败：' . $e->getMessage(), 'roles' => []]);
}
?>
