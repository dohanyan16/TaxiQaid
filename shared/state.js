/**
 * TaxiQaid | state.js
 * Purpose: Shared runtime state, reset when the page reloads.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    let driversDatabase = [];
    let fleetDatabase = [];
    let accidentsDatabase = [];
    let tripChecksDatabase = [];
    let loggedInUserName = "System User";
    let currentWizardStep = 1;
    const totalWizardSteps = 27;
