// UI only: dropdown values are unsaved and no reports are created.
TAXIQAID_LOCATIONS.forEach(location => document.getElementById('bdw-breakdown-location').add(new Option(location, location)));
document.getElementById('bdw-maintenance-status').value = 'Not Requested';

setupSearchDropdown({input:'breakdown-filter-search-breakdown',config:'breakdowns'});
