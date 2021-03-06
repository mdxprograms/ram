const React = require('react')
const h = React.createElement
const log = require('electron-log')
const open = require('opn')
const openBrowser = require('react-dev-utils/openBrowser')
const killPort = require('kill-port')
const readPkg = require('read-pkg-up')
const {
  Box,
  Flex,
  Heading,
  NavLink,
  Link: RebassLink,
  BlockLink,
  Text,
  Code,
  Pre,
  Button,
  ButtonTransparent,
  Image,
} = require('rebass')
// const RefreshIcon = require('rmdi/lib/Refresh').default
const Dependencies = require('./Dependencies')

const {
  pushLog,
  removeProject,
  saveThumbnail
} = require('./updaters')
const run = require('./spawn')
const Link = require('./Link')
const Layout = require('./Layout')
const Preview = require('./Preview')

const REG = /localhost/
const PORT = /localhost:[0-9]{4,5}/
const getPort = str => {
  const [ url ] = PORT.exec(str)
  if (!url) return
  return parseInt(url.replace(/[a-z:]/g, ''))
}

class Project extends React.Component {
  constructor () {
    super()

    this.state = {
      child: null,
      listening: false,
    }

    this.start = async () => {
      const { project, update } = this.props
      const { dirname } = project
      const killed = await killPort(3000)
      const promise = run('npm', [ 'start' ], {
        cwd: dirname,
        onLog: msg => {
          update(pushLog(msg))
          if (REG.test(msg)) {
            const port = getPort(msg)
            if (port !== 3000) {
              log.info('port change:', port)
            }
            this.setState({ listening: true })
          }
        }
      })

      promise.catch(err => {
        this.setState({ listening: false })
      })

      const { child } = promise

      child.on('exit', () => {
        this.setState({ child: null, listening: false })
      })

      this.setState({ child })
    }

    this.stop = () => {
      const { child } = this.state
      if (!child || !child.kill) return
      child.kill('SIGTERM')
    }

    this.handleCapture = img => {
      const { update } = this.props
      update(saveThumbnail(img))
    }

    this.readPkg = async () => {
      const { update, project } = this.props
      const { dirname } = project
      if (!dirname) return
      const { pkg } = await readPkg({ cwd: dirname })
      update({ pkg })
    }
  }

  componentDidMount () {
    this.readPkg()
  }

  componentWillUnmount () {
    this.props.update({ pkg: null })
    this.stop()
  }

  render () {
    const {
      project,
      pkg,
      update
    } = this.props
    const { child, listening } = this.state

    if (!project) return false
    const { name, dirname, created } = project
    const url = `http://localhost:3000`

    return h(Layout, this.props,
      h(Box, {
        px: 3,
        pb: 4,
      },
        h(NavLink, { is: Link, to: '/', px: 0 }, 'Back'),
        h(Flex, {
          alignItems: 'center'
        },
          h(Box, {},
            h(Heading, {
              is: 'h1',
              fontSize: 6,
            }, name),
          ),
          h(Box, { mx: 'auto' }),
          h(Button, {
            onClick: this.start,
            disabled: child,
            color: 'black',
            bg: 'cyan'
          }, 'Start'),
          h(Button, {
            disabled: !child,
            onClick: this.stop,
            ml: 3,
            color: 'black',
            bg: 'magenta',
            style: {
            }
          }, 'Stop')
        ),
        h(Flex, { alignItems: 'baseline', mb: 4 },
          h(Pre, { fontSize: 0 },
            dirname,
            ' ',
            h(RebassLink, {
              fontSize: 0,
              href: '#!',
              onClick: e => {
                e.preventDefault()
                open(`file://${dirname}`)
              }
            }, 'Open in Finder'),
            ' ',
            h(RebassLink, {
              href: '#!',
              disabled: !listening,
              color: listening ? 'cyan' : 'darken',
              onClick: e => openBrowser(url),
              children: url
            })
          ),
          h(Box, { mx: 'auto' }),
          h(Text, { fontSize: 1, my: 2 },
            'This will run: ',
            h(Code, { color: 'cyan' }, 'npm start')
          )
        ),
        h(Flex, { mx: -3 },
          h(Box, { px: 3, flex: 'none' },
            listening ? (
              h(Preview, {
                  innerRef: ref => this.preview = ref,
                  onCapture: this.handleCapture
                })
            ) : (
              project.thumbnail
                ? h(Image, {
                  src: project.thumbnail,
                  width: 320,
                  height: 160
                })
                : h(Box, {
                    bg: 'darken',
                    width: 320,
                    style: {
                      height: 160
                    }
                  })
            ),
          ),
          h(Box, { width: 1, px: 3 },
            pkg && h(Dependencies, this.props)
          )
        )
      )
    )
  }
}

module.exports = Project
