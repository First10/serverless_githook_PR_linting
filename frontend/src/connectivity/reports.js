import getData from "./getData";
import React from "react";

export default async (that, type, name) => {

  switch (type) {
    case 'list':
      return await getData({ type }).then((reports) => {
        let filters = {
          branch: []
        };
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

        return {
          filter: filters.branch,
          reportsByBranch,
          reports
        };

      })
        .catch(console.log);

    case 'get':
      return await getData({ type, name })
        .then((report) => {

          return report
        })
        .catch(console.log);
      break;

    default:
      throw new Error('Unknown type: ' + type);
  }

}
