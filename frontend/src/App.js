import React, { Component } from 'react';
import reports from './connectivity/reports';
import './App.scss';
import ReportListitem from './components/ReportListItem';
import { List, Link } from "reakit";

class App extends Component {
  constructor(props) {
    super(props);

    this.filters = null;
    this.reportList = null;
    this.listReports();

    this.state = {
      reports: [],
      filters: 'Loading',
      reportList: '',
      report: null,
      branches: []
    };

    this.getReport = this.getReport.bind(this);

  }


  listReports() {
    reports(this, 'list')
      .then(data => {
        let reportRows = [];

        // Render the organised data.
        Object.keys(data.reportsByBranch).forEach((branch, key) => {
          if (data.reportsByBranch[branch].length > 0) {
            let groupBranch = [];
            //
            groupBranch.push(<h2>{branch}</h2>);
            data.reportsByBranch[branch].forEach((report) => {
              groupBranch.push(<ReportListitem action={this.getReport}
                                               branch={branch}
                                               key={branch + report.Key + 'report'}
                                               info={report}/>);

            });

            reportRows.push(<List className="" >{groupBranch}</List>)
          }
        });

        this.setState({
          filters: {
            branches: data.filter
          },
          reportList: reportRows,
          reports: data.reports
        });

        this.createFilter();
      });
  }

  getReport(event, name) {
    reports(this, 'get', name)
      .then(data => {
        this.setState({
          report: data
        });

      });
  }

  filterReports(field, value) {
    this.setState({reports: this.state.reports.filter(report => report[field] = value)});
  }

  createFilter() {
    let filters = [];

    console.log('branches for filters', this.state.filters.branches);

    Object.keys(this.state.filters).forEach((filterData) => {
      let options = [];
      let label = <label>{filterData}</label>;


      this.state.filters[filterData].forEach((item) => {
        options.push(<option key={item.name}>{item.name.toString()}</option>);
      });

      console.log('Filter name', options);

      filters.push(label);
      filters.push(<select key={filterData}>{options}</select>)
    });


    this.setState({filters: {
        markup: filters,
        branches: this.state.branches
      }});
  }

  formatitems(fileType, reportType, item) {
    let markup = null;

    switch (fileType) {
      case 'js':
        console.log('item', fileType);
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
                    <div>{this.formatitems(fileType, reportType, item)}</div>
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
    return (
      <div className="App">
        <header className="">
          <h1 className="page-title">Pull Request Reports</h1>
        </header>
        <nav>
          { this.state.filters.markup }
        </nav>
        <div>
          { this.state.reportList }
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
