#require('debug').enable '*'

Grown = require('../index')()

Grown.use require('../../test')

describe 'Grown', ->
  it 'is a function', ->
    expect(typeof Grown).toEqual 'function'
    expect(typeof Grown.new).toEqual 'function'

  describe '#version', ->
    it 'will be the package version', ->
      expect(Grown.version).not.toBeUndefined()

  describe '#module', ->
    it 'can access its module definition', ->
      expect(Grown.Dummy).toBeUndefined()

      Grown 'Dummy',
        props:
          value: 42

      expect(Grown.Dummy.new().value).toEqual 42

  describe '#use', ->
    it 'can load new module definitions', ->
      Grown.use ($, util) ->
        $ 'Example',
          props:
            _: util

      ex = new Grown.Example()

      expect(ex._.flattenArgs(1, [2], [[3]])).toEqual [1, 2, 3]
      expect(Object.keys(ex)).toEqual []

  describe 'Test', ->
    beforeEach ->
      @g = Grown.new({
        cwd: __dirname
        env: 'development'
      })

      @g.plug Grown.Test

    describe '#plug -> #mount -> #listen -> #request', ->
      it 'runs over the current instance', (done) ->
        g = @g.plug mixins: Grown.Dummy

        expect(g).toBe @g

        test = null

        g.mount (conn) ->
          test = conn.value

        g.request ->
          expect(test).toBe 42
          done()

      it 'should normalize the request body', (done) ->
        opts =
          body: '"OSOM"'
          method: 'POST'
          headers:
            'content-type': 'application/json'

        @g.request opts, (err, conn) ->
          expect(conn.req.headers['content-length']).toEqual '6'
          expect(conn.pid).not.toBeUndefined()

          conn.req.on 'data', (chunk) ->
            expect(chunk.toString()).toEqual '"OSOM"'
            done()

    describe 'Mock.Req', ->
      it 'provides a mocked request', (done) ->
        @g.run().then (conn) ->
          expect(conn.req).not.toBeUndefined()
          expect(conn.req.url).toEqual ''
          done()
        .catch (e) ->
          console.log 'E_REQ', e.stack
          done()

    describe 'Mock.Res', ->
      it 'provides a mocked response', (done) ->
        @g.mount (conn) ->
          conn.res.write 'OSOM'

        @g.run().then (conn) ->
          expect(conn.res.body).toEqual 'OSOM'
          done()
        .catch (e) ->
          console.log 'E_RES', e.stack
          done()

    describe 'Event emitter', ->
      it 'can chain many method calls', ->
        cb = ->
        expect(@g.on('x', cb).off('x', cb)).toBe @g

      it 'will emit asynchronously', (done) ->
        call = null

        @g.on 'async', ->
          new Promise (ok) ->
            setTimeout ->
              call = true
              ok()
            , 100

        @g.emit('async').then ->
          expect(call).toBe true
          done()

      it 'will emit in sequence', (done) ->
        call = []

        @g.on 'async-seq', ->
          new Promise (ok) ->
            setTimeout ->
              call.push(1)
              ok()
            , 200

        @g.on 'async-seq', ->
          new Promise (ok) ->
            setTimeout ->
              call.push(2)
              ok()
            , 100

        @g.emit('async-seq').then ->
          expect(call).toEqual [1, 2]
          done()
