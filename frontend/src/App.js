import React, { Component } from 'react';
import './App.scss';
import getData from './getData';
import ReportListitem from './ReportListItem';

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
      report: '',
      branches: []
    };

  }

  listReports() {
    getData({type: 'list'}).then((reports) => {
      let filters = {
        branch: []
      };
      let reportRows = [];
      let reportsByBranch = {};

      // Take the report objects and create a list of reports names with links.

      console.log('reports: ', reports);

        // Get all the branch names to use in the filters.
      Object.keys(reports).forEach((report, key) => {
        let branch = reports[report].Key.toString().split("/")[1];
        filters.branch.push({
          name: branch
        });

        // Put the reports into an object groups by branch.
        reportsByBranch[branch] = reportsByBranch[branch] || [];
        reportsByBranch[branch].push(reports[report]);
      });

      console.log('reportsByBranch', reportsByBranch);


      // Render the organised data.
      Object.keys(reportsByBranch).forEach((branch, key) => {
        if (reportsByBranch[branch].length > 0) {
          let groupBranch = [];
          //
          groupBranch.push(<h2>{branch}</h2>);
          reportsByBranch[branch].forEach((report) => {
            groupBranch.push(<ReportListitem key={this.state.branchName + 'report'} info={report}/>);
          });

          reportRows.push(<ul className="" key={branch}>{groupBranch}</ul>)
        }
      });


      console.log('filters.branch', reportsByBranch);
      console.log('reportRows', reportRows);

      this.setState({
        filters: {
          branches: filters.branch
        }
      });
      this.setState({reportList: reportRows});
      this.setState({reports});
      this.createFilter();

    })
      .catch(console.log);
  }

  getReport() {
    getData({type: 'get'}).then((report) => {

      this.setState({report});
    })
      .catch(console.log);
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

    console.log('filters: ', filters);



    this.setState({filters: {
      markup: filters,
      branches: this.state.branches
    }});
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
        <div>
          { this.state.report }
        </div>
      </div>
    );
  }
}

export default App;
