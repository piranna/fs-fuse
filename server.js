#!/usr/bin/env node

const fuse  = require('fuse-bindings')
const parse = require('parse-mount-argv')

const FsFuse = require('.')


const argv = process.argv
if(argv.length < 4)
{
  console.error('Usage:', argv[1], '<dev>', '<path>', '[-o fs=<fs>]')
  process.exit(1)
}


const args = parse(argv.slice(2))

const dev     = args.dev
const path    = args.path
const options = args.options

if(dev && !options.dev) options.dev = dev

let fs
if(!options.fs)
  fs = require('fs')
else
{
  fs = require(options.fs)
  delete options.fs

  if(fs instanceof Function) fs = new fs(options)
}


fuse.mount(path, FsFuse(fs), function(error)
{
  if(error) console.error(argv[1]+' failed to mount:', error)
})

process.on('SIGINT', function()
{
  fuse.unmount(path, function(error)
  {
    if(error) throw error
    process.exit()
  })
})
