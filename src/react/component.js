class Component{
    constructor(props) {
        this.props = props;
    }
    setState(partialState) {
        console.log('更改 state')
        // 第一个参数新的元素 第二个参数是新的状态
        this._currentUnit.update(null, partialState)
    }
}
export default Component;