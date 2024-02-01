import React from './react'; // React V15.3  读源码的时候可以从 0.3 读

// domdiff demo 2
class Todo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            list:[],
            text: ''
        };
    }

    onChange = (e) => {
        this.setState({text: e.target.value});
    }

    handleClick = (e) => {
        let {text, list} = this.state;
        this.setState({
            list: [...list, text],
            text: '',
        })
    }

    onDel = (index) => {
        const {list} = this.state;
        this.setState({
            list: [...list.slice(0, index), ...list.slice(index+1)]
        })
    }

    render() {
        let input = React.createElement('input', {onKeyup: this.onChange, value: this.state.text})
        let button = React.createElement('button', {onClick: this.handleClick}, '+')
        let lists = this.state.list.map((item, index) => {
            return React.createElement('li', {}, item, React.createElement('button', {onClick: () => this.onDel(index)}, '-'));
        })
        return React.createElement('div', {}, input, button, React.createElement('ul', {}, ...lists));
    }
}
// 增删一条就只有一条 diffQueue 性能还是挺好的 
// 最怕的就是第六个要去第一个 需要 move 5 次 即前面的都需要 move
let element = React.createElement(Todo, {name: 'todos'});
React.render(element,  document.getElementById('root'));


// domdiff demo 1
// class Counter extends React.Component {
//     constructor(props) {
//         super(props);
//         this.state = {odd: true};
//     }
//     componentDidMount() {
//         setTimeout(() => {
//             this.setState({
//                 odd: !this.state.odd,
//             })
//         }, 1000);
//     }
//     shouldComponentUpdate(nextProps, nextState) {
//         return true;
//     }
//     render() {
//         if(this.state.odd) {
//             return React.createElement('ul', {id: 'oldCounter'},
//                 React.createElement('li', {key: 'A'}, 'A'),
//                 React.createElement('li', {key: 'B'}, 'B'),
//                 React.createElement('li', {key: 'C'}, 'C'),
//                 React.createElement('li', {key: 'D'}, 'D'),
//             )
//         }
//         else {
//             return React.createElement('ul', {id: 'newCounter'},
//                 React.createElement('span', {key: 'A'}, 'A1'),
//                 React.createElement('li', {key: 'C'}, 'C1'),
//                 React.createElement('li', {key: 'B'}, 'B1'),
//                 React.createElement('li', {key: 'E'}, 'E1'),
//                 React.createElement('li', {key: 'F'}, 'D'),
//             )
//         }
//     }
// }
// let element = React.createElement(Counter, {name: 'cfm'});
// React.render(element,  document.getElementById('root'));

// A B C D
// 到
// A C B E F

// diffQueue:
// {parentId: 0, parentNode: j…y.fn.init, type: 'MOVE', fromIndex: 1, toIndex: 2}
// {parentId: 0, parentNode: j…y.fn.init, type: 'INSERT', toIndex: 3, markup: '<li data-reactid="0.3" key=E><span data-reactid="0.3.0">E1</span></li>'}
// {parentId: 0, parentNode: j…y.fn.init, type: 'INSERT', toIndex: 4, markup: '<li data-reactid="0.4" key=F><span data-reactid="0.4.0">D</span></li>'}
// {parentId: 0, parentNode: j…y.fn.init, type: 'REMOVE', fromIndex: 3}

// A B C D
// 到
// A(span) C B E F

// diffQueue:
// {parentId: 0, parentNode: j…y.fn.init, type: 'REMOVE', fromIndex: 0}
// {parentId: 0, parentNode: j…y.fn.init, type: 'INSERT', toIndex: 0, markup: '<span data-reactid="0.0" key=A><span data-reactid="0.0.0">A1</span></span>'}
// {parentId: 0, parentNode: j…y.fn.init, type: 'MOVE', fromIndex: 1, toIndex: 2}
// {parentId: 0, parentNode: j…y.fn.init, type: 'INSERT', toIndex: 3, markup: '<li data-reactid="0.3" key=E><span data-reactid="0.3.0">E1</span></li>'}
// {parentId: 0, parentNode: j…y.fn.init, type: 'INSERT', toIndex: 4, markup: '<li data-reactid="0.4" key=F><span data-reactid="0.4.0">D</span></li>'}
// {parentId: 0, parentNode: j…y.fn.init, type: 'REMOVE', fromIndex: 3}


// 情形三 自定义 react 组件
// class Counter extends React.Component {
//     constructor(props) {
//         super(props);
//         this.state = {number: 0};
//     }
//     componentWillMount() {
//         console.log('child组件将要挂载')
//     }
//     componentDidMount() {
//         console.log('child挂载完成')
//     }
//     increment = () => {
//         this.setState({
//             number: this.state.number + 1
//         })
//     }
//     render() {
//         let p = React.createElement('p', {}, this.state.number);
//         let button = React.createElement('button', {onClick: this.increment}, '+');
//         return React.createElement('div', {id: 'counter', style:{backgroundColor: this.state.number%2==0 ? 'green':'red'}}, p, button);
//     }
// }
// // <Counter name='cfm'></Counter> 
// // babel编译之后 React.createElement(Counter, {name: 'cfm'})
// // 对应的 element就是{type: Counter, props: {name: 'cfm'}}
// React.render(React.createElement(Counter, {name: 'cfm'}),  document.getElementById('root'));



// 情形二 dom元素
// function say() {
//     alert('hello');
// }

// let element = React.createElement(
//     'div', 
//     {name: "XXX", style:{backgroundColor: 'red'}}, 
//     // "hello", React.createElement("button", null, "123")
//     "hello", React.createElement("button", {onClick: say}, "123")
// );

// // element参数 jsx语法 =》 虚拟dom 对象 类（函数）
// React.render(element,  document.getElementById('root'));


//  情形一 字符串
// React.render('hello',  document.getElementById('root'));
// document.write('hello')



// 原版
// import React from 'react';
// import ReactDOM from 'react-dom/client';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
