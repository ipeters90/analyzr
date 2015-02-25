'use strict';

/**
 * Fullcalendar Controller
 * @desc: 
 */
module.exports = function (module) {
  module.controller('uiCalendarCtrl', ['$scope', '$timeout', '$locale', function ($scope, $timeout, $locale) {
    var sourceSerialId = 1,
      eventSerialId = 1,
      sources = $scope.eventSources,
      extraEventSignature = $scope.calendarWatchEvent ? $scope.calendarWatchEvent : angular.noop,

      wrapFunctionWithScopeApply = function (functionToWrap) {
        var wrapper;

        if (functionToWrap) {
          wrapper = function() {
            var args = arguments;
            var _this = this;
            $timeout(function() {
              functionToWrap.apply(_this, args);
            });
          };
        }

        return wrapper;
      };

    this.eventsFingerprint = function (e) {
      if (!e._id) {
        e._id = eventSerialId++;
      }
      return "" + e._id + (e.id || '') + (e.title || '') + (e.url || '') + (+e.start || '') + (+e.end || '') + (e.allDay || '') + (e.className || '') + extraEventSignature(e) || '';
    };

    this.sourcesFingerprint = function (source) {
      return source.__id || (source.__id = sourceSerialId++);
    };

    this.allEvents = function () {
      var arraySources = [];

      for (var i = 0, srcLen = sources.length; i < srcLen; i++) {
        var source = sources[i];
        if (angular.isArray(source)) {
          // event source as array
          arraySources.push(source);
        } else if (angular.isObject(source) && angular.isArray(source.events)) {
          // event source as object, ie extended form
          var extEvent = {};
          for (var key in source) {
            if (key !== '_uiCalId' && key !== 'events') {
              extEvent[key] = source[key];
            }
          }
          for (var eI = 0; eI < source.events.length; eI++) {
            angular.extend(source.events[eI], extEvent);
          }
          arraySources.push(source.events);
        }
      }

      return Array.prototype.concat.apply([], arraySources);
    };

    // Track changes in array by assigning id tokens to each element and watching the scope for changes in those tokens
    // arguments:
    //  arraySource array of function that returns array of objects to watch
    //  tokenFn function(object) that returns the token for a given object
    this.changeWatcher = function (arraySource, tokenFn) {
      var self;
      var getTokens = function () {
        var array = angular.isFunction(arraySource) ? arraySource() : arraySource;
        var result = [],
          token, el;
        for (var i = 0, n = array.length; i < n; i++) {
          el = array[i];
          token = tokenFn(el);
          map[token] = el;
          result.push(token);
        }
        return result;
      };
      // returns elements in that are in a but not in b
      // subtractAsSets([4, 5, 6], [4, 5, 7]) => [6]
      var subtractAsSets = function (a, b) {
        var result = [],
          inB = {},
          i, n;
        for (i = 0, n = b.length; i < n; i++) {
          inB[b[i]] = true;
        }
        for (i = 0, n = a.length; i < n; i++) {
          if (!inB[a[i]]) {
            result.push(a[i]);
          }
        }
        return result;
      };

      // Map objects to tokens and vice-versa
      var map = {};

      var applyChanges = function (newTokens, oldTokens) {
        var i, n, el, token;
        var replacedTokens = {};
        var removedTokens = subtractAsSets(oldTokens, newTokens);
        for (i = 0, n = removedTokens.length; i < n; i++) {
          var removedToken = removedTokens[i];
          el = map[removedToken];
          delete map[removedToken];
          var newToken = tokenFn(el);
          // if the element wasn't removed but simply got a new token, its old token will be different from the current one
          if (newToken === removedToken) {
            self.onRemoved(el);
          } else {
            replacedTokens[newToken] = removedToken;
            self.onChanged(el);
          }
        }

        var addedTokens = subtractAsSets(newTokens, oldTokens);
        for (i = 0, n = addedTokens.length; i < n; i++) {
          token = addedTokens[i];
          el = map[token];
          if (!replacedTokens[token]) {
            self.onAdded(el);
          }
        }
      };
      return self = {
        subscribe: function (scope, onChanged) {
          scope.$watch(getTokens, function (newTokens, oldTokens) {
            if (!onChanged || onChanged(newTokens, oldTokens) !== false) {
              applyChanges(newTokens, oldTokens);
            }
          }, true);
        },
        onAdded: angular.noop,
        onChanged: angular.noop,
        onRemoved: angular.noop
      };
    };

    this.getFullCalendarConfig = function (calendarSettings, uiCalendarConfig) {
      var config = {};

      angular.extend(config, uiCalendarConfig);
      angular.extend(config, calendarSettings);

      angular.forEach(config, function(value, key) {
        if (typeof value === 'function') {
          config[key] = wrapFunctionWithScopeApply(config[key]);
        }
      });

      return config;
    };

    this.getLocaleConfig = function (fullCalendarConfig) {
      if (!fullCalendarConfig.lang || fullCalendarConfig.useNgLocale) {
        // Configure to use locale names by default
        var tValues = function (data) {
          // convert {0: "Jan", 1: "Feb", ...} to ["Jan", "Feb", ...]
          var r, k;
          r = [];
          for (k in data) {
            r[k] = data[k];
          }
          return r;
        };
        var dtf = $locale.DATETIME_FORMATS;
        return {
          monthNames: tValues(dtf.MONTH),
          monthNamesShort: tValues(dtf.SHORTMONTH),
          dayNames: tValues(dtf.DAY),
          dayNamesShort: tValues(dtf.SHORTDAY)
        };
      }
      return {};
    };
  }]);
};