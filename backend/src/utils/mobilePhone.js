// Native dynamic import keeps the shared browser/API validator compatible with
// CommonJS on supported Node runtimes without maintaining two sets of rules.
module.exports = import('../../../shared/mobilePhone.mjs');
