<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    $account = $_POST['account'] ?? '';

    if (empty($account)) {
        echo json_encode(['code' => -1, 'msg' => '账号不能为空', 'exist' => false]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT userId FROM users WHERE account = ? LIMIT 1");
    $stmt->execute([$account]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'code' => 0,
        'msg' => '查询成功',
        'exist' => $user !== false
    ]);
} catch (Exception $e) {
    echo json_encode([
        'code' => -1,
        'msg' => $e->getMessage(),
        'exist' => false
    ]);
}
?>
