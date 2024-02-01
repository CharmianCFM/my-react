class Component{
    constructor(props) {
        // 每个实例都有一个 props 属性
        this.props = props;
    }
    setState(partialState) {
        // 第一个参数新的元素 第二个参数是新的状态
        this._currentUnit.update(null, partialState)
        // 更新操作交给 Component 实例对应的 unit去做
    }
}
export default Component;