import React, { Component } from 'react';
import ReportListitem from './ReportListItem';
import { List } from 'reakit';

class ReportList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeReportSet: this.props.activeReportSet
    }
  }

  renderReports = () => {
    let reportRows = [];

    // Render the organised data.
    let groupBranch = [];

    groupBranch.push(<h2>{this.state.activeReportSet}</h2>);

    const reports = this.props.reports.filter(item => {
      return this.props.activeReport !== null ? item.Key.includes(this.state.activeReportSet) : true;
    });

    reports.forEach((report) => {
      groupBranch.push(
        <ReportListitem
          action={this.props.action}
          branch={this.props.activeReport}
          key={report.Key + 'report'}
          info={report}
        />);

    });
    reportRows.push(<List className="">{groupBranch}</List>);

    return reportRows;
  };


  render() {
    console.log('Filters are rendered');

    return(
      this.renderReports()
    )
  }
}


export default ReportList;
