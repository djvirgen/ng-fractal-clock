(function() {
  "use strict";
  
  var fractalClock = angular.module('fractalClock', ['ui.keypress']);

  fractalClock.directive('processing', function() {
    return function(scope, iElement, iAttrs) {
      scope.$sketch = new Processing(iElement[0], scope[iAttrs.processing]);
    };
  });

  fractalClock.directive('processingFullscreen', ['$timeout', '$window', function($timeout, $window) {
    return function(scope, iElement, iAttrs) {
      var width, height, updateSize;

      updateSize = function() {
        var isFullscreen = scope.$eval(iAttrs.processingFullscreen);

        if (isFullscreen) {
          scope.$sketch.size($window.innerWidth, $window.innerHeight);
          iElement.addClass('fullscreen');
        } else {
          scope.$sketch.size(width, height);
          iElement.removeClass('fullscreen');
        }
      };

      $timeout(function() {
        width = scope.$sketch.width;
        height = scope.$sketch.height;
        angular.element($window).bind('resize', updateSize);
        scope.$watch(iAttrs.processingFullscreen, updateSize);
      });
    };
  }]);

  // Focus an element when its 'focus' attribute evaluates to true
  fractalClock.directive('focus', function() {
    return function(scope, iElement, iAttr) {
      scope.$watch(iAttr.focus, function(focus) {
        if (focus) iElement[0].focus();
      });
    };
  });

  fractalClock.directive('integer', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          return parseInt(viewValue);
        });
      }
    };
  });

  fractalClock.directive('float', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {
          return parseFloat(viewValue);
        });
      }
    };
  });

  fractalClock.directive('source', function($http) {
    return function(scope, iElement, iAttrs) {
      var source = iAttrs.source;
      $http.get(source).then(function(res) {
        iElement.html(res.data);
      });
    };
  });

  fractalClock.controller('FractalClockController', function($scope, $timeout) {
    $scope.clock = {
      size: {
        width: 898,
        height: 506
      },
      origin: {
        left: 0.5,
        top: 0.5
      },
      mode: 'normal',
      width: 2.5,
      length: 80.0,
      repetitions: 40,
      connections: 8,
      phase: 0.0,
      speed: 1.0,
      timeShift: 0,
      timezoneOffset: new Date().getTimezoneOffset() * 60000,
      fullscreen: false,
      showTime: false,
      debug: false,
      color: {
        hue: 150,
        saturation: 255,
        lightness: 255,
        alpha: 220,
        fill: 127,
        shift: {
          repetitions: 100,
          connections: 100
        }
      }
    };

    var calcs = {};

    $scope.sketch = function(sketch) {
      var date = new Date();

      $scope.$watch('clock', function() {
        calcs.hueStart = $scope.clock.color.hue + $scope.clock.color.shift.repetitions;
        calcs.hueShift = -1 * $scope.clock.color.shift.repetitions / $scope.clock.repetitions;
        calcs.hueShiftB = -1 * $scope.clock.color.shift.connections / $scope.clock.connections;
        calcs.alphaStep = $scope.clock.color.alpha / $scope.clock.repetitions;

        $timeout(function() {
          calcs.length = $scope.clock.length * sketch.width / $scope.clock.size.width;
        });
      }, true);

      sketch.mouseClicked = function() {
        $scope.clock.origin.left = sketch.mouseX / sketch.width;
        $scope.clock.origin.top = sketch.mouseY / sketch.height;
      };

      sketch.setup = function() {
        sketch.smooth();
        sketch.colorMode(sketch.HSB, 255);
        sketch.strokeCap(sketch.ROUND);
        sketch.strokeJoin(sketch.ROUND);
        sketch.size($scope.clock.size.width, $scope.clock.size.height);
        sketch.frameRate(30);
      };

      sketch.draw = function() {
        sketch.background(0);

        var currentDate = new Date();
        var time = currentDate.getTime() - $scope.clock.timezoneOffset + $scope.clock.timeShift;
        var s = sketch.map(time % 60000, 0, 60000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var m = sketch.map(time % 3600000, 0, 3600000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var h = sketch.map(time % 43200000, 0, 43200000, 0, sketch.TWO_PI) - sketch.HALF_PI;

        var lines = [
          [sketch.cos(s) * calcs.length, sketch.sin(s) * calcs.length],
          [sketch.cos(m) * calcs.length, sketch.sin(m) * calcs.length],
          [sketch.cos(h) * calcs.length, sketch.sin(h) * calcs.length]
        ];

        drawLines(lines, s, m, h);

        if ($scope.clock.showTime) {
          drawTime(time);
        }
      };

      var drawTime = function(time) {
        var date = new Date(time + $scope.clock.timezoneOffset);
        var hours = date.getHours() % 12;
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        if (hours == 0) {
          hours = 12;
        }
        if (minutes < 10) {
          minutes = '0' + minutes;
        }
        if (seconds < 10) {
          seconds = '0' + seconds;
        }
        sketch.fill(0, 0, 255, 200);
        sketch.text('' + hours + ':' + minutes + '.' + seconds, -0.45 * sketch.width, -0.45 * sketch.height);
      };

      var cycle = function(value, amount, max) {
        value += amount;
        if (value < 0) {
          value += max;
        } else if (value > max) {
          value -= max;
        }
        return value;
      };

      var stepDown = function(value, amount) {
        value -= amount;
        if (value < 0) {
          value = 0;
        }
        return value;
      };

      var drawLines = function(lines, s, m, h) {
        var start, hue, hueStart, hueShift, hueShiftB, saturation, lightness,
          alpha, alphaStep, alphaStepB, fill, width, widthStep, rotationStep;

        // Color
        hueStart = calcs.hueStart;
        hueShift = calcs.hueShift;
        hueShiftB = calcs.hueShiftB;
        saturation = $scope.clock.color.saturation;
        lightness = $scope.clock.color.lightness;
        alpha = 0;
        alphaStep = calcs.alphaStep;
        rotationStep = parseFloat(-1 * m * $scope.clock.speed + sketch.PI);
        
        // Set origin to center of sketch
        sketch.translate(sketch.width * $scope.clock.origin.left, sketch.height * $scope.clock.origin.top);

        // Pre-rotate by total rotations because the vectors are drawn in reverse order
        sketch.rotate(-1 * $scope.clock.repetitions * rotationStep);

        for (var r = $scope.clock.repetitions - 1; r >= 0; r--) {
          sketch.rotate(rotationStep);
          start = [0.0, 0.0]; // Start from center
          alpha = ($scope.clock.repetitions - r) * alphaStep;
          hueStart = cycle(hueStart, hueShift, 255);
          hue = hueStart;
          width = $scope.clock.width * ($scope.clock.repetitions - r) / $scope.clock.repetitions;
          widthStep = width / ($scope.clock.connections * 4);
          alphaStepB = alpha / $scope.clock.connections;// * 0.9;

          // Make main line slightly thicker
          if (r == 0) {
            width *= 1.25;
          }

          sketch.strokeWeight(width);

          for (var c = $scope.clock.connections - 1; c >= 0; c--) {
            hue = cycle(hue, hueShiftB, 255);
            alpha -= alphaStepB;
            fill = alpha * $scope.clock.color.fill / 255;
            sketch.stroke(hue, saturation, lightness, alpha);
            sketch.fill(hue, saturation, lightness, fill);
            sketch.beginShape();
            sketch.vertex(start[0], start[1]);

            for (var i = lines.length - 1; i >= 0; i--) {
              switch ($scope.clock.mode) {
                case 'star':
                  var end = (i % 2 == 0) ? [
                    lines[i][0] + start[0],
                    lines[i][1] + start[1]
                  ] : [
                    lines[i][0] - start[0],
                    lines[i][1] - start[1]
                  ];
                  break;

                case 'nebula':
                  var end = [
                    (lines[i][0] - start[0]) * 1.5 * c / $scope.clock.connections,
                    (lines[i][1] + start[1]) * 1.5 * r / $scope.clock.repetitions
                  ];
                  break;

                case 'blackhole':
                  var end = [
                    lines[i][0] + start[0],
                    lines[i][1] - start[1]
                  ];
                  break;

                default:
                  var end = [
                    lines[i][0] + start[0],
                    lines[i][1] + start[1]
                  ];
              }

              sketch.vertex(end[0], end[1]);
              start = end;
            }

            sketch.endShape();

            // Debugging
            if ($scope.clock.debug && r == 0 && c == 0) {
              sketch.fill(hue, saturation, lightness, 255);
              sketch.text(JSON.stringify({lines: lines, s: s, m: m, h: h, calcs: calcs}, false, 2), -0.4 * sketch.width, -0.4 * sketch.height);
              sketch.text(JSON.stringify({clock: $scope.clock}, false, 2), 0.2 * sketch.width, -0.4 * sketch.height);
            }
          }
        }
      };
    };
  });
}());
