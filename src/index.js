import React from './react';

// 情形三 自定义 react 组件
class SubCounter extends React.Component {
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
        let p = React.createElement('p', {style: {color: 'red'}}, this.state.number);
        let button = React.createElement('button', {onClick: this.increment}, '+');
        return React.createElement('div', {id: 'counter'}, p, button);
    }
}

class Counter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {number: 0};
    }
    componentWillMount() {
        console.log('parent组件将要挂载')
    }
    componentDidMount() {
        console.log('parent挂载完成')
        setInterval(() => {
            this.setState({
                number: this.state.number + 1,
            })
        }, 1000)
    }
    shouldComponentUpdate(nextProps, nextState) {
        return true;
    }
    render() {
        console.log(this.props.name);
        // return <SubCounter />;
        return this.state.number;
    }
}

// <Counter name='cfm'></Counter> 
// babel编译之后 React.createElement(Counter, {name: 'cfm'})
// 对应的 element就是{type: Counter, props: {name: 'cfm'}}
React.render(React.createElement(Counter, {name: 'cfm'}),  document.getElementById('root'));



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
