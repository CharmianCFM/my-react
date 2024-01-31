import $ from 'jquery';
class Unit { 
    // 通过父类保存参数
    constructor(element) {
        this.currentElement = element;
    }
}
// 渲染字符串
class ReactTextUnit extends Unit {
    // 可以省略的 默认行为
    // constructor(element) {
    //     super(element);
    // }

    getMarkUp(rootId) { 
        // 保存当前元素的id
        this._rootId = rootId;
        // 返回当前元素对应的html脚本
        return `<span data-reactid=${rootId}>${this.currentElement}</span>`;
    }
}
// 渲染原生dom组件
class ReactNativeUnit extends Unit {
    getMarkUp(rootId) { 
        this._rootId = rootId;
        let {type, props} = this.currentElement; // div name data-reactid
        let tagStart = `<${type} data-reactid="${rootId}"`;
        let tagEnd = `</${type}>`;
        let contentStr = '';
        for(let propName in props) {
            if(/on[A-Z]/.test(propName)) {
                // <button data-reactid="0.1" onclick="function" say()="" {="" alert('hello');="" }=""><span data-reactid="0.1.0">123</span></button>
                // 不能给字符串绑定事件 所以可以用事件委托 绑定到document上面，然后根据id判断真实触发的元素 （react的事件处理机制）
                let eventType = propName.slice(2).toLowerCase();
                $(document).on(eventType, `[data-reactid="${rootId}"]`, props[propName]);
            }
            else if(propName === 'children') {
                // 递归循环子节点
                contentStr = props[propName].map((child, index) => {
                    let childInstance = createReactUnit(child);
                    return childInstance.getMarkUp(`${rootId}.${index}`)
                }).join('');
            }
            else {
                // 拼接属性
                tagStart += (` ${propName}=${props[propName]}`)
            }
        }
        // 返回拼接后的字符串
        return `${tagStart}>${contentStr}${tagEnd}`
    }
}

// 负责渲染自定义 react 组件 (new出一个该类的实例，然后调用 render 方法)
class ReactCompositUnit extends Unit {
    getMarkUp(rootId) {
        this._rootId = rootId;
        let {type: Component, props} = this.currentElement;
        let componentInstance = new Component(props);
        // 声明周期方法 componentWillMount父类先执行字类再执行
        componentInstance.componentWillMount && componentInstance.componentWillMount();
        // 下面这种写法在此处不能实现componentDidMount父类先执行字类再执行先执行child的再执行parent的
        // $(document).on('mounted', () => {
        //     componentInstance.componentDidMount && componentInstance.componentDidMount();
        // })
       
        // render的返回结果 可能是各种类型(值、native：<div></div>、组件)  counter类返回的是number
        let reactComponentRenderer = componentInstance.render();
        // 递归渲染 组件render后的返回结果
        let createReactUnitInstance = createReactUnit(reactComponentRenderer);
        // 先序深度遍历 树的遍历 有儿子就进去 出来的时候再绑父亲 再出来再绑父亲
        let markup = createReactUnitInstance.getMarkUp(rootId);
        // componentDidMount写在此处  在递归后绑定的事件肯定是先子后父
        $(document).on('mounted', () => {
            componentInstance.componentDidMount && componentInstance.componentDidMount();
        })
        return markup;
    }
}

function createReactUnit(element) {
    if(typeof element === 'string' || typeof element === 'number') {
        return new ReactTextUnit(element);
    }
    if(typeof element === 'object' && typeof element.type === 'string') {
        // Element类的实例 虚拟dom对象
        return new ReactNativeUnit(element);
    }
    if(typeof element === 'object' && typeof element.type === 'function') {
        // 类 {type:Counter, props: {name: 'cfm'}}
        return new ReactCompositUnit(element);
    }
}

export default createReactUnit;