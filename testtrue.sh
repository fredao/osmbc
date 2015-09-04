#!/bin/bash

echo "Start Travis Test With Coverage Upload"
istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec && cat ./coverage/lcov.info | ./node_modules/codecov.io/bin/codecov.io.js && rm -rf ./coverage 