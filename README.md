# fs-fuse
Export any Node.js `fs`-like object as a FUSE filesystem

## Node.js `fs` methods

The next `fs` methods are being used:

`chmod`, `chown`, `fsync`, `ftruncate`, `link`, `mkdir`, `read`, `readdir`,
`readlink`, `rename`, `rmdir`, `symlink`, `truncate`, `unlink`, `write`

Also the next FUSE operations can be using the next `fs` methods:

- *wrapFd*: `open`, `close`

- *getattr*, *fgetattr*: `stat`, `fstat`, `lstat`
- *read*: `createReadStream`
- *write*: `createWriteStream`
- *release*: `close`
- *utimens*: `futimes`, `utimes`

Not all of them need to be implemented. For example, the file descriptor ones
are not needed if their path based counterparts are implemented, and viceversa.

## Non standard `FUSE` methods

If available on the `fs` object, the next FUSE compatible methods can be used
too:

`fuse_access`, `create`, `destroy`, `flush`, `fsyncdir`, `getxattr`, `init`,
`listxattr`, `mknod`, `opendir`, `releasedir`, `removexattr`, `setxattr`,
`statfs`

Take in account, they are FUSE functions and need to have the **EXACT**
signature and behaviour expected by FUSE, not like the Node.js `fs` API.
