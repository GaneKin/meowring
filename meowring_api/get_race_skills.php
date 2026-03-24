<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 获取某种族的所有技能
try {
    $raceKey = $_POST['race_key'] ?? '';

    if (empty($raceKey)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'skills' => []]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT s.* FROM skills s 
        JOIN race_skills rs ON s.skill_key = rs.skill_key 
        WHERE rs.race_key = :race_key
    ");
    $stmt->bindParam(':race_key', $raceKey);
    $stmt->execute();
    $skills = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'skills' => $skills]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '查询失败：' . $e->getMessage(), 'skills' => []]);
}
?>
