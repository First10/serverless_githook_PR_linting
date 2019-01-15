import React, { Component } from 'react';
import { Button } from 'reakit';

class ReportListItem extends Component {
  constructor(props) {
    super(props);

    this.nameParts = props.info.Key.toString().split('/');
  }

  render() {
    return(
      <li className="mdc-list-item">{
        <Button onClick={(e) => this.props.action(e, this.props.info.Key)}>{this.nameParts[2]}</Button>
    }</li>
    )
  }
}


export default ReportListItem;
