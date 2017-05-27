const errno = require('fuse-bindings').errno


function fsCallback(error, ...args)
{
  this(error && errno(error.code), ...args)
}


function FsFuse(fs)
{
  if(!(this instanceof FsFuse)) return new FsFuse(fs)


  // access(path, mode, cb)
  // statfs(path, cb)

  this.getattr = function(path, cb)
  {
    fs.stat(path, fsCallback.bind(cb))
  }

  this.fgetattr = function(path, fd, cb)
  {
    fs.fstat(fd, fsCallback.bind(cb))
  }

  // flush(path, fd, cb)

  this.fsync = function(path, fd, datasync, cb)
  {
    fs.fsync(fd, fsCallback.bind(cb))
  }

  // fsyncdir(path, fd, datasync, cb)

  this.readdir = function(path, cb)
  {
    fs.readdir(path, fsCallback.bind(cb))
  }

  this.truncate = function(path, size, cb)
  {
    fs.truncate(path, size, fsCallback.bind(cb))
  }

  this.ftruncate = function(path, fd, size, cb)
  {
    fs.ftruncate(fd, size, fsCallback.bind(cb))
  }

  this.readlink = function(path, cb)
  {
    fs.readlink(path, fsCallback.bind(cb))
  }

  this.chown = function(path, uid, gid, cb)
  {
    fs.chown(path, uid, gid, fsCallback.bind(cb))
  }

  this.chmod = function(path, mode, cb)
  {
    fs.chmod(path, mode, fsCallback.bind(cb))
  }

  // mknod(path, mode, dev, cb)
  // setxattr(path, name, buffer, length, offset, flags, cb)
  // getxattr(path, name, buffer, length, offset, cb)
  // listxattr(path, buffer, length, cb)
  // removexattr(path, name, cb)

  this.open = function(path, flags, cb)
  {
    fs.open(path, flags, fsCallback.bind(cb))
  }

  // opendir(path, flags, cb)

  this.read = function(path, fd, buffer, length, position, cb)
  {
    fs.read(fd, buffer, 0, length, position, fsCallback.bind(cb))
  }

  this.write = function(path, fd, buffer, length, position, cb)
  {
    fs.write(fd, buffer, 0, length, position, fsCallback.bind(cb))
  }

  this.release = function(path, fd, cb)
  {
    fs.close(fd, fsCallback.bind(cb))
  }

  // releasedir(path, fd, cb)
  // create(path, mode, cb)

  this.utimens = function(path, atime, mtime, cb)
  {
    // Use higher precission `futimes` if available
    if(!fs.futimes) return fs.utimes(path, atime/1000000000, mtime/1000000000,
                                     fsCallback.bind(cb))

    fs.open(path, function(error, fd)
    {
      if(error) return cb(errno(error.code))

      fs.futimes(fd, atime, mtime, function(err1)
      {
        fs.close(fd, function(err2)
        {
          fsCallback.bind(cb)(err1 || err2)
        })
      })
    })
  }

  this.unlink = function(path, cb)
  {
    fs.unlink(path, fsCallback.bind(cb))
  }

  this.rename = function(src, dest, cb)
  {
    fs.rename(src, dest, fsCallback.bind(cb))
  }

  this.link = function(src, dest, cb)
  {
    fs.link(dest, src, fsCallback.bind(cb))
  }

  this.symlink = function(src, dest, cb)
  {
    fs.write(dest, src, fsCallback.bind(cb))
  }

  this.mkdir = function(path, mode, cb)
  {
    fs.mkdir(path, mode, fsCallback.bind(cb))
  }

  this.rmdir = function(path, cb)
  {
    fs.rmdir(path, fsCallback.bind(cb))
  }

  // destroy(cb)
}


module.exports = FsFuse
