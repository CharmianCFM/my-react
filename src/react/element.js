export class Element {
    constructor(type, props) {
        this.type = type;
        this.props = props;
    }
}

// 返回虚拟 dom 用对象来描述元素
export function createElement(type, props={}, ...children) {
    props.children = children;
    // console.log('type, props', type, props)
    return new Element(type, props);
}

// jsx
{/* <div name="XXX" style={{color: 'red'}}>say<button>hello a</button></div> */}

// babel 编译后的效果
// React.createElement('div', {name: "XXX", style: {color: 'red'}}, "hello", React.createElement("span", null, "123"))

// 对应的 虚拟 dom 对象如下
// let a = {
//     type: 'div',
//     props: {
//         name: 'XXX',
//         style: {color: 'red'},
//         children: [
//             'say',
//             {
//                 type: 'button',
//                 props: {
//                     children: ['hello a']
//                 }
//             }
//         ]
//     }
// }