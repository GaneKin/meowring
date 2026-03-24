<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    $userId = $_POST['userId'] ?? '';

    if (empty($userId)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'maobing' => null]);
        exit;
    }

    // 查询用户猫饼余额
    $stmt = $pdo->prepare("SELECT maobing FROM users WHERE userId = :userId LIMIT 1");
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        echo json_encode(['code' => -1, 'msg' => '用户不存在', 'maobing' => null]);
        exit;
    }

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'maobing' => (int)$result['maobing']]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '查询失败：' . $e->getMessage(), 'maobing' => null]);
}
?>
