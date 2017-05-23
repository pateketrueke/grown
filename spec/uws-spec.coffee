Grown = require('../lib')

$ = null

describe '#uws', ->
  beforeEach (done) ->
    $ = Grown.new
      cwd: __dirname

    $.mount (conn) ->
      conn.resp_body = 'OK'

    $.listen('uws://0.0.0.0:3000').then ->
      done()

  it 'should be ok', (done) ->
    $.stop().then ->
      done()

      setTimeout ->
        process.exit()
