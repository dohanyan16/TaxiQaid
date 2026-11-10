/** Approved appeal filters and independent administrative assignments; no ID allocation. */
const TaxiQaidAppealsPolicy = (() => {
  const STATUSES = Object.freeze(['Pending','In Progress','Done']);
  const DEPARTMENTS = Object.freeze(['Pending','Financial','Operation','Quality','IT']);
  function matches(record, {start='',end='',type='',status='',department=''} = {}) {
    const date = String(record['Submission Date'] || '');
    if (start && end && start > end) return false;
    return (!start || date >= start) && (!end || Boolean(date) && date <= end)
      && (!type || record['Appeal Type'] === type) && (!status || record.Status === status)
      && (!department || record.Department === department);
  }
  function assignment(status,department) {
    if (!STATUSES.includes(status) || !DEPARTMENTS.includes(department)) throw new Error('Choose an approved status and department.');
    return {Status:status,Department:department};
  }
  return Object.freeze({STATUSES,DEPARTMENTS,matches,assignment});
})();
if(typeof module!=='undefined' && module.exports) module.exports=TaxiQaidAppealsPolicy;
