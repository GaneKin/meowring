<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 获取用户角色栏位数量
try {
    $userId = $_POST['userId'] ?? '';

    if (empty($userId)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'slotCount' => null]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT slot_count FROM user_role_slots WHERE userId = :userId LIMIT 1");
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        // 新用户默认3个栏位
        $insertStmt = $pdo->prepare("INSERT INTO user_role_slots (userId, slot_count) VALUES (:userId, 3)");
        $insertStmt->bindParam(':userId', $userId);
        $insertStmt->execute();
        echo json_encode(['code' => 0, 'msg' => '查询成功', 'slotCount' => 3]);
        exit;
    }

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'slotCount' => (int)$result['slot_count']]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '查询失败：' . $e->getMessage(), 'slotCount' => null]);
}
?>
