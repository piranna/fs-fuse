const fuse = require('fuse-bindings')

const ENOSYS = fuse.ENOSYS
const errno  = fuse.errno


const direct_mapping = ['readdir', 'readlink', 'chown', 'chmod', 'open',
                        'unlink', 'rename', 'link', 'symlink', 'mkdir', 'rmdir']

const non_standard = ['init', 'access', 'statfs', 'flush', 'fsyncdir', 'mknod',
                      'setxattr', 'getxattr', 'listxattr', 'removexattr',
                      'opendir', 'releasedir', 'create', 'destroy']


function fsCallback(error, ...args)
{
  this(error && errno(error.code), ...args)
}


function FsFuse(fs)
{
  if(!(this instanceof FsFuse)) return new FsFuse(fs)


  function wrapFd(path, func, cb, ...args)
  {
    fs.open(path, function(error, fd)
    {
      if(error) return cb(errno(error.code))

      func(fd, ...args, function(err1, ...results)
      {
        fs.close(fd, function(err2)
        {
          fsCallback.bind(cb)(err1 || err2, ...results)
        })
      })
    })
  }


  //
  // Methods without a direct mapping at the standard Node.js `fs`-like API, or
  // that can have workarounds for missing or alternative ones (for example, by
  // using file descriptors)
  //

  this.getattr = function(path, cb)
  {
    if(fs. stat) return fs.stat(path, fsCallback.bind(cb))
    if(fs.fstat) return wrapFd (path, fs.fstat, cb)

    cb(ENOSYS)
  }

  this.fgetattr = function(path, fd, cb)
  {
    if(fs.fstat) return fs.fstat(fd  , fsCallback.bind(cb))
    if(fs. stat) return fs. stat(path, fsCallback.bind(cb))

    cb(ENOSYS)
  }

  this.fsync = function(path, fd, datasync, cb)
  {
    if(!fs.fsync) return cb(ENOSYS)

    fs.fsync(fd, fsCallback.bind(cb))
  }

  this.truncate = function(path, size, cb)
  {
    if(fs.truncate ) return fs.truncate(path, size, fsCallback.bind(cb))
    if(fs.ftruncate) return wrapFd     (path, fs.ftruncate, cb, size)

    cb(ENOSYS)
  }

  this.ftruncate = function(path, fd, size, cb)
  {
    if(fs.ftruncate) return fs.ftruncate(fd  , size, fsCallback.bind(cb))
    if(fs. truncate) return fs. truncate(path, size, fsCallback.bind(cb))

    cb(ENOSYS)
  }

  this.read = function(path, fd, buffer, length, position, cb)
  {
    if(!fs.read) return cb(ENOSYS)

    fs.read(fd, buffer, 0, length, position, fsCallback.bind(cb))
  }

  this.write = function(path, fd, buffer, length, position, cb)
  {
    if(!fs.write) return cb(ENOSYS)

    fs.write(fd, buffer, 0, length, position, fsCallback.bind(cb))
  }

  this.release = function(path, fd, cb)
  {
    if(!fs.close) return cb(ENOSYS)

    fs.close(fd, fsCallback.bind(cb))
  }

  this.utimens = function(path, atime, mtime, cb)
  {
    // Use higher precission `futimes` if available
    if(fs.futimes) return wrapFd(path, fs.futimes, cb, atime, mtime)

    if(!fs.utimes) return cb(ENOSYS)

    fs.utimes(path, atime/1000000000, mtime/1000000000, fsCallback.bind(cb))
  }


  //
  // FUSE methods that have a direct mapping with the Node.js `fs`-like API, and
  // non-standard FUSE-only ones
  //

  direct_mapping.concat(non_standard).forEach(function(name)
  {
    let func = fs[name]
    if(!func) return

    this[name] = function(...args)
    {
      let cb = args.pop()
      func(...args, fsCallback.bind(cb))
    }
  }, this)
}


module.exports = FsFuse
