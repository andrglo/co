
var assert = require('assert');

var co = require('..');

function getPromise(val, err) {
  return new Promise(function (resolve, reject) {
    if (err) reject(err);
    else resolve(val);
  });
}

function sleep(ms) {
  return function(done){
    setTimeout(done, ms);
  }
}

function *innerWork() {
  yield sleep(50);
  return 'yay';
}

function *work() {
  return yield innerWork();
}

describe('co(* -> yield <effect -> Promise>', function(){
  describe('with one effect yield', function(){
    it('should work', function(){
      return co(function *(){
        var a = yield co.effect(getPromise, 1);
        assert.equal(1, a);
      });
    })
  })

  describe('with several effects yields', function(){
    it('should work', function(){
      return co(function *(){
        var a = yield co.effect(getPromise, 1);
        var b = yield co.effect(getPromise, 2);
        var c = yield co.effect(getPromise, 3);

        assert.deepEqual([1, 2, 3], [a, b, c]);
      });
    })
  })

  describe('when a effect is rejected', function(){
    it('should throw and resume', function(){
      var error;

      return co(function *(){
        try {
          yield co.effect(getPromise, 1, new Error('boom'));
        } catch (err) {
          error = err;
        }

        assert('boom' == error.message);
        var ret = yield co.effect(getPromise, 1);
        assert(1 == ret);
      });
    })
  })

  describe('when yielding a non-standard promise-like effect', function(){
    it('should return a real Promise', function() {
      assert(co(function *(){
          yield co.effect(() => ({ then: function(){} }));
        }) instanceof Promise);
    });
  })
})

describe('co(* -> yield <effect -> generator>', function(){
  describe('with a effect that returns a generator function', function(){
    it('should wrap with co()', function(){
      return co(function *(){
        var a = yield co.effect(work);
        var b = yield co.effect(work);
        var c = yield co.effect(work);

        assert('yay' == a);
        assert('yay' == b);
        assert('yay' == c);

        var res = yield [co.effect(work), co.effect(work), co.effect(work)];
        assert.deepEqual(['yay', 'yay', 'yay'], res);
      });
    })

    it('should catch errors', function(){
      return co(function *(){
        yield co.effect(() => function *(){
          throw new Error('boom');
        });
      }).then(function () {
        throw new Error('wtf')
      }, function (err) {
        assert(err);
        assert(err.message == 'boom');
      });
    })
  })
})

// Using context

var machine = {
  test: 'hi',
  show: function(n) {
    return Promise.resolve(this.test + ' ' + n);
  }
};

describe('co(* -> yield <effect -> Promise> - Using context', function(){
  describe('with one effect yield', function(){
    it('should work', function(){
      return co(function *(){
        var a = yield co.effect([machine, 'show'], 1);
        assert.equal('hi 1', a);
        a = yield co.effect([machine, machine.show], 1);
        assert.equal('hi 1', a);
      });
    })
  })

  describe('with several effects yields', function(){
    it('should work', function(){
      return co(function *(){
        var a = yield co.effect([machine, 'show'], 1);
        var b = yield co.effect([machine, machine.show], 2);
        var c = yield co.effect([machine, 'show'], 3);

        assert.deepEqual(['hi 1', 'hi 2', 'hi 3'], [a, b, c]);
      });
    })
  })

})

