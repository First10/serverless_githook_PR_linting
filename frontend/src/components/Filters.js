import React, { Component } from 'react';

class Filters extends Component {
  constructor(props) {
    super(props);
  }

  createFilter = () => {
    let filters = [];
    if (this.props.filters !== null) {
      Object.keys(this.props.filters).forEach((filterData) => {
        let options = [];
        let label = <label>{filterData}</label>;

        console.log(this.props.filters);
        this.props.filters[filterData].forEach((item) => {
          options.push(<option key={item.name} value={item.name}>{item.name.toString()}</option>);
        });

        filters.push(label);
        filters.push(
          <select
            onChange={(e) => this.props.setCurrentReportGroup(e)}
            key={filterData}
            value={this.props.activeReportSet}>
            {options}
          </select>);
      });

      return filters;

    }
    else if (this.props.filters === null) {
      return 'Loading...'
    }
    else {
      throw new Error('Failed to build the filters: ' + JSON.stringify(this.props.filters));
    }

  };

  render() {
    return(
     this.createFilter()
    )
  }
}


export default Filters;
