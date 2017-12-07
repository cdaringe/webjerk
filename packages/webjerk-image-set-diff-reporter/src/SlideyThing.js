import React, { Component } from 'react'
import ImageDiff from 'cdaringe-react-image-diff'

export default class SlideyThing extends Component {
  constructor (props) {
    super(props)
    this.handleInputChange.bind(this)
    this.state = {
      type: 'swipe'
    }
  }
  handleInputChange (evt) {
    this.setState(Object.assign({}, this.state, {
      value: parseFloat(evt.target.value, 10)
    }))
  }
  handleRadioChange (evt) {
    console.log(evt)
    this.setState({ type: evt.target.value })
  }
  render () {
    const diff = this.props.diff
    const value = typeof this.state.value === 'number' ? this.state.value : 0.5
    // https://github.com/cezary/react-image-diff/blob/gh-pages/index.html
    return (
      <div>
        <ImageDiff
          before={`a-${diff.name}`}
          after={`b-${diff.name}`}
          type={this.state.type}
          value={value} />
        <br />
        <input
          type='range'
          defaultValue={value}
          min={0}
          max={1}
          step={0.01}
          onChange={this.handleInputChange.bind(this)}
          disabled={this.state.type === 'difference'}
        />
        <br />
        <label>
          <input name='type' checked={this.state.type === 'swipe'} type='radio' value='swipe' onChange={this.handleRadioChange.bind(this)} />
          swipe
        </label>
        <label>
          <input name='type' checked={this.state.type === 'fade'} type='radio' value='fade' onChange={this.handleRadioChange.bind(this)} />
          fade
        </label>
        <label>
          <input name='type' checked={this.state.type === 'difference'} type='radio' value='difference' onChange={this.handleRadioChange.bind(this)} />
          difference
        </label>
        <pre>{JSON.stringify(diff, null, 2)}</pre>
      </div>
    )
  }
}
