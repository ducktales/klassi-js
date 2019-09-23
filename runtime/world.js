/**
 KlassiTech Automated Testing Tool
 Created by Larry Goddard
 */
/**
 Copyright © klassitech 2016 - Larry Goddard <larryg@klassitech.co.uk>
 
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
 http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
'use strict';

/**
 * world.js is loaded by the cucumber framework before loading the step definitions and feature files
 * it is responsible for setting up and exposing the driver/browser/expect/assert etc required within each step
 * definition
 */
const fs = require('fs'),
  path = require('path'),
  requireDir = require('require-dir'),
  merge = require('merge'),
  chalk = require('chalk'),
  dir = require('node-dir'),
  chai = require('chai'),
  reporter = require('cucumber-html-reporter'),
  // reporter = require('multiple-cucumber-html-reporter'),
  apiGot = require('got'),
  program = require('commander');

const assert = chai.assert,
  expect = chai.expect,
  log = require('./logger').klassiLog();

const getRemote = require('./getRemote.js');

/**
 * Adding logging
 */
global.log = log;

/**
 * This is the Global date functionality
 */
global.date = require('../projects/' + projectName + '/settings/helpers').currentDate();

/**
 * for all API test calls
 * @type {Function}
 */
global.gotApi = apiGot;

/**
 *  for the Download of all file types
 */
global.downloader = require('./downloader.js');

/**
 * for all assertions for variable testing
 */
global.assert = assert;
global.expect = expect;

/**
 * Environment variables
 * @type {*|(function(): driver)}
 */
let ChromeDriver = require('./chromeDriver'),
  FirefoxDriver = require('./firefoxDriver'),
  BrowserStackDriver = require('./browserStackDriver');
let remoteService = getRemote(global.settings.remoteService);

let browser = {};

/**
 * create the web browser based on global let set in index.js
 * @returns {{}}
 */
async function getDriverInstance() {
  let browsers = global.settings.browserName;
  let options = {};
  if (remoteService && remoteService.type === 'browserstack') {
    let configType = global.settings.remoteConfig;
    assert.isString(
      configType,
      'BrowserStack requires a config type e.g. win10-chrome'
    );
    browser = BrowserStackDriver(options, configType);
    return browser;
  }
  assert.isNotEmpty(browsers, 'Browser Name must be defined');
  switch (browsers || '') {
  case 'firefox':
    {
      browser = FirefoxDriver(options);
    }
    break;
  case 'chrome':
    {
      browser = ChromeDriver(options);
    }
    break;
  }
  return browser;
}

let envName = global.envName;
let environ = require('../configs/envConfig.json');

/**
 * for the environment variables
 */
switch (envName || '') {
case 'dev':
  {
    global.envConfig = environ.dev;
  }
  break;
case 'uat':
  {
    global.envConfig = environ.uat;
  }
  break;
case 'test':
  {
    global.envConfig = environ.test;
  }
  break;
case 'prod':
  {
    global.envConfig = environ.prod;
  }
  break;
}

/**
 * Global timeout
 * @type {number}
 */
global.DELAY_100ms = 100; // 100 millisecond delay
global.DELAY_200ms = 200; // 200 millisecond delay
global.DELAY_300ms = 300; // 300 millisecond delay
global.DELAY_500ms = 500; // 500 millisecond delay
global.DELAY_1s = 1000; // 1 second delay
global.DELAY_2s = 2000; // 2 second delay
global.DELAY_3s = 3000; // 3 second delay
global.DELAY_5s = 5000; // 5 second delay
global.DELAY_10s = 10000; // 10 second delay
global.DELAY_15s = 15000; // 15 second delay
global.DELAY_20s = 20000; // 20 second delay

function consoleInfo() {
  let args = [].slice.call(arguments),
    output = chalk.bgBlue.white('\n>>>>> \n' + args + '\n<<<<<\n');
  console.log(output);
}

/**
 * All Global variables
 * @constructor
 */
const { Before, After, AfterAll, Status } = require('cucumber');
const { Given, When, Then } = require('cucumber');

global.Given = Given;
global.When = When;
global.Then = Then;

function World() {
  /**
   * create a list of variables to expose globally and therefore accessible within each step definition
   * @type {{browser: null, webdriverio, webdrivercss: *, expect: *, assert: (*), trace: consoleInfo,
   * log: log, page: {}, shared: {}}}
   */
  let runtime = {
    browser: {}, // the browser object
    expect: global.expect, // expose chai expect to allow variable testing
    assert: global.assert, // expose chai assert to allow variable testing
    fs: fs, // expose fs (file system) for use globally
    dir: dir, // expose dir for getting an array of files, subdirectories or both
    trace: consoleInfo, // expose an info method to log output to the console in a readable/visible format
    page: [], // empty page objects placeholder
    shared: {}, // empty shared objects placeholder
    log: global.log, // expose the log method for output to files for emailing
    downloader: global.downloader, // exposes the downloader for global usage
    gotApi: global.gotApi, // exposes the request-promise for API testing
    date: global.date // expose the date method for logs and reports
  };
  /**
   *  expose properties to step definition methods via global variables
   */
  Object.keys(runtime).forEach(function(key) {
    /** make property/method available as a global (no this. prefix required)
     */
    global[key] = runtime[key];
  });
  /**
   * import page objects (after global lets have been created)
   */
  if (global.paths.pageObjects && fs.existsSync(global.paths.pageObjects)) {
    /** require all page objects using camelcase as object names
     */
    runtime.page = requireDir(global.paths.pageObjects, { camelcase: true });
    /**
     * expose globally
     * @type {{}}
     */
    global.page = runtime.page;
  }
  /**
   * import shared objects from multiple paths (after global lets have been created)
   */
  if (
    global.paths.sharedObjects &&
    Array.isArray(global.paths.sharedObjects) &&
    global.paths.sharedObjects.length > 0
  ) {
    let allDirs = {};
    /**
     * first require directories into objects by directory
     */
    global.paths.sharedObjects.forEach(function(itemPath) {
      if (fs.existsSync(itemPath)) {
        let dir = requireDir(itemPath, { camelcase: true });
        merge(allDirs, dir);
      }
    });
    /** if we managed to import some directories, expose them
     */
    if (Object.keys(allDirs).length > 0) {
      /** expose globally
       * @type {{}}
       */
      global.shared = allDirs;
    }
  }
}

