<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 获取所有种族列表
try {
    $stmt = $pdo->query("SELECT race_key, name, short_name, description, buff, image_code FROM races ORDER BY id");
    $races = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'races' => $races]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '查询失败：' . $e->getMessage(), 'races' => []]);
}
?>
