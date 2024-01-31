import React from './react';

// function say() {
//     alert('hello');
// }

// let element = React.createElement(
//     'div', 
//     {name: "XXX"}, 
//     // "hello", React.createElement("button", null, "123")
//     "hello", React.createElement("button", {onClick: say}, "123")
// );

// // element参数 jsx语法 =》 虚拟dom 对象 类（函数）
// React.render(element,  document.getElementById('root'));

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
// babel编译之后 React.createElement(Counter, {name: 'cfm'})
// 对应的 element就是{type: Counter, props: {name: 'cfm'}}
React.render(React.createElement(Counter, {name: 'cfm'}),  document.getElementById('root'));








// document.write('hello')


// import React from 'react';
// import ReactDOM from 'react-dom/client';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