/**
 * export the "World" required by cucumber to allow it to expose methods within step def's
 */

this.World = World;

/**
 * set the default timeout for all tests
 */
const { setDefaultTimeout } = require('cucumber');

// Add timeout based on env var.
const timeout = process.env.CUCUMBER_TIMEOUT || 120000;
setDefaultTimeout(timeout);

// start recording of the Test run time
global.startDateTime = helpers.getStartDateTime();

/**
 * create the browser before scenario if it's not instantiated
 */
Before(async () => {
  global.browser = getDriverInstance();
  await browser;
});

/**
 * send email with the report to stakeholders after test run
 */
AfterAll(async () => {
  let browser = global.browser;
  if (program.email) {
    browser.pause(DELAY_3s).then(function() {
      return helpers.klassiEmail();
    });
  }
});

/**
 * compile and generate a report at the END of the test run and send an Email
 */
AfterAll(function(done) {
  let browser = global.browser;
  if (global.paths.reports && fs.existsSync(global.paths.reports)) {
    global.endDateTime = helpers.getEndDateTime();
    let reportOptions = {
      theme: 'bootstrap',
      jsonFile: path.resolve(
        global.paths.reports, projectName + ' ' + global.settings.reportName + '-' + date + '.json'
      ),
      output: path.resolve(
        global.paths.reports, projectName + ' ' + global.settings.reportName + '-' + date + '.html'
      ),
      reportSuiteAsScenarios: true,
      launchReport: (!global.settings.disableReport),
      ignoreBadJsonFile: true,
      metadata: {
        'Test Started': startDateTime,
        'Test Completion': endDateTime,
        'Platform': process.platform,
        'Environment': global.envConfig.envName,
        'Browser': global.settings.remoteConfig || global.browserName,
        'Executed': remoteService && remoteService.type === 'browserstack' ? 'Remote' : 'Local'
      },
      brandTitle: projectName + ' ' + reportName + '-' + date,
      name: projectName
    };
    
    // WIP for new style reporter
    // let reportOptions = {
    //   jsonDir: path.resolve(global.paths.reports),
    //   reportPath: path.resolve(global.paths.reports, global.settings.reportName + '-' + date),
    //   // pageTitle: reportName + '-' + date,
    //   navBarText: reportName + '-' + date,
    //   openReportInBrowser: (!global.settings.disableReport),
    //   metadata:{
    //     browser: {
    //       name: global.settings.remoteConfig || global.browserName,
    //       version: '60'
    //     },
    //     device: 'Local test machine',
    //     platform: {
    //       name: 'ubuntu',
    //       version: '16.04'
    //     }
    //   },
    //   customMetadata: {
    //     metadata: [
    //       {name: 'Environment', value: global.envConfig.envName},
    //       {name: 'Executed', value: remoteService && remoteService.type === 'browserstack' ? 'Remote' : 'Local'}
    //     ]
    //   },
    //   customData: {
    //     title: reportName,
    //     data: [
    //       {label: 'Project', value: projectName},
    //       {label: 'Release', value: '1.2.3'},
    //       {label: 'Cycle', value: 'B11221.34321'},
    //       {label: 'Execution Start Time', value: startDateTime},
    //       {label: 'Execution End Time', value: endDateTime}
    //     ]
    //   },
    // };
    
    browser.pause(DELAY_2s).then(function() {
      reporter.generate(reportOptions);
      browser.pause(DELAY_1s);
    });
  }
  done();
});

/**
 *  executed after each scenario (always closes the browser to ensure fresh tests)
 */
After(async function(scenario) {
  let browser = global.browser;
  if (scenario.result.status === Status.FAILED) {
    if (remoteService && remoteService.type === 'browserstack') {
      await browser.deleteSession();
    } else {
      // Comment out to do nothing | leave browser open
      await browser.deleteSession();
    }
  } else {
    if (remoteService && remoteService.type !== 'browserstack') {
      // Comment out to do nothing | leave browser open
      await browser.deleteSession();
    } else {
      await browser.deleteSession();
    }
  }
});

/**
 * get executed only if there is an error within a scenario
 */
After(function(scenario) {
  let browser = global.browser;
  let world = this;
  if (scenario.result.status === Status.FAILED) {
    return browser.takeScreenshot().then(function(screenShot) {
      world.attach(screenShot, 'image/png');
    });
  }
});
