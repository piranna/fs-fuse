#!/usr/bin/env node

const fs = require('fs')

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
if(options.fs) fs = require(options.fs)(options)


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
