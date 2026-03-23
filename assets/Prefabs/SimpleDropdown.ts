import { _decorator, Component, Node, Label, Button, Sprite, Prefab, Layout, sys, log } from 'cc';
const { ccclass, property } = _decorator;
import { instantiate } from 'cc';

@ccclass('SimpleDropdown')
export class SimpleDropdown extends Component {
    @property(Button) triggerBtn: Button = null!;
    @property(Label) triggerLabel: Label = null!;
    @property(Node) dropdownPanel: Node = null!;
    @property(Layout) contentLayout: Layout = null!;
    @property(Prefab) optionPrefab: Prefab = null!;

    private options: string[] = [];
    private _onSelect: ((text: string) => void) | null = null;
    private _currentValue: string = '';

    // 初始化下拉框
    init(options: string[], defaultValue: string, onSelect: (text: string) => void) {
        this.options = options;
        this._onSelect = onSelect;
        this._currentValue = defaultValue;

        // 显示默认值
        if (this.triggerLabel) {
            this.triggerLabel.string = defaultValue;
        }

        // 绑定触发按钮点击
        if (this.triggerBtn) {
            this.triggerBtn.node.on(Button.EventType.CLICK, this.toggle, this);
        }

        // 生成选项（使用Layout自动排版）
        this.refreshOptions();

        // 默认隐藏
        if (this.dropdownPanel) {
            this.dropdownPanel.active = false;
        }
    }

    toggle() {
        if (!this.dropdownPanel) return;
        this.dropdownPanel.active = !this.dropdownPanel.active;
    }

    refreshOptions() {
        if (!this.contentLayout || !this.optionPrefab) return;
        
        // 清空现有选项
        const children = this.contentLayout.node.children;
        for (const child of children) {
            child.destroy();
        }

        // 创建新选项
        for (const opt of this.options) {
            const item = instantiate(this.optionPrefab);
            this.contentLayout.node.addChild(item);
            
            // 获取或添加Label
            let label = item.getComponent(Label);
            if (!label) {
                label = item.addComponent(Label);
            }
            label.string = opt;

            // 确保有Button组件可以点击
            let btn = item.getComponent(Button);
            if (!btn) {
                btn = item.addComponent(Button);
            }

            // 点击选择
            item.on(Node.EventType.CLICK, () => {
                this.select(opt);
            }, this);
        }

        // 刷新Layout布局
        this.contentLayout.updateLayout();
    }

    select(text: string) {
        this._currentValue = text;
        if (this.triggerLabel) {
            this.triggerLabel.string = text;
        }
        if (this.dropdownPanel) {
            this.dropdownPanel.active = false;
        }
        if (this._onSelect) {
            this._onSelect(text);
        }
    }

    getValue(): string {
        return this._currentValue;
    }
}
