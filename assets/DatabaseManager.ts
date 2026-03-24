import { _decorator, Component, sys, error, log, warn } from 'cc';
const { ccclass, property } = _decorator;

// 接口基础地址
const API_BASE_URL = 'http://127.0.0.1/meowring_api/';

@ccclass('DatabaseManager')
export class DatabaseManager extends Component {
    static instance: DatabaseManager;

    // 当前登录用户的猫饼余额
    private _currentMaobing: number = 0;
    public get currentMaobing(): number { return this._currentMaobing; }

    onLoad() {
        if (DatabaseManager.instance) {
            this.destroy();
            return;
        }
        DatabaseManager.instance = this;
        log("✅ 数据库管理器初始化");
    }

    private postRequest(url: string, data: any, callback: (response: any) => void) {
        const fullUrl = API_BASE_URL + url;
        log(`📡 请求: ${fullUrl}`, data);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', fullUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                log(`📥 响应[${xhr.status}]: ${xhr.responseText}`);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        callback(res);
                    } catch (e) {
                        error("❌ JSON解析失败：", e);
                        callback({ code: -99, msg: '解析失败' });
                    }
                } else {
                    error(`❌ 请求失败：${xhr.status} - ${xhr.statusText}`);
                    callback({ code: -99, msg: `请求失败：${xhr.status}` });
                }
            }
        };
        xhr.onerror = () => {
            error(`❌ 网络错误: ${fullUrl}`);
            callback({ code: -99, msg: '网络错误' });
        };
        xhr.send();
    }
    private getRequest(url: string, callback: (response: any) => void) {


        const fullUrl = API_BASE_URL + url;
        log(`📡 GET请求: ${fullUrl}`);
        
        const xhr = new XMLHttpRequest();
        xhr.open('GET', fullUrl, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                log(`📥 响应[${xhr.status}]: ${xhr.responseText}`);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        callback(res);
                    } catch (e) {
                        error("❌ JSON解析失败：", e);
                        callback({ code: -99, msg: '解析失败' });
                    }
                } else {
                    error(`❌ 请求失败：${xhr.status}`);
                    callback({ code: -99, msg: `请求失败：${xhr.status}` });
                }
            }
        };
        xhr.onerror = () => {
            error(`❌ 网络错误: ${fullUrl}`);
            callback({ code: -99, msg: '网络错误' });
        };
        xhr.send();
    }
    /** 检查账号是否存在 */
    send(account: string, callback: (exist: boolean) => void) {
        this.postRequest('check_account.php', { account }, (res) => {
            if (res.code !== 0) { callback(false); return; }
            callback(res.exist);
        });
    }

    /** 注册用户（初始100猫饼） */
    registerUser(userId: string, account: string, password: string, callback: (success: boolean) => void) {
        this.postRequest('register.php', { userId, account, password }, (res) => {
            if (res.code !== 0) { error(`❌ 注册失败：${res.msg}`); callback(false); return; }
            callback(res.success);
        });
    }

    /**
     * 登录校验（含月度奖励）
     * @param rewardCallback 可选：奖励回调 {claimed, rewardAmount, message}
     */
    loginCheck(account: string, password: string, callback: (user: any | null) => void, rewardCallback?: (reward: any) => void) {
        this.postRequest('login.php', { account, password }, (res) => {
            if (res.code !== 0) { error(`❌ 登录失败：${res.msg}`); callback(null); return; }
            if (res.user?.maobing !== undefined) this._currentMaobing = res.user.maobing;
            if (rewardCallback && res.reward) rewardCallback(res.reward);
            callback(res.user);
        });
    }

    /** 获取猫饼余额 */
    getMaobing(userId: string, callback: (maobing: number) => void) {
        this.postRequest('get_maobing.php', { userId }, (res) => {
            if (res.code !== 0) { error(`❌ 查询失败：${res.msg}`); callback(0); return; }
            this._currentMaobing = res.maobing;
            callback(res.maobing);
        });
    }

    /** 扣除猫饼 */
    deductMaobing(userId: string, amount: number, reason: string, callback: (success: boolean, currentMaobing?: number) => void) {
        this.postRequest('deduct_maobing.php', { userId, amount, reason }, (res) => {
            if (res.code !== 0) { 
                if (res.code === -3) warn(`⚠️ 猫饼不足，当前${res.current}，需要${res.required}`);
                callback(false); 
                return; 
            }
            this._currentMaobing = res.current;
            callback(true, res.current);
        });
    }

    /** 添加猫饼 */
    addMaobing(userId: string, amount: number, reason: string, callback: (success: boolean, currentMaobing?: number) => void) {
        this.postRequest('add_maobing.php', { userId, amount, reason }, (res) => {
            if (res.code !== 0) { error(`❌ 添加失败：${res.msg}`); callback(false); return; }
            this._currentMaobing = res.current;
            callback(true, res.current);
        });
    }

    /** 刷新本地猫饼显示 */
    refreshMaobingDisplay(callback?: (maobing: number) => void) {
        if (!sys.isNative) {
            this._currentMaobing = 100;
            if (callback) callback(100);
            return;
        }
        const userId = this.getStoredUserId();
        if (userId) {
            this.getMaobing(userId, (maobing) => { if (callback) callback(maobing); });
        } else {
            if (callback) callback(0);
        }
    }

    private getStoredUserId(): string {
        // TODO: 需配合本地存储实现
        return '';
    }

    // ==================== 角色相关 ====================

    /** 获取用户角色栏位数 */
    getRoleSlots(userId: string, callback: (slotCount: number) => void) {
        this.postRequest('get_role_slots.php', { userId }, (res) => {
            if (res.code !== 0) { error(`❌ 查询栏位失败：${res.msg}`); callback(3); return; }
            callback(res.slotCount);
        });
    }

    /** 获取用户所有角色 */
    getRoles(userId: string, callback: (roles: Role[]) => void) {
        this.postRequest('get_roles.php', { userId }, (res) => {
            if (res.code !== 0) { error(`❌ 查询角色失败：${res.msg}`); callback([]); return; }
            callback(res.roles || []);
        });
    }

    /** 根据角色ID获取角色信息 */
    getRoleById(roleId: string, callback: (role: Role | null) => void) {
        this.postRequest('get_role_by_id.php', { roleId }, (res) => {
            if (res.code !== 0) { error(`❌ 查询角色失败：${res.msg}`); callback(null); return; }
            callback(res.role || null);
        });
    }

    /** 检查版本号
     * @param callback 返回最新版本和最低兼容版本
     */
    checkVersion(callback: (latestVersion: string, minVersion: string) => void) {
        this.getRequest('version.php', (res) => {
            if (res.code === 0) {
                callback(res.version || '1.0.0', res.minVersion || '1.0.0');
            } else {
                // 接口失败时使用默认值
                callback('1.0.0', '1.0.0');
            }
        });
    }

    /** 删除角色
     * @param roleId 角色ID
     * @param userId 用户ID（验证所有权）
     * @param callback 返回是否成功
     */
    deleteRole(roleId: string, userId: string, callback: (success: boolean, result?: any) => void) {
        this.postRequest('delete_role.php', { roleId, userId }, (res) => {
            if (res.code !== 0) { error(`❌ 删除角色失败：${res.msg}`); callback(false, res); return; }
            callback(true, res);
        });
    }

    /** 创建角色 */
    createRole(userId: string, name: string, race: string, job: string, 
               faceImage: string, backImage: string, avatarImage: string,
               attrs: { str: number, con: number, int: number, dex: number, agi: number, cha: number, per: number, wis: number },
               upgrades: { str: number, con: number, int: number, dex: number, agi: number, cha: number, per: number, wis: number },
               previewExp: number,
               callback: (success: boolean, roleId?: string, errorMsg?: string) => void) {
        
        // 先检查用户角色数和栏位数
        this.getUserRoleInfo(userId, (roleCount, slotCount) => {
            if (roleCount >= slotCount) {
                callback(false, undefined, `角色栏位已满！当前${roleCount}/${slotCount}`);
                return;
            }
            
            // 计算经验
            const initialExp = 1000;
            const totalExp = initialExp;  // 总经验 = 初始经验
            const usedExp = initialExp - previewExp;  // 已消耗 = 初始 - 剩余
            const level = 1;  // 初始等级为1
            
            // 栏位未满，创建角色
            this.postRequest('create_role.php', { 
                userId, name, race, job, faceImage, backImage, avatarImage,
                strength: attrs.str, constitution: attrs.con, intelligence: attrs.int, dexterity: attrs.dex, agility: attrs.agi,
                charisma: attrs.cha, perception: attrs.per, wisdom: attrs.wis,
                strength_upgrade: upgrades.str, constitution_upgrade: upgrades.con, intelligence_upgrade: upgrades.int,
                dexterity_upgrade: upgrades.dex, agility_upgrade: upgrades.agi, charisma_upgrade: upgrades.cha, perception_upgrade: upgrades.per,
                wisdom_upgrade: upgrades.wis,
                remainingExp: previewExp,
                usedExp: usedExp,
                totalExp: totalExp,
                level: level
            }, (res) => {
                log('创建角色API返回:', JSON.stringify(res));
                if (res.code !== 0) { 
                    error(`❌ 创建角色失败：${res.msg}`); 
                    callback(false, undefined, res.msg); 
                    return; 
                }
                callback(true, res.roleId);
            });
        });
    }

    // 先检查用户角色数和栏位数
    getUserRoleInfo(userId: string, callback: (roleCount: number, slotCount: number) => void) {
        this.postRequest('get_user_role_info.php', { userId }, (res) => {
            log('getUserRoleInfo返回:', JSON.stringify(res));
            if (res.code === 0) {
                callback(res.roleCount || 0, res.slotCount || 3);
            } else {
                // 出错时默认3个栏位
                log('获取角色信息失败，使用默认值');
                callback(0, 3);
            }
        });
    }

    /** 激活/冻结角色 */
    updateRoleStatus(userId: string, roleId: string, active: boolean, callback: (success: boolean) => void) {
        this.postRequest('update_role_status.php', { 
            userId, roleId, active: active ? 1 : 0 
        }, (res) => {
            if (res.code !== 0) { error(`❌ 更新状态失败：${res.msg}`); callback(false); return; }
            callback(true);
        });
    }

    /** 消耗经验升级属性
     * @param roleId 角色ID
     * @param deductExp 要消耗的经验
     * @param callback 返回是否成功、新等级等信息
     */
    deductExp(roleId: string, deductExp: number, callback: (success: boolean, result?: any) => void) {
        this.postRequest('update_role_exp.php', { roleId, deductExp }, (res) => {
            if (res.code !== 0) { error(`❌ 扣经验失败：${res.msg}`); callback(false); return; }
            callback(true, res);
        });
    }

    /** 升级/回退角色属性
     * @param roleId 角色ID
     * @param attrName 属性名 (strength/constitution/intelligence/dexterity/agility/charisma/perception/wisdom)
     * @param action 'upgrade' 或 'downgrade'
     * @param callback 返回操作结果
     */
    upgradeAttribute(roleId: string, attrName: string, action: 'upgrade' | 'downgrade', callback: (success: boolean, result?: any) => void) {
        this.postRequest('upgrade_attribute.php', { roleId, attrName, action }, (res) => {
            if (res.code !== 0) { error(`❌ 属性操作失败：${res.msg}`); callback(false, res); return; }
            callback(true, res);
        });
    }

    // ==================== 种族相关 ====================

    /** 获取所有种族列表 */
    getRaces(callback: (races: Race[]) => void) {
        this.postRequest('get_races.php', {}, (res) => {
            if (res.code !== 0) { error(`❌ 查询种族失败：${res.msg}`); callback([]); return; }
            callback(res.races || []);
        });
    }

    /** 获取某种族的技能 */
    getRaceSkills(raceKey: string, callback: (skills: Skill[]) => void) {
        this.postRequest('get_race_skills.php', { race_key: raceKey }, (res) => {
            if (res.code !== 0) { error(`❌ 查询技能失败：${res.msg}`); callback([]); return; }
            callback(res.skills || []);
        });
    }
}

