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
    // let markUp = `<span data-reactid=${React.nextRootIndex}>${element}</span>`;
    // 写一个工厂函数来创建对应的 react 元素
    let createReactUnitInstance = createReactUnit(element);
    let markUp = createReactUnitInstance.getMarkUp(React.nextRootIndex);
    $(container).html(markUp);
    // 触发 挂载完成方法
    $(document).trigger('mounted');//所有组件都ok了 发布
} 

export default React