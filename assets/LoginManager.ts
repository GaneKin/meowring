import { _decorator, Component, Node, Label, EditBox, Button, Sprite, SpriteFrame, Prefab, sys, log, error, instantiate } from 'cc';
const { ccclass, property } = _decorator;
import { director, resources } from 'cc';
import { DatabaseManager, Race } from './DatabaseManager';
import { MainHallManager } from './MainHallManager';

@ccclass('LoginManager')
export class LoginManager extends Component {
    @property(EditBox) loginAccountEdit: EditBox = null!;
    @property(EditBox) loginPasswordEdit: EditBox = null!;
    @property(EditBox) regAccountEdit: EditBox = null!;
    @property(EditBox) regPasswordEdit: EditBox = null!;
    @property(EditBox) roleNameEdit: EditBox = null!;

    @property(Node) loginForm: Node = null!;
    @property(Node) registerForm: Node = null!;
    @property(Node) createRoleForm: Node = null!;
    @property(Node) registerSuccessPopup: Node = null!;
    @property(Node) roleSelectPanel: Node = null!;

    @property(Label) tipLabel: Label = null!;
    @property(Label) regErrorLabel: Label = null!;
    @property(Label) popupIdLabel: Label = null!;
    @property(Label) popupAccountLabel: Label = null!;
    @property(Label) passwordLabel: Label = null!;
    @property(Button) createRoleBackBtn: Button = null!;
    @property(Button) cfCreateBtn: Button = null!;

    // 种族下拉框相关
    @property(Button) raceSelector: Button = null!;
    @property(Label) raceSelectorLabel: Label = null!;
    @property(Node) raceDropdown: Node = null!;
    @property(Node) raceOptions: Node = null!;
    @property(Prefab) raceOptionPrefab: Prefab = null!;

    // 角色列表相关
    @property(Prefab) roleOptionPrefab: Prefab = null!;
    @property(Node) roleListContainer: Node = null!;

    // 角色属性预览
    @property(Label) previewStrength: Label = null!;
    @property(Label) previewConstitution: Label = null!;
    @property(Label) previewIntelligence: Label = null!;
    @property(Label) previewDexterity: Label = null!;
    @property(Label) previewCharisma: Label = null!;
    @property(Label) previewPerception: Label = null!;
    @property(Label) previewWisdom: Label = null!;
    @property(Label) previewAgility: Label = null!;

    // 栏位提示和头像预览
    @property(Label) slotTipLabel: Label = null!;
    @property(Label) previewExpLabel: Label = null!;
    @property(Node) avatarPreview: Node = null!;
    @property(Sprite) avatarSprite: Sprite = null!;

    private mockUsers: Map<string, string> = new Map();
    private currentUserId: string = ''; // 新增：修复currentUserId未定义问题
    private raceList: Race[] = [];
    private selectedRace: string = '';
    private selectedImageCode: string = 'img_default';
    private previewAttrs: { str: number, con: number, int: number, dex: number, agi: number, cha: number, per: number, wis: number } = { str: 1, con: 1, int: 1, dex: 1, agi: 1, cha: 1, per: 1, wis: 1 };
    private previewUpgrades: { str: number, con: number, int: number, dex: number, agi: number, cha: number, per: number, wis: number } = { str: 0, con: 0, int: 0, dex: 0, agi: 0, cha: 0, per: 0, wis: 0 };
    private previewExp: number = 1000;
    private selectedJob: string = '';
    
    // 版本号
    private readonly VERSION: string = '1.0.0';
    @property(Label) versionLabel: Label = null!;

    onLoad() {
        // 显示版本检查提示
        this.showTip('检查版本中...');
        
        // 调用API检查版本
        if (sys.isNative && DatabaseManager.instance) {
            DatabaseManager.instance.checkVersion((latestVersion, minVersion) => {
                // 比较版本：本地版本 < 最低要求版本则拒绝
                if (this.compareVersion(this.VERSION, minVersion) < 0) {
                    this.showTip('版本过低，请更新到: ' + latestVersion);
                    this.scheduleOnce(() => {
                        if (sys.isNative) {
                            application.end();
                        } else {
                            window.close?.();
                        }
                    }, 5);
                } else {
                    // 版本检查通过，初始化游戏
                    if (this.versionLabel) {
                        this.versionLabel.string = 'v' + this.VERSION + ' (' + latestVersion + ')';
                    }
                    this.initGame();
                }
            });
        } else {
            // 非原生环境，跳过版本检查
            if (this.versionLabel) {
                this.versionLabel.string = 'v' + this.VERSION;
            }
            this.initGame();
        }
    }

