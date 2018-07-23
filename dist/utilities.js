/**
 * NOTE: This code is transpiled from ES2017 using Babel.
 * Instead of modifying this file directly, work with the source code instead and upload the transpiled output here.
 */'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function formatGitName(prefix, name, outputType) {
  const now = new Date(Date.now());
  const instanceName = now.toLocaleDateString('gb-en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', minute: '2-digit', second: '2-digit' }).replace(/[^A-Za-z0-9]/g, '-');

  return `${prefix}${name}/${instanceName}.${outputType}`;
}

exports.default = {
  formatGitName
};