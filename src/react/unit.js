import $ from 'jquery';
import {Element} from './element.js';
import types from './types.js';
// 差异队列
let diffQueue = [];
// 更新的层级
let updateDepth = 0;

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
        // 存储渲染的儿子节点 unit
        this._renderedChildrenUnits = [];
        for(let propName in props) {
            if(/^on[A-Z]/.test(propName)) {
                // <button data-reactid="0.1" onclick="function" say()="" {="" alert('hello');="" }=""><span data-reactid="0.1.0">123</span></button>
                // 不能给字符串绑定事件 所以可以用事件委托 绑定到document上面，然后根据id判断真实触发的元素 （react的事件处理机制）
                let eventType = propName.slice(2).toLowerCase();
                $(document).delegate(`[data-reactid="${rootId}"]`, `${eventType}.${rootId}`, props[propName]);
                // $(document).on(eventType, `[data-reactid="${rootId}"]`, props[propName]);
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
                // 循环子节点 
                childStr = props[propName].map((child, index) => {
                    // 1. 渲染子element:即create一个unit
                    let childUnit = createReactUnit(child); //createReactUnit是个递归过程
                    // 记录下来方便后续对child做diff 每个 unit 有一个 mountIndex 属性，指明自己在父节点中的索引位置
                    childUnit._mountIndex = index; 
                    this._renderedChildrenUnits.push(childUnit); 
                    // 2. 调用unit的getMarkUp得到html字符串
                    return childUnit.getMarkUp(`${rootId}.${index}`)
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

    update(nextElement) {
        // 已经通过showDeepCompare比较过两个的type相同了，此处看props（包括属性和children
        let oldProps = this._currentElement.props;
        let newProps = nextElement.props;
        this.updateDomProperties(oldProps, newProps);
        this.updateDomChildren(newProps.children);
    }

    updateDomProperties(oldProps, newProps) {
        let propName;
        for(propName in oldProps) {
            if(!newProps.hasOwnProperty(propName)) { // 移除不存在的属性
                $(`[data-reactid="${this._rootId}"]`).removeAttr(propName);
            }
            if(/^on[A-Z]/.test(propName)) { // 移除事件
                $(document).undelegate(`.${this._rootId}`);
            }
        }
        for(propName in newProps) {
            if(propName === 'children') {
                continue;
            }
            else if(/^on[A-Z]/.test(propName)) {
                let eventType = propName.slice(2).toLowerCase();
                $(document).delegate(`[data-reactid="${this._rootId}"]`, `${eventType}.${this._rootId}`, newProps[propName]);
            }
            else if(propName === 'style') {
                const styleObj = newProps[propName];
                Object.entries(styleObj).map(([attr, value]) => {
                   $(`[data-reactid="${this._rootId}"`).css(attr, value);
                });
            }
            else if(propName === 'className') {
                $(`[data-reactid="${this._rootId}"`).attr('class', newProps[propName]);
            }
            else {
                $(`[data-reactid="${this._rootId}"]`).prop(propName, newProps[propName])
            }
        }
    }

    updateDomChildren(newChildrenElements) {
        updateDepth++;
        // 1. diff 对比新的儿子们和老的 找出差异
        this.diff(diffQueue, newChildrenElements);
        updateDepth--;
        if(updateDepth === 0) {
            // 2. 打补丁（就是修改的意思） 进行删、插元素
            this.patch(diffQueue);
            diffQueue=[];
        }
    }

    patch(diffQueue) {
        // 所有将要删除的节点
        let deleteChildren = [];
        // 暂存能复用的节点
        let deleteMap = {};
        // diffQueue 里面存的是所有的 diff
        for(let i = 0; i < diffQueue.length; i++) {
            let difference = diffQueue[i];
            if(difference.type === types.MOVE || difference.type === types.REMOVE) {
                let fromIndex = difference.fromIndex;
                let oldChild = $(difference.parentNode.children().get(fromIndex));
                // 进行层级的区分
                if(!deleteMap[difference.parentId]) {
                    deleteMap[difference.parentId] = {}
                }
                deleteMap[difference.parentId][fromIndex] = oldChild;
                deleteChildren.push(oldChild);
            }
        }
        // 删除节点
        $.each(deleteChildren, (idx, item) => $(item).remove());
        // 插入节点
        for(let i = 0; i < diffQueue.length; i++) {
            let difference = diffQueue[i];
            const {parentNode, toIndex, markup, fromIndex} = difference;
            switch(difference.type) {
                case types.INSERT:
                    this.insertChildAt(parentNode, toIndex, $(markup));
                break;
                case types.MOVE:
                    this.insertChildAt(parentNode, toIndex, deleteMap[difference.parentId][fromIndex]);
                break;
                default:
                break;
            }
        }
    }

    insertChildAt(parentNode, index, newNode) {
        // 索引 index 的位置有节点就放在节点的前面 ,没有就直接添加子元素
        let oldChild = parentNode.children().get(index);
        oldChild ? newNode.insertBefore(oldChild) : newNode.appendTo(parentNode);
    }

    diff(diffQueue, newChildrenElements) {
        // 1.生成一个老的儿子 unit map
        let oldChildrenUnitMap = this.getOldChildrenMap(this._renderedChildrenUnits);
        // 2.生成一个新的儿子 unit的数组
        let {newChildrenUnits, newChildrenUnitsMap} = this.getNewChildren(oldChildrenUnitMap, newChildrenElements);
        // 上一个已经确定位置的索引
        let lastIndex = 0;
        // 3. 移动或新增节点
        for(let i = 0; i < newChildrenUnits.length; i++) {
            let newUnit = newChildrenUnits[i];
            // 第一个拿到的是key A
            let newKey = (newUnit._currentElement.props && newUnit._currentElement.props.key) || i.toString();
            let oldChildUnit = oldChildrenUnitMap[newKey];
            // 新老一致则复用老节点
            if(oldChildUnit === newUnit) {
                if(oldChildUnit._mountIndex < lastIndex) { // 移动老节点
                    diffQueue.push({
                        parentId: this._rootId,
                        parentNode: $(`[data-reactid="${this._rootId}"]`),
                        type: types.MOVE,
                        fromIndex: oldChildUnit._mountIndex,
                        toIndex: i, // 当前位置
                    })
                }
                // lastIndex取较大值
                lastIndex = Math.max(lastIndex, oldChildUnit._mountIndex);
            }
            else {
                // 老的里面有相同key的 但是节点不相等 删除掉
                if(oldChildUnit) {
                    diffQueue.push({
                        parentId: this._rootId,
                        parentNode: $(`[data-reactid="${this._rootId}"]`),
                        type: types.REMOVE,
                        fromIndex: oldChildUnit._mountIndex,
                    });
                     // 删除节点的时候也要同时删掉对应的 unit
                    this._renderedChildrenUnits = this._renderedChildrenUnits.filter(item => item !== oldChildUnit);
                    $(document).undelegate(`.${oldChildUnit._rootId}`);
                }
                // 新的节点  新增
                diffQueue.push({
                    parentId: this._rootId,
                    parentNode: $(`[data-reactid="${this._rootId}"]`),
                    type: types.INSERT,
                    toIndex: i,
                    markup: newUnit.getMarkUp(`${this._rootId}.${i}`)
                })
            }
            newUnit._mountIndex = i;
        }
        // 4. 删除老的里面未被复用的
        for(let oldKey in oldChildrenUnitMap) {
            let oldChild = oldChildrenUnitMap[oldKey];
            if(!newChildrenUnitsMap.hasOwnProperty(oldKey)) {
                diffQueue.push({
                    parentId: this._rootId,
                    parentNode: $(`[data-reactid="${this._rootId}"]`),
                    type: types.REMOVE,
                    fromIndex: oldChild._mountIndex
                });
                // 删除节点的时候也要同时删掉对应的 unit
                this._renderedChildrenUnits = this._renderedChildrenUnits.filter(item => item !== oldChild);
                // 同时删除事件委托
                $(document).undelegate(`.${oldChild._rootId}`);
            }
        }
    }

    getNewChildren(oldChildrenUnitMap, newChildrenElements) {
        let newChildrenUnits = [],
            newChildrenUnitsMap = {};
        newChildrenElements.forEach((newElement, index) => {
            // 代码里千万要给key属性，否则会走默认的index按顺序比较。调换顺序内容不变的情况下不能复用很浪费
            let newKey = (newElement.props && newElement.props.key) || index.toString();
            // 找到key相同的老的unit
            let oldUnit = oldChildrenUnitMap[newKey]; 
            // 获取老的元素
            let oldElement = oldUnit && oldUnit._currentElement; 
            if(showDeepCompare(oldElement, newElement)) {
                // 更新老的之后放入新的数组里面 复用
                oldUnit.update(newElement); 
                newChildrenUnits.push(oldUnit);
                newChildrenUnitsMap[newKey] = oldUnit;
            }
            else {
                // 老的里面没有此元素则新建
                let nextUnit = createReactUnit(newElement); 
                newChildrenUnits.push(nextUnit);
                newChildrenUnitsMap[newKey] = nextUnit;
                this._renderedChildrenUnits[index] = nextUnit;
            }
        })
        return {newChildrenUnits, newChildrenUnitsMap};
    }

    getOldChildrenMap(childrenUnits=[]) {
        let map = {};
        for(let i = 0; i < childrenUnits.length; i++) {
            let unit = childrenUnits[i];
            // 孩子元素有key用 key，没有 key用 index
            let key = (unit._currentElement.props && unit._currentElement.props.key) || i.toString();
            map[key] = unit;
        }
        return map;
    }
}

// 负责渲染自定义 react 组件 
// (new出一个该类的实例，然后调用render方法，并对render返回的element继续执行此操作)
class ReactCompositUnit extends Unit {

    // this._componentInstance 当前组件的实例
    // this._renderedUnitInstance 当前组件 render 方法执行后返回的 react 元素对应的 unit, unit._currentElement是 react 元素
    getMarkUp(rootId) {
        this._rootId = rootId;
        let {type: Component, props} = this._currentElement;
        // 1. new出一个该react类的实例
        let componentInstance = this._componentInstance = new Component(props);
        // 让组件实例的currentUnit属性等于当前的 unit
        componentInstance._currentUnit = this;
        // 生命周期方法 componentWillMount父类先执行字类再执行
        componentInstance.componentWillMount && componentInstance.componentWillMount();
        // 2. 调用类实例的 render 方法
        let renderedElement = componentInstance.render();
        // 3. 渲染组件render后的返回结果element  即再create一个unit，调用getMarkUp，得到 html字符串
        // render的返回结果 返回的可能是个Dom｜react组件 ｜ 值，实际是个递归过程
        // 先序深度遍历 树 有儿子就进去 出来的时候再绑父亲 再出来再绑父亲
        let renderedUnit = this._renderedUnitInstance = createReactUnit(renderedElement);
        // 4. 调用unit的getMarkUp方法得到html字符串
        let markup = renderedUnit.getMarkUp(rootId);
        // componentDidMount写在此处 因为componentDidMount执行先子后父 在递归后绑定的事件肯定是先子后父
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
        // 更新 state 之后再次调用 render
        let nextRenderElement = this._componentInstance.render();
        // 是否需要进行深比较 
        if(showDeepCompare(preRenderedElement, nextRenderElement)) {
            // 如果可以进行深比较 则把更新的工作交给上次渲染出来的 element 元素对应的 unit 进行处理
            preRenderedUnitInstance.update(nextRenderElement);
            // 执行componentDidUpdate
            this._componentInstance.componentDidUpdate && this._componentInstance.componentDidUpdate();
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
        // Element类的实例 原生dom对象
        return new ReactNativeUnit(element);
    }
    if(element instanceof Element && typeof element.type === 'function') {
        // 自定义react组件 类 {type:Counter, props: {name: 'cfm'}}
        return new ReactCompositUnit(element);
    }
}

export default createReactUnit;