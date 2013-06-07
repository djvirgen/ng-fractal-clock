(function() {
  "use strict";
  
  var fractalClock = angular.module('fractalClock', []);

  fractalClock.directive('processing', function() {
    return {
      scope: true,
      link: function(scope, iElement, iAttrs) {
        scope.$sketch = new Processing(iElement[0], scope[iAttrs.processing]);
      }
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
      width: 2.5,
      length: 40.0,
      repetitions: 50,
      connections: 10,
      phase: 0.0,
      speed: 2.0,
      timeShift: 0,
      timezoneOffset: new Date().getTimezoneOffset() * 60000,
      showTime: false,
      debug: false,
      color: {
        hue: 160,
        saturation: 255,
        lightness: 255,
        alpha: 200,
        fill: 127,
        shift: {
          repetitions: 100,
          connections: 100
        }
      }
    };

    $scope.sketch = function(sketch) {
      var date;

      date = new Date();

      sketch.setup = function() {
        sketch.size(400, 400);
        sketch.smooth();
        sketch.colorMode(sketch.HSB, 255);
        sketch.strokeCap(sketch.ROUND);
        sketch.strokeJoin(sketch.ROUND);
      };

      sketch.draw = function() {
        sketch.background(0);

        var currentDate = new Date();
        var time = currentDate.getTime() - $scope.clock.timezoneOffset + $scope.clock.timeShift;
        var s = sketch.map(time % 60000, 0, 60000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var m = sketch.map(time % 3600000, 0, 3600000, 0, sketch.TWO_PI) - sketch.HALF_PI;
        var h = sketch.map(time % 43200000, 0, 43200000, 0, sketch.TWO_PI) - sketch.HALF_PI;

        var lines = [
          [sketch.cos(s) * $scope.clock.length, sketch.sin(s) * $scope.clock.length],
          [sketch.cos(m) * $scope.clock.length, sketch.sin(m) * $scope.clock.length],
          [sketch.cos(h) * $scope.clock.length, sketch.sin(h) * $scope.clock.length]
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
        sketch.text('' + hours + ':' + minutes + '.' + seconds, -190, -180);
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
          alpha, alphaStep, fill, width, widthStep, rotationStep;

        // Color
        hueStart = $scope.clock.color.hue + $scope.clock.color.shift.repetitions;
        hueShift = -1 * $scope.clock.color.shift.repetitions / $scope.clock.repetitions;
        hueShiftB = -1 * $scope.clock.color.shift.connections / $scope.clock.connections;
        saturation = $scope.clock.color.saturation;
        lightness = $scope.clock.color.lightness;
        alpha = 0;
        alphaStep = $scope.clock.color.alpha / $scope.clock.repetitions;
        rotationStep = parseFloat(-1 * m * $scope.clock.speed + sketch.PI);
        
        // Set origin to center of sketch
        sketch.translate(200.0, 200.0);

        // Pre-rotate by total rotations because the vectors are drawn in reverse order
        sketch.rotate(-1 * $scope.clock.repetitions * rotationStep);

        for (var r = $scope.clock.repetitions - 1; r >= 0; r--) {
          sketch.rotate(rotationStep);
          start = [0.0, 0.0]; // Start from center
          alpha += alphaStep;
          fill = alpha * $scope.clock.color.fill / 255;
          hueStart = cycle(hueStart, hueShift, 255);
          hue = hueStart;
          width = $scope.clock.width * ($scope.clock.repetitions - r) / $scope.clock.repetitions;
          widthStep = width / ($scope.clock.connections * 4);

          // Make main line slightly thicker
          if (r == 0) {
            width *= 1.25;
          }

          sketch.strokeWeight(width);

          for (var c = $scope.clock.connections - 1; c >= 0; c--) {
            hue = cycle(hue, hueShiftB, 255);
            sketch.stroke(hue, saturation, lightness, alpha);
            sketch.fill(hue, saturation, lightness, fill);
            sketch.beginShape();
            sketch.vertex(start[0], start[1]);

            for (var i = lines.length - 1; i >= 0; i--) {
              var end = [
                lines[i][0] + start[0],
                lines[i][1] + start[1]
              ];

              sketch.vertex(end[0], end[1]);
              start = end;
            }

            sketch.endShape();
            if ($scope.clock.debug && r == 0) {
              sketch.text(JSON.stringify({lines: lines, rotationStep: rotationStep}, false, 2), -100, -100);
            }
          }
        }
      };
    };
  });
}());