// 角色数据类型
export interface Role {
    roleId: string;
    userId: string;
    name: string;
    race: string | null;
    job: string | null;
    strength: number;
    constitution: number;
    intelligence: number;
    dexterity: number;
    charisma: number;
    perception: number;
    wisdom: number;
    agility: number;
    action_count: number;
    hp_regen: number;
    mp_regen: number;
    remainingExp: number;  // 剩余经验
    usedExp: number;        // 已消耗经验
    totalExp: number;       // 总经验
    level: number;          // 等级
    countdown_end_time: number;  // 倒计时结束时间戳（秒）
    upgraded_attrs: string;      // 倒计时内升级过的属性(JSON数组)
    pre_upgrade_values: string; // 倒计时开始前的属性值(JSON对象)
    gold: number;
    is_active: number;
    // 属性升级次数
    strength_upgrade: number;
    constitution_upgrade: number;
    intelligence_upgrade: number;
    dexterity_upgrade: number;
    agility_upgrade: number;
    charisma_upgrade: number;
    perception_upgrade: number;
    wisdom_upgrade: number;
    face_image: string;
    back_image: string;
    avatar_image: string;
    created_at: string;
}

// 种族数据类型
export interface Race {
    race_key: string;
    name: string;
    short_name: string;
    description: string;
    buff: string;
    image_code: string;
}

// 技能数据类型（简化版）
export interface Skill {
    skill_key: string;
    name: string;
    description: string;
    unlock_condition: string;
    target_type: string;
    attack_type: string;
    apply_scene: string;
    damage_type: string;
    attack_formula: string;
    damage_formula: string;
    hp_cost: number;
    mp_cost: number;
    perm_attr_reward: string;
    perm_attack_reward: string;
    perm_defense_reward: string;
    perm_skill_level_reward: string;
    perm_damage_reward: string;
    temp_attr_reward: string;
    temp_attack_reward: string;
    temp_defense_reward: string;
    temp_skill_level_reward: string;
    temp_damage_reward: string;
    target_attr_reward: string;
    target_attack_reward: string;
    target_defense_reward: string;
    target_skill_level_reward: string;
    target_damage_reward: string;
    target_duration: number;
}
