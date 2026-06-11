module.exports = {
  apps: [{
    name: 'course-assistant',
    script: 'dist/main.js',
    node_args: '--enable-source-maps',
    cwd: '/home/vince/course-assistant',
    env_file: '/home/vince/course-assistant/.env',
  }]
}
