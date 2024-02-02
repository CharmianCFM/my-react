## 初始化项目
```javascript
create-react-app my-app
cd my-app
npm i jquery -S
npm start
```
## 渲染
```javascript
React.render(element,  document.getElementById('root'));
```
### `React.render`
`React.render`方法就是插入一串字符串到root元素中，也就是`innerHTML`
```javascript
import $ from 'jquery';
import createReactUnit from './unit.js';
import createElement from './element.js';
import Component from './component.js';
let React = {
    render,
    nextRootIndex: 0,    // 每个元素的识别码
    createElement,
    Component
}

// element参数 jsx语法 =》 虚拟dom 对象 类（函数）
function render(element, container) {
    // 写一个工厂函数来创建对应的 react 元素
    let createReactUnitInstance = createReactUnit(element);
    let markUp = createReactUnitInstance.getMarkUp(React.nextRootIndex);
    // let markUp = `<span data-reactid=${React.nextRootIndex}>${element}</span>`;
    $(container).html(markUp);
    // 触发 挂载完成方法
    $(document).trigger('mounted');//所有组件都ok了 发布
} 

export default React
```
`element`可以是字符串、原生dom组件<></>、自定义组件（类（函数）---JSX 语法
#### 字符串
```javascript
// let element = 'hello world';
// React.render(element,  document.getElementById('root'));

let markUp = `<span data-reactid=${React.nextRootIndex}>${element}</span>`;
$(container).html(markUp);

```
#### 原生dom组件
```javascript
// JSX
// <div name="XXX" style={{color: 'red'}}>say<button>hello a</button></div>

// babel 编译后的效果  词法分析语法分析等等
// React.createElement('div', {name: "XXX", style:{color: 'red'}}, "say", React.createElement("buttom", null, "hello a"));

function say() {
  alert('hello');
}

let element = React.createElement(
  'div', 
  {name: "XXX", style:{color: 'red'}}, 
  // "hello", React.createElement("button", null, "123")
  "hello", React.createElement("button", {onClick: say}, "123")
);

React.render(element,  document.getElementById('root'));

// createElement 返回如下虚拟dom对象
// {
//   type: 'div',
//   props: {
//     name: 'XXX',
//     children: [
//       'say',
//       {
//         type: 'button',
//         props: {
//           children: ['hello a']
//         }
//       }
//     ]
//   }
// }

```
#### 自定义react组件
```javascript
class SubCounter{
    componentWillMount() {
        console.log('child组件将要挂载')
    }
    componentDidMount() {
        console.log('child挂载完成')
    }
    render() {
        return 123;
    }
}

class Counter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {number: 1};
    }
    componentWillMount() {
        console.log('parent组件将要挂载')
    }
    componentDidMount() {
        console.log('parent挂载完成')
    }
    render() {
        console.log(this.props.name);
        return <SubCounter />;
    }
}

// <Counter name='cfm'></Counter> 
// babel编译之后 
// React.createElement(Counter, {name: 'cfm'})

let element = React.createElement(Counter, {name: 'cfm'});
React.render(element, document.getElementById('root'));

// createElement后就是
// {
//   type: Counter, 
//   props: {
//     name: 'cfm'
//   }
// }
```
### `React.createElement` 
```javascript
class Element {
    constructor(type, props) {
        this.type = type;
        this.props = props;
    }
}

// 返回虚拟 dom 用对象来描述元素
export default function createElement(type, props={}, ...children) {
    props.children = children;
    // console.log('type, props', type, props)
    return new Element(type, props);
}

// <div name="XXX">say<button>hello a</button></div>
  
// let element = React.createElement(
//   'div', 
//   {name: "XXX"}, 
//   "hello", 
//   React.createElement("button", null, "123")
// );

// {
//   type: 'div',
//   props:  {
//     name: "XXX",
//     children: [ 
//       "hello", 
//   		 React.createElement("button", null, "123")]
//   }
// }
```
### `createReactUnit` 工厂函数 
那么，如何把虚拟dom对象（Element实例）转换成可以在页面上显示的html字符串呐？
```javascript
import $ from 'jquery';

class Unit { 
    // 通过父类保存参数
    constructor(element) {
        this._currentElement = element;
    }
}

function createReactUnit(element) {
    if(typeof element === 'string' || typeof element === 'number') {
        // 字符串
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
```
#### 渲染文本
```javascript
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
        return `<span data-reactid=${rootId}>${this._currentElement}</span>`;
    }
}
// dom.dataset.rootId 或 $().data('rootId') 即可获取到元素id
```
#### 渲染原生dom组件(dom元素)
```javascript
import $ from 'jquery';

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
}
```
#### 渲染自定义组件
```javascript
import $ from 'jquery';

// 负责渲染自定义 react 组件 
// (new出一个该类的实例，然后调用render方法，并对render返回的element继续执行此操作)
class ReactCompositUnit extends Unit {
  getMarkUp(rootId) {
    this._rootId = rootId;
    let {type: Component, props} = this._currentElement;
    // 1. new出一个该react类的实例
    let componentInstance = new Component(props);
    // 生命周期方法 componentWillMount父类先执行字类再执行
    componentInstance.componentWillMount && componentInstance.componentWillMount();
    // render的返回结果 可能是各种类型(值、native：<div></div>、组件)  counter类返回的是number
    // 2. 调用类实例的 render 方法
    let reactComponentRenderer = componentInstance.render();
    // 3. 渲染组件render后的返回结果  即再create一个unit
    // 这是个递归过程 --先序深度遍历 树的遍历 有儿子就进去 出来的时候再绑父亲 再出来再绑父亲
    let createReactUnitInstance = createReactUnit(reactComponentRenderer);
    // 4. 调用unit的getMarkUp方法得到html字符串
    let markup = createReactUnitInstance.getMarkUp(rootId);
    // componentDidMount写在此处 因为componentDidMount执行先子后父  在递归后绑定的事件肯定是先子后父
    $(document).on('mounted', () => {
        componentInstance.componentDidMount && componentInstance.componentDidMount();
    })
    return markup;
  }
}
```
注意： 生命周期函数，componentWillMount，在 getMarkUp的时候执行。
## react重构-类图
![](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706810907577-e2c2e165-7ae0-4ee6-a5e2-0c3e94ed271e.jpeg)
## rootId 示例图
![](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706677271693-a8a27b58-e66f-4086-bc05-bf33e69f8e22.jpeg)
## 事件委托
点击了页面中的某个 button之后，事件会冒泡一层层向上传递给 document，document 会判断事件源，如果事件源的元素id就是绑定的rootId，则会执行该rootId元素绑定的事件处理函数。
```javascript
// 当单击 <div> 元素内部的 <p> 元素时，改变所有 <p> 元素的背景颜色：
$("div").delegate("p","click",function(){
    $("p").css("background-color","pink");
});

$(document).delegate(`[data-reactid="${rootId}"]`, `${eventType}.${rootId}`, props[propName]);
```
jquery delegate方法：为指定的元素（属于被选元素的子元素）添加一个或多个事件处理程序，并规定当这些事件发生时运行的函数。（[jquery on方法](https://www.runoob.com/jquery/event-on.html) 更推荐）
使用 delegate() 方法的事件处理程序适用于当前或未来的元素（比如由脚本创建的新元素）。
undelegate方法:删除事件。 比如dom diff的时候删除了元素，可根据命名空间的rootid删除相关事件
.foo .bar .reactId 是命名空间。 reactId也就是上面设置的 rootId如1.0
![百度网盘 3.jpeg](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706680730079-2e879611-6363-4991-81ab-73cc319fb3e1.jpeg#averageHue=%2336392b&clientId=u1b1268c8-1eda-4&from=drop&id=u38e8544a&originHeight=1007&originWidth=1372&originalType=binary&ratio=2&rotation=0&showTitle=false&size=809660&status=done&style=none&taskId=u72cecf85-69de-4645-af5d-b21b5f0f43d&title=)![百度网盘 2.jpeg](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706680659134-daf0980e-4b57-42d1-969d-64e99dcd23ec.jpeg#averageHue=%233f3a2e&clientId=u1b1268c8-1eda-4&from=drop&id=u973eae6d&originHeight=874&originWidth=1427&originalType=binary&ratio=2&rotation=0&showTitle=false&size=608216&status=done&style=none&taskId=ua7d23206-07b3-4e54-94c2-0725d16dbbf&title=)
## 实现 setState
```javascript
class Counter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {number: 0};
    }
    componentWillMount() {
        console.log('child组件将要挂载')
    }
    componentDidMount() {
        console.log('child挂载完成')
    }
    increment = () => {
        this.setState({
            number: this.state.number + 1
        })
    }
    render() {
        let p = React.createElement('p', {}, this.state.number);
        let button = React.createElement('button', {onClick: this.increment}, '+');
        return React.createElement('div', {id: 'counter', style:{backgroundColor: this.state.number%2==0 ? 'green':'red'}}, p, button);
    }
}
// <Counter name='cfm'></Counter> 
// babel编译之后 React.createElement(Counter, {name: 'cfm'})
// 对应的element就是{type: Counter, props: {name: 'cfm'}}
let element = React.createElement(Counter, {name: 'cfm'});
React.render(element,  document.getElementById('root'));
```
### React.component
```javascript
class Component{
    constructor(props) {
        // 每个实例都有一个 props 属性
        this.props = props;
    }
    setState(partialState) {
        // 第一个参数新的元素 第二个参数是新的状态 
        // 更新操作交给 Component 实例对应的 unit去做
        this._currentUnit.update(null, partialState)
    }
}
export default Component;
```
setState肯定先进去ReactCompositUnit的update(), 如果新的 element type相同，就交给unit 自己的 update 方法自行更新。
```javascript
// 更新字符串内容
update(nextElement) {
    if(this._currentElement !== nextElement) {
        this._currentElement = nextElement;
        $(`[data-reactid="${this._rootId}"]`).html(this._currentElement);
    }
}
```
## update更新
```javascript
import $ from 'jquery';
import {Element} from './element.js';
import types from './types.js';
// 差异队列
let diffQueue = [];
// 更新的层级
let updateDepth = 0;

class ReactCompositUnit extends Unit {
  // ...
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
```
## update: 对比属性+对比子元素
```javascript
update(nextElement) {
  // 已经通过showDeepCompare比较过两个的type相同了，此处看props（包括属性和children）
  let oldProps = this._currentElement.props;
  let newProps = nextElement.props;
  this.updateDomProperties(oldProps, newProps);
  this.updateDomChildren(newProps.children);
}

// 更新属性
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

// 更新 children
updateDomChildren(newChildrenElements) {
    updateDepth++;
    // 1. diff 对比新的儿子们和老的 找出差异 存到diffQueue中
    this.diff(diffQueue, newChildrenElements);
    updateDepth--;
    if(updateDepth === 0) {
        // 2. 打补丁（就是修改的意思） 进行删、插元素
        this.patch(diffQueue);
        diffQueue=[];
    }
}
```
## diff 获得补丁数组diffQueue
```javascript
export default {
    MOVE: 'MOVE',
    INSERT: 'INSERT',
    REMOVE: 'REMOVE'
}
```
```javascript
diff(diffQueue, newChildrenElements) {
  // 1.生成一个老的儿子 unit map  // A B C D
  let oldChildrenUnitMap = this.getOldChildrenMap(this._renderedChildrenUnits);
  // 2.生成一个新的儿子unit的数组和映射 其中进行了复用和新建unit的操作 // A C B E F
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
          // 老节点挂载的index比lastIndex小的时候 移动老节点到当前位置
          if(oldChildUnit._mountIndex < lastIndex) { 
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
          // 老的里面有相同key的 但是节点不相等 删除掉老节点 新建
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
          // 老的里面没有相同key的 新增
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
        // 新旧element类型是否相同
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

// key unit 映射
getOldChildrenMap(childrenUnits=[]) {
    let map = {};
    for(let i = 0; i < childrenUnits.length; i++) {
        let unit = childrenUnits[i];
        // 孩子元素有key用key，没有key用index
        let key = (unit._currentElement.props && unit._currentElement.props.key) || i.toString();
        map[key] = unit;
    }
    return map;
}
```
## domdiff策略
![IMG_0009.jpg](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706809665076-d1ee2438-ff2e-42bf-8c3e-e4f9ca0d2373.jpeg#averageHue=%23fafafa&clientId=ub930ed60-4777-4&from=drop&height=348&id=u1610b273&originHeight=832&originWidth=889&originalType=binary&ratio=2&rotation=0&showTitle=false&size=95643&status=done&style=none&taskId=ud8a43ce5-3f13-4ee5-93ce-e4d21a55ecf&title=&width=372)![IMG_0008.jpg](https://cdn.nlark.com/yuque/0/2024/jpeg/40468162/1706809720695-f1346c18-396e-4e6e-9c47-d98787ee73a8.jpeg#averageHue=%23beb9ad&clientId=ub930ed60-4777-4&from=drop&id=u471d8e6a&originHeight=1020&originWidth=2148&originalType=binary&ratio=2&rotation=0&showTitle=false&size=1237717&status=done&style=none&taskId=u6d51a6d5-fb17-426d-add5-d592282db50&title=)
##  打补丁
```javascript
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
    // 索引index的位置有节点就放在节点的前面 ,没有就直接添加子元素
    let oldChild = parentNode.children().get(index);
    oldChild ? newNode.insertBefore(oldChild) : newNode.appendTo(parentNode);
}
```
