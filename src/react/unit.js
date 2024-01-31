import $ from 'jquery';
import {Element} from './element.js';

class Unit { 
    // 通过父类保存参数
    constructor(element) {
        // 下划线开头表示私有属性
        this._currentElement = element;
    }
    getMarkUp(rootId) {
        // 其实是ts的 abstract 抽象方法
        throw new Error('字类必需实现此方法');
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
        return `<span data-reactid="${rootId}">${this._currentElement}</span>`;
        // dom.dataset.rootId 或 $().data('rootId') 即可获取到元素id
    }
    // 更新字符串内容
    update(nextElement) {
        console.log(nextElement)
        if(this._currentElement !== nextElement) {
            this._currentElement = nextElement;
            $(`[data-reactid="${this._rootId}"]`).html(this._currentElement);
        }
    }
}
// 渲染原生dom组件
class ReactNativeUnit extends Unit {
    getMarkUp(rootId) { 
        this._rootId = rootId;
        let {type, props} = this._currentElement; // div {name data-reactid}
        let tagStart = `<${type} data-reactid="${rootId}"`;
        let tagEnd = `</${type}>`;
        let childStr = '';
        for(let propName in props) {
            if(/^on[A-Z]/.test(propName)) {
                // <button data-reactid="0.1" onclick="function" say()="" {="" alert('hello');="" }=""><span data-reactid="0.1.0">123</span></button>
                // 不能给字符串绑定事件 所以可以用事件委托 绑定到document上面，然后根据id判断真实触发的元素 （react的事件处理机制）
                let eventType = propName.slice(2).toLowerCase();
                // $(document).delegate(`[data-reactid="${rootId}"]`, `${eventType}.${rootId}`, props[propName]);
                $(document).on(eventType, `[data-reactid="${rootId}"]`, props[propName]);
            }
            else if(propName === 'style') { 
                // 样式对象
                const styleObj = props[propName];
                const styleValueStr = Object.entries(styleObj).map(([attr, value]) => {
                    attr = attr.replace(/[A-Z]/g, matched => `-${matched.toLowerCase()}`);
                    return `${attr}:${value}`;
                }).join(';');
                tagStart += (` style="${styleValueStr}" `);
            }
            else if(propName === 'className') {
                // 类名 使用className是为了避免与关键词class冲突
                tagStart += (` class="${props[propName]}" `);
            }
            else if(propName === 'children') {
                // console.log('-----', props[propName]) 
                // children: ['hello', element]
                // element如下
                // {
                //     "type": "button",
                //     "props": {
                //         "onClick": say();
                //         "children": [
                //             "123"
                //         ]
                //     }
                // }
                // 递归循环子节点 
                childStr = props[propName].map((child, index) => {
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
        return `${tagStart}>${childStr}${tagEnd}`
    }
}

// 负责渲染自定义 react 组件 (new出一个该类的实例，然后调用 render 方法)
class ReactCompositUnit extends Unit {

    // this._componentInstance 当前组件的实例
    // this._renderedUnitInstance 当前组件 render 方法执行后返回的 react 元素对应的 unit, unit._currentElement是 react 元素
    getMarkUp(rootId) {
        this._rootId = rootId;
        let {type: Component, props} = this._currentElement;
        let componentInstance = this._componentInstance = new Component(props);
        // 让组件实例的currentUnit属性等于当前的 unit
        componentInstance._currentUnit = this;
        // 声明周期方法 componentWillMount父类先执行字类再执行
        componentInstance.componentWillMount && componentInstance.componentWillMount();
        // 下面写法在此处不能实现componentDidMount父类先执行字类再执行先执行child的再执行parent的
        // $(document).on('mounted', () => {
        //     componentInstance.componentDidMount && componentInstance.componentDidMount();
        // })
       
        // render的返回结果 可能是各种类型(值、native：<div></div>、组件)  counter类返回的是number
        let renderedElement = componentInstance.render();
        // 递归渲染 组件render后的返回结果
        let renderedUnit = this._renderedUnitInstance = createReactUnit(renderedElement);
        // 先序深度遍历 树 有儿子就进去 出来的时候再绑父亲 再出来再绑父亲
        let markup = renderedUnit.getMarkUp(rootId);
        // componentDidMount写在此处  在递归后绑定的事件肯定是先子后父
        $(document).on('mounted', () => {
            componentInstance.componentDidMount && componentInstance.componentDidMount();
        })
        return markup;
    }

    // 处理组件的更新操作
    update(nextElement, partialState) {
        // 先获取到新的元素
        this._currentElement = nextElement || this._currentElement;
        // 获取新的状态 不管是否更新，组件的 state 一定会更改
        let nextState = this._componentInstance.state = Object.assign(this._componentInstance.state, partialState);
        // 新的属性对象
        let nextProps = this._currentElement.props;
        // shouldComponentUpdate决定是否更新
        if(this._componentInstance.shouldComponentUpdate && !this._componentInstance.shouldComponentUpdate(nextProps, nextState)) {
            return;
        }
        // 进行比较更新 上次渲染的 unit
        let preRenderedUnitInstance = this._renderedUnitInstance;
        // 上次渲染的元素
        let preRenderedElement = preRenderedUnitInstance._currentElement;
        let nextRenderElement = this._componentInstance.render();
        // 是否需要进行深比较 
        if(showDeepCompare(preRenderedElement, nextRenderElement)) {
            // 如果可以进行深比较 则把更新的工作交给上次渲染出来的 element 元素对应的 unit 进行处理
            preRenderedUnitInstance.update(nextRenderElement);
            // 执行shouldComponentUpdate
            this._componentInstance.shouldComponentUpdate && this._componentInstance.shouldComponentUpdate();
        }
        else {
            // 如果两个元素连类型都不一样，无需比较直接干掉老的元素新建新的
            this._renderedUnitInstance = createReactUnit(nextRenderElement);
            let nextMarkUp = this._renderedUnitInstance.getMarkUp(this._rootId);
            $(`[date-reactid]="${this._rootId}"]`).replaceWith(nextMarkUp);
        }
    }
}

// 判断两个元素的类型是否一样
function showDeepCompare (oldElement, newElement) {
    if(oldElement != null && newElement != null) {
        let oldType = typeof oldElement;
        let newType = typeof newElement;
        if(['string', 'number'].includes(oldType) && ['string', 'number'].includes(newType)) {
            return true;
        }
        if(oldElement instanceof Element && newElement instanceof Element) {
            return oldElement.type == newElement.type;
        }
    }
    return false;
}

function createReactUnit(element) {
    if(typeof element === 'string' || typeof element === 'number') {
        return new ReactTextUnit(element);
    }
    if(element instanceof Element && typeof element.type === 'string') {
        // Element类的实例 虚拟dom对象
        return new ReactNativeUnit(element);
    }
    if(element instanceof Element && typeof element.type === 'function') {
        // 类 {type:Counter, props: {name: 'cfm'}}
        return new ReactCompositUnit(element);
    }
}

export default createReactUnit;