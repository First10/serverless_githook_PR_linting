import React, { Component } from 'react';
import { Button } from 'reakit';

class ReportListItem extends Component {
  constructor(props) {
    super(props);

    console.log(props);
    const nameParts = props.info.Key.toString().split('/').length;

    this.state = {
      info: props.info,
      reportName: props.info.Key.toString().split('/')[nameParts - 1]
    }
  }

  reportButton() {

  }

  render() {
    return(<li className="mdc-list-item">{
      <Button onClick={(e) => this.props.action(e, this.props.branch + '/' + this.state.reportName)}>{this.state.reportName}</Button>
    }</li>)
  }
}


export default ReportListItem;
