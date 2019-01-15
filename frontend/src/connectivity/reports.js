import getData from "./getData";
import React from "react";

export default async (that, type, name) => {

  switch (type) {
    case 'list':
      return await getData({ type }).then((reports) => {
        let filters = {
          branch: []
        };
        let dedupeCheck = [];
        let reportsByBranch = {};

        // Take the report objects and create a list of reports names with links.

        // Get all the branch names to use in the filters.
        Object.keys(reports).forEach((report, key) => {
          let branch = reports[report].Key
            .toString()
            .replace(/reports\/|Feature\/|feature\//g, '')
            .split('/')[0];

          if(!dedupeCheck.includes(branch)) {
            filters.branch.push({
              name: branch
            });

            dedupeCheck.push(branch);
          }


          // Put the reports into an object groups by branch.
          reportsByBranch[branch] = reportsByBranch[branch] || [];
          reportsByBranch[branch].push(reports[report]);
        });

        return {
          branchNames: filters.branch,
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

    default:
      throw new Error('Unknown type: ' + type);
  }

}