    // 版本比较：返回 -1(小于) 0(等于) 1(大于)
    private compareVersion(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 < p2) return -1;
            if (p1 > p2) return 1;
        }
        return 0;
    }

    // 游戏初始化（版本检查通过后执行）
    private initGame() {
        this.showAllPanel(false);
        this.loginForm.active = true;
        this.registerSuccessPopup.active = false;
        this.clearRegError();
        
        if (this.createRoleBackBtn) {
            this.createRoleBackBtn.node.on(Button.EventType.CLICK, this.onBackToLoginFromCreateRole, this);
        }

        if (this.cfCreateBtn) {
            this.cfCreateBtn.node.on(Button.EventType.CLICK, this.onConfirmCreateRoleBtnClick, this);
        }

        if (this.raceSelector) {
            this.raceSelector.node.on(Button.EventType.CLICK, this.onRaceSelectorClick, this);
        }

        if (this.raceDropdown) {
            this.raceDropdown.active = false;
        }

        this.loadRaces();
        this.updateAttributePreview('');
    }

    // 加载种族数据
    private loadRaces(): void {
        log('开始加载种族数据...');
        
        if (sys.isNative && DatabaseManager.instance) {
            log('原生模式，调用API...');
            DatabaseManager.instance.getRaces((races: Race[]) => {
                log('API返回种族数量: ' + races.length);
                if (races && races.length > 0) {
                    this.raceList = races;
                    log('加载了 ' + races.length + ' 个种族');
                    this.generateRaceOptions(races);
                } else {
                    log('API返回空，加载默认');
                    this.loadDefaultRaces();
                }
            });
        } else {
            log('网页模式，加载默认');
            this.loadDefaultRaces();
        }
    }

    // 加载默认种族
    private loadDefaultRaces(): void {
        const defaultRaces: Race[] = [
            { race_key: 'human', name: '人类', short_name: '人类', description: '', buff: '', image_code: 'img_human' },
            { race_key: 'elf', name: '精灵', short_name: '精灵', description: '', buff: '', image_code: 'img_elf' },
            { race_key: 'dwarf', name: '矮人', short_name: '矮人', description: '', buff: '', image_code: 'img_dwarf' },
        ];
        this.raceList = defaultRaces;
        this.generateRaceOptions(defaultRaces);
    }

    // 生成种族选项
    private generateRaceOptions(races: Race[]): void {
        log('generateRaceOptions 被调用');
        if (!this.raceOptions) { log('raceOptions 节点未绑定'); return; }
        if (!this.raceOptionPrefab) { log('raceOptionPrefab 预制体未绑定'); return; }
        
        log('开始生成选项，数量: ' + races.length);

        // 清空现有选项
        this.raceOptions.removeAllChildren();

        for (const race of races) {
            const option = instantiate(this.raceOptionPrefab);
            this.raceOptions.addChild(option);

            // 查找 Label 组件（可能在根节点或子节点）
            let label = option.getComponent(Label);
            if (!label) {
                // 尝试在子节点中查找
                for (const child of option.children) {
                    label = child.getComponent(Label);
                    if (label) break;
                }
            }
            
            if (label) {
                label.string = race.name;
            }

            // 点击选择 - 使用Button组件
            let btn = option.getComponent(Button);
            if (!btn) {
                btn = option.addComponent(Button);
            }
            btn.node.on(Button.EventType.CLICK, () => {
                log('点击了选项: ' + race.name);
                this.selectRace(race);
            }, this);
        }
    }

    // 点击种族选择器
    private onRaceSelectorClick(): void {
        log('点击了种族选择器');
        if (this.raceDropdown) {
            this.raceDropdown.active = !this.raceDropdown.active;
            log('下拉框状态: ' + this.raceDropdown.active);
        } else {
            log('raceDropdown 未绑定');
        }
    }

    // 选择种族
    private selectRace(race: Race): void {
        this.selectedRace = race.race_key;
        this.selectedImageCode = race.image_code || 'img_default';
        
        // 更新显示
        if (this.raceSelectorLabel) {
            this.raceSelectorLabel.string = race.name;
        }
        
        // 隐藏下拉框
        if (this.raceDropdown) {
            this.raceDropdown.active = false;
        }
        
        // 显示buff信息
        // 更新头像预览
        this.updateAvatarPreview(race.image_code);
        
        // 更新属性预览
        this.updateAttributePreview(race.buff);
    }
    
    // 更新属性预览
    private updateAttributePreview(buff: string): void {
        // 基础值
        let str = 1, con = 1, int = 1, dex = 1, agi = 1, cha = 1, per = 1, wis = 1;
        
        // 解析buff（如："体质+1&敏捷-1"）
        if (buff) {
            const parts = buff.split('&');
            for (const part of parts) {
                const match = part.match(/([体质力量智力敏捷魅力感知意志速度]+)([+-]\d+)/);
                if (match) {
                    const attr = match[1];
                    const value = parseInt(match[2]);
                    
                    if (attr === '体质') con = 1 + value;
                    else if (attr === '力量') str = 1 + value;
                    else if (attr === '智力') int = 1 + value;
                    else if (attr === '灵巧') dex = 1 + value;
                    else if (attr === '敏捷') agi = 1 + value;
                    else if (attr === '魅力') cha = 1 + value;
                    else if (attr === '感知') per = 1 + value;
                    else if (attr === '意志') wis = 1 + value;
                }
            }
        }
        
        // 计算升级所需经验（公式：100 * 2^(n-1)）
        const calcExpCost = (currentLevel: number, targetLevel: number): number => {
            let exp = 0;
            for (let i = currentLevel; i < targetLevel; i++) {
                exp += Math.floor(100 * Math.pow(2, i - 1));
            }
            return exp;
        };
        
        // 用经验抵消负buff，确保属性>=1（简化：每次扣1属性需100经验升级1级）
        let totalExpCost = 0;
        const initialExp = 1000;
        
        // 记录每个属性的提升次数
        let strUp = 0, conUp = 0, intUp = 0, dexUp = 0, agiUp = 0, chaUp = 0, perUp = 0, wisUp = 0;
        
        if (con < 1) { conUp = 1; totalExpCost += 100; con = 1; }
        if (str < 1) { strUp = 1; totalExpCost += 100; str = 1; }
        if (int < 1) { intUp = 1; totalExpCost += 100; int = 1; }
        if (dex < 1) { dexUp = 1; totalExpCost += 100; dex = 1; }
        if (agi < 1) { agiUp = 1; totalExpCost += 100; agi = 1; }
        if (cha < 1) { chaUp = 1; totalExpCost += 100; cha = 1; }
        if (per < 1) { perUp = 1; totalExpCost += 100; per = 1; }
        if (wis < 1) { wisUp = 1; totalExpCost += 100; wis = 1; }
        
        // 保存预览结果
        this.previewAttrs = { str, con, int, dex, agi, cha, per, wis };
        this.previewUpgrades = { str: strUp, con: conUp, int: intUp, dex: dexUp, agi: agiUp, cha: chaUp, per: perUp, wis: wisUp };
        this.previewExp = 1000 - totalExpCost;
        
        // 显示剩余经验
        if (this.previewExpLabel) {
            if (totalExpCost > 0) {
                this.previewExpLabel.string = `剩余经验: ${this.previewExp} (消耗: ${totalExpCost})`;
            } else {
                this.previewExpLabel.string = `初始经验: ${initialExp}`;
            }
        }
        
        // 更新显示
        if (this.previewConstitution) this.previewConstitution.string = "体质: " + con;
        if (this.previewStrength) this.previewStrength.string = "力量: " + str;
        if (this.previewIntelligence) this.previewIntelligence.string = "智力: " + int;
        if (this.previewDexterity) this.previewDexterity.string = "灵巧: " + dex;
        if (this.previewCharisma) this.previewCharisma.string = "魅力: " + cha;
        if (this.previewPerception) this.previewPerception.string = "感知: " + per;
        if (this.previewWisdom) this.previewWisdom.string = "意志: " + wis;
        if (this.previewAgility) this.previewAgility.string = "敏捷: " + agi;
    }
    
    // 更新头像预览
    private updateAvatarPreview(imageCode: string): void {
        if (!this.avatarSprite || !imageCode) return;
        
        resources.load('images/avatar/' + imageCode + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err) {
                log('加载头像失败: ' + err.message);
                return;
            }
            this.avatarSprite.spriteFrame = spriteFrame;
        });
    }

    private showAllPanel(active: boolean): void {
        this.loginForm.active = active;
        this.registerForm.active = active;
        this.createRoleForm.active = active;
        this.roleSelectPanel.active = active;
    }

    public onToRegisterBtnClick(): void {
        this.showAllPanel(false);
        this.registerForm.active = true;
        this.clearTip(); 
        this.clearRegError();
    }

    public onBackLoginBtnClick(): void {
        this.showAllPanel(false);
        this.loginForm.active = true;
        this.clearTip(); 
        this.clearRegError();
    }

    public onToCreateRoleBtnClick(): void {
        this.showAllPanel(false);
        this.createRoleForm.active = true;
        this.clearTip();
        
        // 读取角色栏位信息
        this.loadRoleSlotInfo();
    }
    
    // 读取角色栏位信息
    private loadRoleSlotInfo(): void {
        if (!this.slotTipLabel) return;
        
        if (sys.isNative && DatabaseManager.instance) {
            const userId = this.currentUserId || '33310722';
            DatabaseManager.instance.getUserRoleInfo(userId, (roleCount, slotCount) => {
                this.slotTipLabel.string = `栏位: ${roleCount}/${slotCount}`;
            });
        } else {
            this.slotTipLabel.string = "栏位: 0/3";
        }
    }

    public onBackToLoginFromCreateRole(): void {
        this.showAllPanel(false);
        this.roleSelectPanel.active = true;
        this.clearTip();
    }

    private jumpToRoleSelectPanel(): void {
        this.showAllPanel(false);
        this.roleSelectPanel.active = true;
        this.clearTip();
        this.loginAccountEdit.string = "";
        this.loginPasswordEdit.string = "";
        this.roleNameEdit.string = "";
        // 加载角色列表
        this.loadRoleList();
    }

    // 加载角色列表
    private loadRoleList(): void {
        if (!this.roleListContainer) { log('roleListContainer 未绑定'); return; }
        
        // 清空现有列表
        this.roleListContainer.removeAllChildren();
        
        if (sys.isNative && DatabaseManager.instance) {
            const userId = this.currentUserId || '33310722';
            DatabaseManager.instance.getRoles(userId, (roles) => {
                log('加载到角色数量: ' + roles.length);
                for (let i = 0; i < roles.length; i++) {
                    this.addRoleItem(roles[i], i);
                }
            });
        } else {
            // 网页模式模拟
            log('网页模式：显示模拟角色');
        }
    }

    // 添加单个角色到列表
    private addRoleItem(role: any, index: number): void {
        if (!this.roleOptionPrefab || !this.roleListContainer) return;
        
        const item = instantiate(this.roleOptionPrefab);
        this.roleListContainer.addChild(item);
        
        // 设置角色名（假设预制体上有Label组件）
        const label = item.getComponent(Label);
        if (label) {
            const raceName = role.race || '未知';
            const level = role.level || 1;
            const remainingExp = role.remainingExp || 0;
            label.string = `${role.name} (${raceName}) Lv.${level} 经验:${remainingExp}`;
        }
        
        // 确保有Button组件（点击进入游戏）
        let btn = item.getComponent(Button);
        if (!btn) {
            btn = item.addComponent(Button);
        }
        
        // 点击进入游戏
        btn.node.on(Button.EventType.CLICK, () => {
            log('点击角色: ' + role.name);
            this.enterGame(role.roleId);
        }, this);
        
        // 查找删除按钮（子节点，名字为DeleteBtn）
        const deleteBtnNode = item.getChildByName('DeleteBtn');
        if (deleteBtnNode) {
            const deleteBtn = deleteBtnNode.getComponent(Button);
            if (deleteBtn) {
                deleteBtn.node.on(Button.EventType.CLICK, (event) => {
                    event.propagationStopped = true;
                    this.showDeleteConfirmDialog(role, item);
                }, this);
            }
        }
    }
    
    // 显示删除确认弹窗
    private _pendingDeleteRole: any = null;
    private _currentDeleteItem: Node = null!;
    
    private showDeleteConfirmDialog(role: any, roleItem: Node): void {
        this._pendingDeleteRole = role;
        this._currentDeleteItem = roleItem;
        
        const panel = roleItem.getChildByName('DeleteConfirmPanel');
        if (!panel) {
            return;
        }
        
        panel.active = true;
        
        const confirmBox = panel.getChildByName('ConfirmBox');
        
        const roleNameLabel = confirmBox?.getChildByName('RoleNameLabel');
        if (roleNameLabel) {
            const label = roleNameLabel.getComponent(Label);
            if (label) {
                label.string = '【' + (role.name || '未知') + '】';
            }
        }
        
        const titleLabel = confirmBox?.getChildByName('TitleLabel');
        if (titleLabel) {
            const label = titleLabel.getComponent(Label);
            if (label) {
                label.string = '确认删除角色';
            }
        }
        
        const confirmBtn = confirmBox?.getChildByName('ConfirmBtn');
        if (confirmBtn) {
            const btn = confirmBtn.getComponent(Button);
            if (btn) {
                btn.node.off('click');
                btn.node.on('click', () => { this.onConfirmDelete(); });
            }
        }
        
        const cancelBtn = confirmBox?.getChildByName('CancelBtn');
        if (cancelBtn) {
            const btn = cancelBtn.getComponent(Button);
            if (btn) {
                btn.node.off('click');
                btn.node.on('click', () => { this.closeDeleteConfirm(); });
            }
        }
        
        const maskBg = panel.getChildByName('MaskBg');
        if (maskBg) {
            const btn = maskBg.getComponent(Button);
            if (btn) {
                btn.node.off('click');
                btn.node.on('click', () => { this.closeDeleteConfirm(); });
            }
        }
    }
    // 关闭确认弹窗
    private closeDeleteConfirm(): void {
        this._pendingDeleteRole = null;
        if (this._currentDeleteItem) {
            const panel = this._currentDeleteItem.getChildByName('DeleteConfirmPanel');
            if (panel) {
                panel.active = false;
            }
        }
        this._currentDeleteItem = null;
    }
    
    // 确认删除
    private onConfirmDelete(): void {
        const role = this._pendingDeleteRole;
        if (!role) return;
        
        // 关闭弹窗
        this.closeDeleteConfirm();
        
        // 调用API删除
        if (sys.isNative && DatabaseManager.instance) {
            DatabaseManager.instance.deleteRole(role.roleId, this.currentUserId, (success, result) => {
                if (success) {
                    this.showTip('删除成功: ' + role.name, true);
                    this.loadRoleList();
                } else {
                    this.showTip('删除失败: ' + (result?.msg || '未知错误'), false);
                }
            });
        } else {
            this.showTip('模拟删除: ' + role.name, true);
            this.loadRoleList();
        }
    }

    // 进入游戏
    private enterGame(roleId: string): void {
        log('选择角色进入游戏: ' + roleId);
        // 设置待加载的角色ID（通过静态变量传递）
        MainHallManager.pendingRoleId = roleId;
        director.loadScene('MainHall');
    }

    private showRegisterSuccessPopup(userId: string, account: string): void {
        this.registerSuccessPopup.active = true;
        this.registerForm.active = false;
        if (this.popupIdLabel) this.popupIdLabel.string = "ID: " + userId;
        if (this.popupAccountLabel) this.popupAccountLabel.string = "账号: " + account;
    }

    public onClosePopupBtnClick(): void {
        this.registerSuccessPopup.active = false;
        this.jumpToRoleSelectPanel();
    }

    private _tipLines: string[] = [];
    
    private showTip(text: string, isSuccess: boolean = false): void {
        if (this.tipLabel) {
            // 取消之前的定时器
            this.unscheduleAllCallbacks();
            
            // 添加新行（最多保留最近10行）
            this._tipLines.push(text);
            if (this._tipLines.length > 10) {
                this._tipLines.shift();
            }
            
            this.tipLabel.string = this._tipLines.join('\n');
            this.tipLabel.color.set(isSuccess ? 0 : 255, isSuccess ? 255 : 0, 0);
            this.scheduleOnce(() => this.clearTip(), 8);
        } else {
            log("提示: " + text);
        }
    }
    
    private clearTip(): void { 
        this._tipLines = [];
        if (this.tipLabel) this.tipLabel.string = ""; 
    }

    private showRegError(text: string): void {
        this.regErrorLabel.string = text;
        this.regErrorLabel.color.set(255, 0, 0);
    }

    private clearRegError(): void { 
        if (this.regErrorLabel) this.regErrorLabel.string = ""; 
        if (this.passwordLabel) this.passwordLabel.string = "";
    }

    public onLoginBtnClick(): void {
        try {
            const account = this.loginAccountEdit.string.trim();
            const password = this.loginPasswordEdit.string.trim();
            if (!account || !password) { this.showTip("账号密码不能为空！"); return; }

            if (!sys.isNative) {
                const isLoginSuccess = this.mockUsers.has(account) && this.mockUsers.get(account) === password;
                if (isLoginSuccess) { this.showTip("登录成功！", true); this.jumpToRoleSelectPanel(); }
                else { this.showTip("账号或密码错误！"); }
                return;
            }

            DatabaseManager.instance?.loginCheck(account, password, (user) => {
                if (user) { 
                    this.currentUserId = user.userId;
                    this.showTip("登录成功！ID：" + user.userId, true); 
                    this.jumpToRoleSelectPanel(); 
                }
                else { this.showTip("账号或密码错误！"); }
            });
        } catch (e) { this.showTip("登录异常：" + (e as Error).message); }
    }

    public onRegisterSubmitBtnClick(): void {
        try {
            const account = this.regAccountEdit.string.trim();
            const password = this.regPasswordEdit.string.trim();
            this.clearRegError();
            if (!account || !password) { this.showRegError("账号密码不能为空！"); return; }
            if (password.length < 6) { this.showRegError("密码至少6位！"); return; }

            if (this.passwordLabel) this.passwordLabel.string = "注册密码：" + password;

            if (!sys.isNative) {
                if (this.mockUsers.has(account)) { this.showRegError("账号已注册！"); return; }
                const userId = this.generate8DigitId();
                this.mockUsers.set(account, password);
                this.showTip("注册成功！", true);
                this.showRegisterSuccessPopup(userId, account);
                this.regAccountEdit.string = ""; 
                this.regPasswordEdit.string = "";
                return;
            }

            if (!DatabaseManager.instance) { this.showRegError("数据库未初始化"); return; }

            DatabaseManager.instance.checkAccountExist(account, (exist) => {
                if (exist) { this.showRegError("账号已注册！"); return; }
                const userId = this.generate8DigitId();
                DatabaseManager.instance!.registerUser(userId, account, password, (success) => {
                    if (success) { this.showTip("注册成功！数据已写入数据库", true); this.showRegisterSuccessPopup(userId, account); this.regAccountEdit.string = ""; this.regPasswordEdit.string = ""; }
                    else { this.showRegError("注册失败：数据库写入失败"); }
                });
            });
        } catch (e) { error("注册异常:" + (e as Error).message); this.showRegError("注册异常:" + (e as Error).message); }
    }

    // 获取角色栏位数（简化版：默认3个，不从数据库查）
    private getRoleSlotCount(): number {
        return 3;
    }

    // 获取当前用户的角色数
    private getCurrentRoleCount(): number {
        // 简化：默认0，实际应该从数据库查询
        return 0;
    }


    // 创建角色确认按钮点击
    public onConfirmCreateRoleBtnClick(): void {
        // 验证输入
        const roleName = this.roleNameEdit ? this.roleNameEdit.string.trim() : '';
        if (!roleName) {
            this.showTip("请输入角色名！");
            return;
        }
        
        if (!this.selectedRace) {
            this.showTip("请选择种族！");
            return;
        }
        
        const race = this.selectedRace;
        const userId = this.currentUserId || '33310722';
        const avatarImage = this.selectedImageCode || 'img_default';
        
        this.showTip("正在创建...");
        
        // 调用数据库
        if (sys.isNative && DatabaseManager.instance) {
            DatabaseManager.instance.createRole(
                userId, roleName, race, '暂无',
                avatarImage, avatarImage, avatarImage,
                this.previewAttrs, this.previewUpgrades, this.previewExp,
                (success, roleId, errorMsg) => {
                    if (success) {
                        this.showTip("创建成功！");
                    } else {
                        this.showTip("创建失败: " + (errorMsg || "未知错误"));
                    }
                }
            );
        }
        
        // 创建成功后跳转
        setTimeout(() => {
            // 隐藏创建角色面板，显示角色选择面板
            this.showAllPanel(false);
            this.roleSelectPanel.active = true;
            // 重新加载角色列表
            this.loadRoleList();
        }, 1500);
    }

    private generate8DigitId(): string {
        let id = '';
        for (let i = 0; i < 8; i++) id += Math.floor(Math.random() * 10);
        return id;
    }
}
