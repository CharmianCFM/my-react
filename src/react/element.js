class Element {
    constructor(type, props) {
        this.type = type;
        this.props = props;
    }
}

// 返回虚拟 dom 用对象来描述元素
export default function createElement(type, props, ...children) {
    props = props || {};
    props.children = children;
    // console.log('type, props', type, props)
    return new Element(type, props);
}


{/* <div name="XXX">say<button>hello a</button></div> */}

// babel 编译后的效果
// React.createElement('div', {name: "XXX"}, "hello", React.createElement("span", null, "123"))
// createElement 返回如下虚拟 dom 对象
// let a = {
//     type: 'div',
//     props: {
//         name: 'XXX',
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