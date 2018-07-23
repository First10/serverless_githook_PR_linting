import React, { Component } from 'react';

class ReportListItem extends Component {
  constructor(props) {
    super(props);

    console.log(props);
    const nameParts = props.info.Key.toString().split('/').length;

    this.state = {
      info: props.info,
      branchName: props.info.Key.toString().split('/')[nameParts - 1]
    }
  }

  render() {
    return(<li className="mdc-list-item">{this.state.branchName}</li>)
  }
}


export default ReportListItem;
