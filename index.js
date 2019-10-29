const fuse      = require('fuse-bindings')
const getStream = require('get-stream').buffer

const ENOSYS = fuse.ENOSYS
const errno  = fuse.errno


const direct_mapping = ['chmod', 'chown', 'link', 'mkdir', 'open', 'readdir',
                        'readlink', 'rmdir', 'rename', 'symlink', 'unlink']

const non_standard = ['fuse_access', 'create', 'destroy', 'flush', 'fsyncdir',
                      'getxattr', 'init', 'listxattr', 'mknod', 'opendir',
                      'releasedir', 'removexattr', 'setxattr', 'statfs']


function fsCallback(error, ...args)
{
  this(error && errno(error.code), ...args)
}

/** Do the file truncation by writting at the new file size position
 *
 * Only valid for file size increases
 */
function truncate(createWriteStream, path, fd, size, cb)
{
  return function(error, stats)
  {
    if(error)
    {
      if(error.code !== 'ENOENT') return cb(error)

      // File don't exists, create it of the defined size
      return createWriteStream(path, {fd, start: size})
      .end('', fsCallback.bind(cb))
      .once('error', fsCallback.bind(cb))
    }

    // File truncation is not supported
    if(size < stats.size) return cb(ENOSYS)

    // Expand file to desired size
    createWriteStream(path, {fd, flags: 'r+', start: size})
    .end('', fsCallback.bind(cb))
    .once('error', fsCallback.bind(cb))
  }
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
          fsCallback.call(cb, err1 || err2, ...results)
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
    if(fs.lstat) return fs.lstat(path, fsCallback.bind(cb))
    if(fs. stat) return fs. stat(path, fsCallback.bind(cb))
    if(fs.fstat) return wrapFd  (path, fs.fstat, cb)

    cb(ENOSYS)
  }

  this.fgetattr = function(path, fd, cb)
  {
    if(fs.fstat) return fs.fstat(fd  , fsCallback.bind(cb))
    if(fs.lstat) return fs.lstat(path, fsCallback.bind(cb))
    if(fs. stat) return fs. stat(path, fsCallback.bind(cb))

    cb(ENOSYS)
  }

  this.fsync = function(path, fd, datasync, cb)
  {
    if(!fs.fsync) return cb(ENOSYS)

    if(fd != null) return fs.fsync(fd, fsCallback.bind(cb))

    wrapFd(path, fs.fsync, cb)
  }

  this.truncate = function(path, size, cb)
  {
    if(fs.truncate ) return fs.truncate(path, size, fsCallback.bind(cb))
    if(fs.ftruncate) return wrapFd     (path, fs.ftruncate, cb, size)

    if(!fs.createWriteStream) return cb(ENOSYS)

    this.getattr(path, truncate(fs.createWriteStream, path, null, size, cb))
  }

  this.ftruncate = function(path, fd, size, cb)
  {
    if(fs.ftruncate) return fs.ftruncate(fd  , size, fsCallback.bind(cb))
    if(fs. truncate) return fs. truncate(path, size, fsCallback.bind(cb))

    if(!fs.createWriteStream) return cb(ENOSYS)

    this.fgetattr(path, fd, truncate(fs.createWriteStream, path, fd, size, cb))
  }

  this.read = function(path, fd, buffer, length, position, cb)
  {
    if(fs.read)
      return fs.read(fd, buffer, 0, length, position, fsCallback.bind(cb))

    if(!fs.createReadStream) return cb(ENOSYS)

    const options = {start: position, end: position+length}

    getStream(fs.createReadStream(path, options), {maxBuffer: length})
    .then(function(data)
    {
      data.copy(buffer)
      cb(data.length)
    }, fsCallback.bind(cb))
  }

  this.write = function(path, fd, buffer, length, position, cb)
  {
    if(fs.write)
      return fs.write(fd, buffer, 0, length, position, fsCallback.bind(cb))

    if(!fs.createWriteStream) return cb(ENOSYS)

    const cbLength = cb.bind(null, null, buffer.length)
    fs.createWriteStream(path, {flags: 'r+', start: position})
    .end(buffer, cbLength)
    .once('error', function(error)
    {
      if(!error || error.code !== 'ENOENT') return cb(errno(error.code))

      fs.createWriteStream(path, {start: position})
      .end(buffer, cbLength)
      .once('error', fsCallback.bind(cb))
    })
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

    if(name.startsWith('fuse_')) name = name.slice(5)

    this[name] = function(...args)
    {
      let cb = args.pop()
      func(...args, fsCallback.bind(cb))
    }
  }, this)
}


module.exports = FsFuse
