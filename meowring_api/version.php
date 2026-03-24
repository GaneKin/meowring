<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    // 尝试从数据库读取版本配置
    $version = '1.0.1';
    $minVersion = '1.0.0';
    
    try {
        $stmt = $pdo->prepare("SELECT configKey, configValue FROM system_config WHERE configKey IN ('version', 'minVersion')");
        $stmt->execute();
        $configs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($configs as $row) {
            if ($row['configKey'] === 'version') {
                $version = $row['configValue'];
            } elseif ($row['configKey'] === 'minVersion') {
                $minVersion = $row['configValue'];
            }
        }
    } catch (Exception $e) {
        // 表不存在，使用默认值
    }
    
    echo json_encode([
        'code' => 0,
        'msg' => '查询成功',
        'version' => $version,
        'minVersion' => $minVersion
    ]);
} catch (Exception $e) {
    echo json_encode([
        'code' => -1,
        'msg' => $e->getMessage(),
        'version' => '1.0.1',
        'minVersion' => '1.0.0'
    ]);
}
?>
