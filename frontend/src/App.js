import React, { Component } from 'react';
import reports from './connectivity/reports';
import './App.scss';
import ReportList from './components/ReportList';
import Filters from './components/Filters';
import { List, Link } from "reakit";

class App extends Component {
  constructor(props) {
    super(props);


    this.filters = null;
    this.reportList = null;
    this.urlParams = new URLSearchParams(window.location.search);

    const reportParam = this.urlParams.get('report');

    this.state = {
      reports: [],
      filters: null,
      reportList: '',
      activeReportSet: Array.isArray(reportParam) ? reportParam.split('/')[0] : null,
      activeReport: Array.isArray(reportParam) ? reportParam.split('/')[1] : null,
      report: null,
      branches: []
    };

    if (typeof this.urlParams.get('report') !== 'undefined') {
      // Get the active report if we land on the page with a query string.
      this.getReport(null, 'reports/' + this.urlParams.get('report'));
    }


  }

  componentDidMount() {
    this.listReports();
  }


  listReports = () => {
    reports(this, 'list')
      .then(data => {

        console.log('DATA', data);

        this.setState({
          filters: {
            branches: data.branchNames
          },
          reports: data.reports
        });

      });
  };


  getReport = (event, name) => {
    reports(this, 'get', name)
      .then(data => {
        this.setState({
          report: data,
          activeReport: name
        });

      });
  };

  filterReports(field, value) {
    //this.setState({reports: this.state.reports.filter(report => report[field] = value)});
  }

  setCurrentReportGroup = (event) => {
    this.setState({
      activeReportSet: event.target.value
    });
  };


  formatItems(fileType, reportType, item) {
    let markup = null;

    switch (fileType) {
      case 'js':
        markup = item[reportType].map((details) => {
          return (
            <li>
              <h3>{details.message}</h3>
              <List>
                <li>Start line: {details.line}</li>
                <li>End line: {details.endLine}</li>
                <li>Code: {details.source}</li>
              </List>

            </li>
          )
        });
        break;

      case 'scss':
        markup = item[reportType].map((details) => {
          return (
            <li>
              <h3>{details.text}</h3>
              <List>
                <li>Start line: {details.line}</li>
                <li>End line: {details.endLine}</li>
                <li>Rule broken: {details.rule}</li>
                <li>Rule link: <Link href={'https://stylelint.io/user-guide/rules/' + details.rule}>View rule</Link></li>
              </List>

            </li>
          )
        });
        break;

    }

    return (
      <React.Fragment>
        <List>
          {markup}
        </List>
      </React.Fragment>
    );

  }

  renderReport(data) {
    let reportParts = [];

    Object.keys(data).forEach((fileType) => {
      if (['scss', 'js'].includes(fileType)) {

        Object.keys(data[fileType]).forEach((reportType) => {
          if (data[fileType][reportType].length > 0) {
            reportParts.push(<h3>{reportType}</h3>);
            reportParts.push(
              data[fileType][reportType].map((item) => {
                return (
                  <div>
                    <h4>{item.filename}</h4>
                    <div>{this.formatItems(fileType, reportType, item)}</div>
                  </div>
                )
              })
            )
          }
        })

      }

    });

    return (
      <React.Fragment>
        <div>Total Errors: {data.info.totalErrors} / Total Warnings: {data.info.totalWarnings}</div>
        {reportParts}
      </React.Fragment>
    )

  }

  render() {
    console.log('Setting active report set to: RENDER', this.state.activeReport);
    return (
      <div className="App">
        <header className="">
          <h1 className="page-title">Pull Request Reports</h1>
        </header>
        <nav>
          <Filters
            filters={this.state.filters}
            activeReportSet={this.state.activeReportSet}
            setCurrentReportGroup={this.setCurrentReportGroup}
          />
        </nav>
        <div>
          <ReportList
            activeReportSet={this.state.activeReportSet}
            activeReport={this.state.activeReport}
            reports={this.state.reports}
            action={this.getReport}
          />
        </div>
        <hr />
        <div>
          { this.state.report !== null ? this.renderReport(this.state.report) : ''}
        </div>
      </div>
    );
  }
}

export default App;
